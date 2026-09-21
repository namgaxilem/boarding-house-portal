"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin, requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { POSTS_PUBLIC_TAG, postTag } from "@/lib/db/public-posts";
import { describeError, fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { notifyPostReviewed, notifyPostSubmitted } from "@/lib/notify";
import { slugify, uniqueSlug } from "@/lib/slug";

import { approvePostSchema, postIdSchema, postSchema, rejectPostSchema } from "./schema";

/**
 * Vòng đời một bài viết:
 *
 *   nháp → chờ duyệt → đang hiện → (đã gỡ)
 *                    ↘ bị từ chối → (sửa) → chờ duyệt
 *
 * Ai làm được gì:
 *   - Người thuê  viết, sửa, gửi đi duyệt, rút lại, xoá — chỉ với bài của chính
 *                 mình và chỉ khi bài CHƯA đăng.
 *   - Chủ trọ     làm mọi thứ, và là người DUY NHẤT đặt được `visibility`.
 *
 * Bốn bước chuyển trạng thái đi qua RPC SECURITY DEFINER chứ không qua UPDATE
 * thẳng: chúng phải là một lệnh một transaction, và cần `for update` để hai tab
 * admin cùng bấm Duyệt thì tab thứ hai đọc lại trạng thái mới thay vì ghi đè.
 */

/**
 * `updateTag`, KHÔNG phải `revalidatePath`, cho phần công khai.
 *
 * `/blog` và `/sitemap.xml` đọc qua `"use cache"` (lib/db/public-posts.ts), và
 * một entry `"use cache"` được đánh khoá theo HÀM + THAM SỐ — `revalidatePath`
 * không chạm tới nó. Thiếu bước này thì bài vừa duyệt chưa hiện cho tới một
 * tiếng sau, và không có gì báo lỗi.
 *
 * `updateTag` chứ không `revalidateTag`: đây là đọc-lại-thứ-mình-vừa-ghi. Chủ
 * trọ bấm Duyệt rồi mở /blog ngay trong giây sau, và `revalidateTag` phục vụ nội
 * dung cũ trong lúc làm mới ngầm — tức là chủ trọ thấy bài chưa hiện và bấm
 * Duyệt lần nữa. `updateTag` chỉ gọi được trong Server Action, và cả file này
 * đều là Server Action.
 */
function revalidatePosts(options: { postId?: string; slug?: string; public?: boolean } = {}) {
  revalidatePath("/me/posts");
  revalidatePath("/me");
  revalidatePath("/admin/posts");
  revalidatePath("/admin");

  if (options.postId) {
    revalidatePath(`/me/posts/${options.postId}`);
    revalidatePath(`/admin/posts/${options.postId}`);
  }

  if (options.public) {
    updateTag(POSTS_PUBLIC_TAG);
    if (options.slug) updateTag(postTag(options.slug));
    revalidatePath("/blog");
  }
}

/** Slug dựng từ tiêu đề, tránh trùng với những slug đã có cùng tiền tố. */
async function buildSlug(title: string) {
  const base = slugify(title);
  return uniqueSlug(base, await db.listSlugsLike(base));
}

/* -------------------------------------------------------------------------- */
/*  Tác giả — dùng chung cho người thuê và chủ trọ                            */
/* -------------------------------------------------------------------------- */

export async function createMyPost(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const user = await requireUser();

  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  let postId: string;
  try {
    const post = await db.createPost(
      user.id,
      // Tên tác giả chụp lại tại đây, không join lúc đọc: tài khoản có thể bị
      // xoá về sau, và đổi tên trong hồ sơ không nên viết lại lịch sử bài cũ.
      user.fullName,
      await buildSlug(parsed.data.title),
      parsed.data,
    );
    postId = post.id;
  } catch (error) {
    return fail(describeError(error, "Không lưu được bài viết."));
  }

  revalidatePosts({ postId });
  redirect(`/me/posts/${postId}?created=1`);
}

export async function updateMyPost(
  postId: string,
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  await requireUser();

  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.updatePost(postId, parsed.data);
  } catch (error) {
    return fail(describeError(error, "Không lưu được bài viết."));
  }

  revalidatePosts({ postId });
  redirect(`/me/posts/${postId}?updated=1`);
}

export async function submitMyPost(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const user = await requireUser();

  const parsed = postIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.submitPost(parsed.data.postId);
  } catch (error) {
    return fail(describeError(error, "Không gửi được bài viết."));
  }

  const post = await db.getPost(parsed.data.postId);
  if (post) await notifyPostSubmitted(post, user.fullName);

  revalidatePosts({ postId: parsed.data.postId });
  return ok();
}

export async function withdrawMyPost(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  await requireUser();

  const parsed = postIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.withdrawPost(parsed.data.postId);
  } catch (error) {
    return fail(describeError(error, "Không rút lại được bài viết."));
  }

  revalidatePosts({ postId: parsed.data.postId });
  return ok();
}

/**
 * Xoá. Không trả `ActionResult` — đi qua `ConfirmForm`, và khi đã xoá xong thì
 * không còn trang nào để hiện lỗi lên. Lỗi quay về bằng `?error=` như
 * `deleteRoom`.
 */
export async function deleteMyPost(formData: FormData) {
  await requireUser();
  const postId = String(formData.get("postId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  try {
    await db.deletePost(postId);
  } catch (error) {
    redirect(`/me/posts?error=${encodeURIComponent(describeError(error, "Không xoá được bài viết."))}`);
  }

  revalidatePosts({ postId, slug, public: true });
  redirect("/me/posts?deleted=1");
}

/* -------------------------------------------------------------------------- */
/*  Chủ trọ                                                                   */
/* -------------------------------------------------------------------------- */

export async function approvePost(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  await requireAdmin();

  const parsed = approvePostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.approvePost(parsed.data.postId, parsed.data.visibility);
  } catch (error) {
    return fail(describeError(error, "Không duyệt được bài viết."));
  }

  await notifyAuthorOfReview(parsed.data.postId);
  const post = await db.getPost(parsed.data.postId);
  revalidatePosts({ postId: parsed.data.postId, slug: post?.slug, public: true });
  return ok();
}

export async function rejectPost(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  await requireAdmin();

  const parsed = rejectPostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.rejectPost(parsed.data.postId, parsed.data.note);
  } catch (error) {
    return fail(describeError(error, "Không từ chối được bài viết."));
  }

  await notifyAuthorOfReview(parsed.data.postId);
  revalidatePosts({ postId: parsed.data.postId });
  return ok();
}

/** Chủ trọ đăng bản nháp của chính mình, hoặc dựng lại một bài đã gỡ. */
export async function publishPost(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  await requireAdmin();

  const parsed = approvePostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.publishPost(parsed.data.postId, parsed.data.visibility);
  } catch (error) {
    return fail(describeError(error, "Không đăng được bài viết."));
  }

  const post = await db.getPost(parsed.data.postId);
  revalidatePosts({ postId: parsed.data.postId, slug: post?.slug, public: true });
  return ok();
}

export async function archivePost(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  await requireAdmin();

  const parsed = postIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const before = await db.getPost(parsed.data.postId);

  try {
    await db.archivePost(parsed.data.postId);
  } catch (error) {
    return fail(describeError(error, "Không gỡ được bài viết."));
  }

  revalidatePosts({ postId: parsed.data.postId, slug: before?.slug, public: true });
  return ok();
}

export async function updatePostAsAdmin(
  postId: string,
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  await requireAdmin();

  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const before = await db.getPost(postId);

  try {
    await db.updatePost(postId, parsed.data);

    const visibility = formData.get("visibility");
    if (visibility === "public" || visibility === "internal") {
      await db.setPostVisibility(postId, visibility);
    }
  } catch (error) {
    return fail(describeError(error, "Không lưu được bài viết."));
  }

  revalidatePosts({
    postId,
    slug: before?.slug,
    // Bài chưa đăng thì không có gì ngoài kia để làm mới — gọi revalidateTag khi
    // đó chỉ tổ ném cache của những bài đang hiện đi một cách vô ích.
    public: before?.status === "published" || before?.status === "archived",
  });
  redirect(`/admin/posts/${postId}?updated=1`);
}

export async function deletePostAsAdmin(formData: FormData) {
  await requireAdmin();
  const postId = String(formData.get("postId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  try {
    await db.deletePost(postId);
  } catch (error) {
    redirect(
      `/admin/posts?error=${encodeURIComponent(describeError(error, "Không xoá được bài viết."))}`,
    );
  }

  revalidatePosts({ postId, slug, public: true });
  redirect("/admin/posts?deleted=1");
}

/**
 * Báo cho tác giả biết kết quả.
 *
 * Đọc lại bài SAU khi chuyển trạng thái, vì nội dung thông báo phụ thuộc vào
 * trạng thái mới. Không throw: hỏng khâu báo tin không được làm hỏng việc duyệt
 * — cùng nguyên tắc `notifyUser()` đã ghi.
 */
async function notifyAuthorOfReview(postId: string) {
  const post = await db.getPost(postId);
  if (!post?.authorId) return;

  const author = await db.getProfile(post.authorId);
  if (!author) return;

  await notifyPostReviewed(post, author);
}
