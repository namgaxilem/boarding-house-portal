import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { NotebookPenIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { Link } from "@/components/common/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { JsonLd } from "@/components/common/json-ld";
import { PostPagination } from "@/features/posts/components/post-pagination";
import { listPublicPosts } from "@/lib/db/public-posts";
import { formatDate } from "@/lib/format";
import { plainTextPreview } from "@/lib/rich-text";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { pageMeta } from "@/lib/seo";
import { houseConfig } from "@/config/site";

/**
 * Trang đầu tiên của app mọc vô hạn theo thời gian, và là trang công khai thứ tư.
 *
 * Thêm nó vào đây thôi chưa đủ — `/blog/<slug>` còn phải qua được `src/proxy.ts`
 * (xem `PUBLIC_PATH_PREFIXES` ở đó) và phải nằm trong `src/app/sitemap.ts`.
 * Thiếu chỗ nào cũng hỏng lặng lẽ: Googlebot đọc được trang đăng nhập thay vì
 * bài viết, và không có gì báo lỗi.
 */
export const metadata: Metadata = pageMeta({
  title: "Bài viết",
  description: `Thông báo, hướng dẫn và tin tức từ ${houseConfig.name}.`,
  path: "/blog",
});

export const instant = true;

function readPage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), 500);
}

/**
 * Vỏ trang TĨNH; `searchParams` và phần đọc database nằm trong `<Suspense>`.
 *
 * Dưới Cache Components, `await searchParams` ở thân trang là dữ liệu
 * thời-điểm-yêu-cầu và nó chặn prerender cả route. Tiêu đề với dòng mô tả không
 * phụ thuộc vào trang thứ mấy, nên chúng ra ngay, danh sách stream sau.
 *
 * Không có `<Suspense key={page}>` như ở /admin/invoices, vì khoá đó đòi biết
 * `page` — tức là phải await searchParams ở đúng chỗ vừa nói là không được.
 */
export default function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  if (!houseConfig.features.publicBlog) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Bài viết</h1>
        <p className="text-muted-foreground">
          Thông báo và hướng dẫn từ {houseConfig.name}.
        </p>
      </header>

      <Suspense fallback={<ListSkeleton />}>
        <PostFeed searchParams={searchParams} />
      </Suspense>

      <JsonLd data={breadcrumbJsonLd([{ name: "Bài viết", path: "/blog" }])} />
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-4" aria-hidden>
      {[0, 1, 2].map((index) => (
        <li key={index}>
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="h-6 w-2/3 animate-pulse rounded bg-secondary" />
              <div className="h-4 w-full animate-pulse rounded bg-secondary" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-secondary" />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

async function PostFeed({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = readPage((await searchParams).page);
  const { items, page: current, pageCount } = await listPublicPosts(page);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<NotebookPenIcon />}
        title="Chưa có bài nào"
        description="Khi nhà trọ có thông báo hoặc hướng dẫn mới, nó sẽ hiện ở đây."
      />
    );
  }

  return (
    <div className="space-y-8">
      <ul className="space-y-4">
        {items.map((post, index) => (
          <li key={post.id}>
            <Card className="overflow-hidden transition-colors hover:border-primary/40">
              {post.coverUrl && (
                <div className="relative aspect-[2/1] bg-secondary">
                  <Image
                    src={post.coverUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    // Chỉ tấm ĐẦU. Ảnh bìa bài đầu tiên gần như luôn là LCP của
                    // trang; đánh dấu cả danh sách thì mất hết ý nghĩa của "ưu tiên".
                    priority={index === 0}
                    className="object-cover"
                  />
                </div>
              )}

              <CardContent className="space-y-2 p-5">
                <h2 className="text-lg font-semibold leading-snug">
                  <Link href={`/blog/${post.slug}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h2>

                <p className="text-sm text-muted-foreground">
                  {post.excerpt ?? plainTextPreview(post.body, 180)}
                </p>

                <p className="text-xs text-muted-foreground">
                  {post.authorName}
                  {post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ""}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <PostPagination page={current} pageCount={pageCount} />
    </div>
  );
}
