import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLinkIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmForm } from "@/components/common/confirm-form";
import { PageHeader } from "@/components/common/page-header";
import { PostStatusBadge, PostVisibilityBadge } from "@/components/common/status-badge";
import { PostBody } from "@/features/posts/components/post-body";
import { PostImageManager } from "@/features/posts/components/post-image-manager";
import {
  PostPublishActions,
  PostReviewActions,
} from "@/features/posts/components/post-review-actions";
import { deletePostAsAdmin } from "@/features/posts/actions";
import { getPostForAdmin } from "@/features/posts/queries";
import { formatDateTime } from "@/lib/format";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Bài viết",
  description: "Đọc, duyệt hoặc gỡ một bài viết.",
});

export default async function AdminPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { postId } = await params;
  const flags = await searchParams;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bài viết"
        breadcrumbs={[{ label: "Bài viết", href: "/admin/posts" }, { label: "Chi tiết" }]}
      />

      {flags.updated && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã lưu thay đổi.</AlertDescription>
        </Alert>
      )}

      <Suspense fallback={<DetailSkeleton />}>
        <AdminPostDetail postId={postId} />
      </Suspense>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

async function AdminPostDetail({ postId }: { postId: string }) {
  const post = await getPostForAdmin(postId);
  if (!post) notFound();

  const isLive = post.status === "published" && post.visibility === "public";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <PostStatusBadge status={post.status} />
        <PostVisibilityBadge visibility={post.visibility} showInternal />
        {isLive && (
          <Button variant="ghost" size="sm" asChild>
            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon />
              Xem trang công khai
            </a>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h1 className="text-xl font-semibold leading-snug">{post.title}</h1>

          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <dt>Tác giả:</dt>
              <dd className="text-foreground">{post.authorName}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{post.publishedAt ? "Đăng:" : "Tạo:"}</dt>
              <dd className="text-foreground">
                {formatDateTime(post.publishedAt ?? post.createdAt)}
              </dd>
            </div>
            <div className="flex gap-1">
              <dt>Đường dẫn:</dt>
              <dd className="font-mono text-xs text-foreground">/blog/{post.slug}</dd>
            </div>
          </dl>

          {post.excerpt && (
            <p className="rounded-md bg-secondary p-3 text-sm text-muted-foreground">
              {post.excerpt}
            </p>
          )}

          <PostBody body={post.body} />
        </CardContent>
      </Card>

      {post.status === "pending" && (
        <Card>
          <CardHeader>
            <CardTitle>Duyệt bài</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              “Chỉ nội bộ” cho người đã đăng nhập đọc. “Công khai” đẩy bài lên Google và
              hiện với khách vãng lai — cân nhắc kỹ với bài do người thuê viết.
            </p>
            <PostReviewActions postId={post.id} />
          </CardContent>
        </Card>
      )}

      {post.status === "rejected" && post.reviewNote && (
        <Alert variant="destructive">
          <AlertDescription>
            <span className="font-medium">Lý do đã gửi tác giả:</span> {post.reviewNote}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ảnh trong bài</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <PostImageManager
            postId={post.id}
            images={post.images}
            coverPath={post.coverPath}
          />
        </CardContent>
      </Card>

      <PostPublishActions postId={post.id} status={post.status} />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href={`/admin/posts/${post.id}/edit`}>
            <PencilIcon />
            Sửa
          </Link>
        </Button>

        <ConfirmForm
          action={deletePostAsAdmin}
          hidden={{ postId: post.id, slug: post.slug }}
          title="Xoá hẳn bài viết này?"
          description="Bài, mọi ảnh trong bài, và ĐƯỜNG DẪN của nó biến mất. Nếu chỉ muốn bài không hiện nữa thì bấm “Gỡ khỏi trang” — cách đó giữ đường dẫn lại để một bài mới không chiếm mất."
          triggerLabel={
            <>
              <Trash2Icon />
              Xoá hẳn
            </>
          }
          triggerProps={{
            variant: "ghost",
            className: "text-destructive hover:bg-destructive/10",
          }}
        />
      </div>
    </div>
  );
}
