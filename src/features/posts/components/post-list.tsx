import { CalendarIcon, UserIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Card, CardContent } from "@/components/ui/card";
import { PostStatusBadge, PostVisibilityBadge } from "@/components/common/status-badge";
import { formatDate } from "@/lib/format";
import { plainTextPreview } from "@/lib/rich-text";
import type { Post } from "@/types";

/**
 * Danh sách bài dùng chung cho `/me/posts` và `/admin/posts`.
 *
 * KHÔNG phân trang: hàng chờ của chủ trọ bị chặn bởi
 * `posts_one_pending_per_author`, và một tác giả có nhiều lắm vài chục bài.
 * Chỉ `/blog` phân trang, vì đó là danh sách duy nhất mọc vô hạn theo thời gian
 * và là danh sách duy nhất khách vãng lai với Googlebot cùng tải.
 */
export function PostList({
  posts,
  basePath,
  showAuthor = false,
}: {
  posts: Post[];
  /** `/me/posts` hoặc `/admin/posts`. */
  basePath: string;
  showAuthor?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {posts.map((post) => (
        <li key={post.id}>
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="space-y-2 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <PostStatusBadge status={post.status} />
                <PostVisibilityBadge visibility={post.visibility} />
              </div>

              <h2 className="text-base font-semibold leading-snug">
                <Link href={`${basePath}/${post.id}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>

              <p className="line-clamp-2 text-sm text-muted-foreground">
                {post.excerpt ?? plainTextPreview(post.body, 160)}
              </p>

              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {showAuthor && (
                  <div className="flex items-center gap-1">
                    <UserIcon className="size-3.5" aria-hidden />
                    <dt className="sr-only">Tác giả</dt>
                    <dd>{post.authorName}</dd>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <CalendarIcon className="size-3.5" aria-hidden />
                  <dt className="sr-only">{post.publishedAt ? "Ngày đăng" : "Ngày tạo"}</dt>
                  <dd>{formatDate(post.publishedAt ?? post.createdAt)}</dd>
                </div>
              </dl>

              {post.status === "rejected" && post.reviewNote && (
                <p className="rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
                  <span className="font-medium">Chủ trọ góp ý:</span> {post.reviewNote}
                </p>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
