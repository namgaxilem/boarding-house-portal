import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { JsonLd } from "@/components/common/json-ld";
import { PostBody } from "@/features/posts/components/post-body";
import { getPublicPost } from "@/lib/db/public-posts";
import { formatDate } from "@/lib/format";
import { plainTextPreview } from "@/lib/rich-text";
import { blogPostingJsonLd, breadcrumbJsonLd, clampDescription } from "@/lib/structured-data";
import { pageMeta } from "@/lib/seo";
import { houseConfig } from "@/config/site";

/**
 * `generateMetadata` và component trang cùng gọi `getPublicPost(slug)`.
 *
 * Hai lần gọi, một truy vấn: hàm đó nằm sau `"use cache"` và được đánh khoá theo
 * hàm + tham số, nên lần thứ hai đọc lại đúng entry cũ. React `cache()` sẽ KHÔNG
 * làm được việc này vì nó không vượt qua ranh giới `"use cache"`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPost(slug);

  if (!post) return pageMeta({ title: "Không tìm thấy bài viết", description: "" });

  return pageMeta({
    title: post.title,
    description: clampDescription(post.excerpt ?? plainTextPreview(post.body, 200)),
    // Đường dẫn THẬT, không phải khuôn mẫu: một canonical trỏ vào "/blog/[slug]"
    // gộp mọi bài thành cùng một URL.
    path: `/blog/${post.slug}`,
    // Chỉ đè ảnh mặc định khi bài có ảnh bìa thật. Không có thì để Next dùng
    // `src/app/opengraph-image.png` như mọi trang khác.
    images: post.coverUrl ? [post.coverUrl] : undefined,
  });
}

/**
 * ROUTE CHẶN, không phải Partial Prerender. Cố ý, và đây là lý do.
 *
 * Dưới Cache Components, `await params` ở thân trang chặn prerender và `next
 * build` đưa ra ba cách sửa: bọc `<Suspense>`, `"use cache"`, hoặc
 * `instant = false`. Hai cách đầu cho vỏ trang ra trước — nhưng khi đó HTTP
 * status đã gửi đi rồi, nên `notFound()` ở bên trong boundary chỉ đổi được nội
 * dung chứ không đổi được mã trạng thái: `/blog/slug-bia-dat` trả **200** kèm
 * trang "không tìm thấy".
 *
 * Với một trang mà toàn bộ lý do tồn tại là để Google đọc, đó là soft-404 —
 * Google lập chỉ mục mọi đường dẫn rác ai đó dán vào. Nên trang này chấp nhận
 * chặn để `notFound()` trả đúng 404. Đổi lại không nhiều: phần đọc dữ liệu vốn
 * đã nằm sau `"use cache"` một tiếng.
 */
export const instant = false;

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!houseConfig.features.publicBlog) notFound();

  const { slug } = await params;
  const post = await getPublicPost(slug);
  if (!post) notFound();

  const description = clampDescription(post.excerpt ?? plainTextPreview(post.body, 200));
  const gallery = post.images.filter((image) => image.storagePath !== post.coverPath);

  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Tất cả bài viết
      </Link>

      <header className="space-y-3">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {post.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {post.authorName}
          {post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ""}
        </p>
      </header>

      {post.coverUrl && (
        <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-secondary">
          <Image
            src={post.coverUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            className="object-cover"
          />
        </div>
      )}

      <PostBody body={post.body} />

      {gallery.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {gallery.map((image) => (
            <li
              key={image.id}
              className="relative aspect-[4/3] overflow-hidden rounded-lg bg-secondary"
            >
              <Image
                src={image.url}
                alt={image.alt ?? ""}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      <JsonLd
        data={blogPostingJsonLd({
          slug: post.slug,
          title: post.title,
          description,
          authorName: post.authorName,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          imageUrl: post.coverUrl,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Bài viết", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
    </article>
  );
}
