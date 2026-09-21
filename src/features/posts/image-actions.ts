"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { POSTS_PUBLIC_TAG, postTag } from "@/lib/db/public-posts";
import { describeError, fail, ok, type ActionResult } from "@/lib/action-result";
import { POST_IMAGE_POLICY as POLICY, checkUploadFile } from "@/lib/upload-policy";

/**
 * Ảnh trong bài viết.
 *
 * Guard chỉ là `requireUser()`, không phải `requireAdmin()`: người thuê tải ảnh
 * vào bài của CHÍNH MÌNH. Ai được đụng bài nào thì `can_edit_post()` trong
 * database quyết, và nó khoá luôn ở cả bảng `post_images` lẫn `storage.objects`
 * — hai nơi, một định nghĩa.
 */

async function revalidatePostImages(postId: string, slug: string | null, isPublic: boolean) {
  revalidatePath(`/me/posts/${postId}`);
  revalidatePath(`/admin/posts/${postId}`);
  if (isPublic) {
    updateTag(POSTS_PUBLIC_TAG);
    if (slug) updateTag(postTag(slug));
    revalidatePath("/blog");
  }
}

export async function uploadPostImages(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireUser();

  const postId = String(formData.get("postId") ?? "");
  if (!postId) return fail("Thiếu thông tin bài viết.");

  const user = await requireUser();

  const files = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) return fail("Chưa chọn ảnh nào.");
  if (files.length > POLICY.maxPerUpload) {
    return fail(`Mỗi lần tải tối đa ${POLICY.maxPerUpload} ảnh.`);
  }

  for (const file of files) {
    const problem = checkUploadFile(file, POLICY);
    if (problem) return fail(problem);
  }

  // Trần TỔNG, không phải trần mỗi lượt — bấm "Thêm ảnh" bốn lần thì vẫn là bốn
  // ảnh. Trigger `post_images_enforce_quota` chốt lại con số này ở database;
  // kiểm ở đây chỉ để báo sớm, đỡ một vòng tải file lên rồi mới bị từ chối.
  const already = await db.countPostImages(postId);
  if (already + files.length > POLICY.maxPerParent) {
    return fail(
      `Bài này đã có ${already} ảnh, tối đa ${POLICY.maxPerParent}. Xoá bớt trước khi thêm.`,
    );
  }

  const post = await db.getPost(postId);

  let uploaded = 0;
  let firstPath: string | null = null;
  for (const file of files) {
    try {
      const image = await db.addPostImage(postId, user.id, file);
      firstPath ??= image.storagePath;
      uploaded += 1;
    } catch (error) {
      await revalidatePostImages(postId, post?.slug ?? null, post?.status === "published");
      const detail = describeError(error, "Không tải được ảnh lên.");
      return fail(uploaded > 0 ? `Đã tải ${uploaded} ảnh, rồi dừng lại: ${detail}` : detail);
    }
  }

  // Bài chưa có ảnh bìa thì tấm đầu tiên vừa lên thành bìa. Ảnh bìa là thứ đi
  // vào `og:image`, nên để trống nghĩa là thẻ chia sẻ Zalo hiện logo thay vì
  // ảnh thật — và gần như không ai vào đặt bìa bằng tay.
  if (post && !post.coverPath && firstPath) {
    try {
      await db.setPostCover(postId, firstPath);
    } catch (error) {
      console.error("[posts] không đặt được ảnh bìa mặc định", error);
    }
  }

  await revalidatePostImages(postId, post?.slug ?? null, post?.status === "published");
  return ok(`Đã tải lên ${uploaded} ảnh.`);
}

export async function deletePostImage(formData: FormData): Promise<void> {
  await requireUser();

  const imageId = String(formData.get("imageId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  if (!imageId) return;

  const post = await db.getPost(postId);
  await db.deletePostImage(imageId);
  await revalidatePostImages(postId, post?.slug ?? null, post?.status === "published");
}

export async function setPostCover(formData: FormData): Promise<void> {
  await requireUser();

  const postId = String(formData.get("postId") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");
  if (!postId || !storagePath) return;

  const post = await db.getPost(postId);
  await db.setPostCover(postId, storagePath);
  await revalidatePostImages(postId, post?.slug ?? null, post?.status === "published");
}
