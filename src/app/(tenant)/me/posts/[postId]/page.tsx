import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmForm } from "@/components/common/confirm-form";
import { PageHeader } from "@/components/common/page-header";
import { PostStatusBadge, PostVisibilityBadge } from "@/components/common/status-badge";
import { PostAuthorActions } from "@/features/posts/components/post-author-actions";
import { PostBody } from "@/features/posts/components/post-body";
import { PostImageManager } from "@/features/posts/components/post-image-manager";
import { deleteMyPost } from "@/features/posts/actions";
import { getMyPost } from "@/features/posts/queries";
import { formatDateTime } from "@/lib/format";
import { pageMeta } from "@/lib/seo";

// `path` cố ý bỏ trống: một canonical trỏ vào đường dẫn khuôn mẫu sẽ gộp mọi bài
// thành cùng một URL. Trang này `noindex` sẵn nên không cần canonical.
export const metadata: Metadata = pageMeta({
  title: "Bài viết",
  description: "Nội dung và tình trạng duyệt của một bài viết.",
});

export default async function MyPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const { postId } = await params;
  const flags = await searchParams;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bài viết"
        breadcrumbs={[{ label: "Bài viết của tôi", href: "/me/posts" }, { label: "Chi tiết" }]}
      />

      {flags.created && (
        <Alert variant="success" role="status">
          <AlertDescription>
            Đã lưu bản nháp. Bấm “Gửi cho chủ trọ duyệt” khi bạn thấy ổn.
          </AlertDescription>
        </Alert>
      )}
      {flags.updated && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã lưu thay đổi.</AlertDescription>
        </Alert>
      )}

      <Suspense fallback={<DetailSkeleton />}>
        <PostDetail postId={postId} />
      </Suspense>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

async function PostDetail({ postId }: { postId: string }) {
  const post = await getMyPost(postId);
  if (!post) notFound();

  const editable = post.status !== "published" && post.status !== "archived";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <PostStatusBadge status={post.status} />
        <PostVisibilityBadge visibility={post.visibility} showInternal />
      </div>

      {post.status === "rejected" && post.reviewNote && (
        <Alert variant="destructive">
          <AlertDescription>
            <span className="font-medium">Chủ trọ góp ý:</span> {post.reviewNote}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-4 p-5">
          <h1 className="text-xl font-semibold leading-snug">{post.title}</h1>
          <p className="text-xs text-muted-foreground">
            {post.publishedAt
              ? `Đăng ${formatDateTime(post.publishedAt)}`
              : `Tạo ${formatDateTime(post.createdAt)}`}
          </p>
          <PostBody body={post.body} />
        </CardContent>
      </Card>

      {editable && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-medium">Ảnh trong bài</h2>
            <PostImageManager
              postId={post.id}
              images={post.images}
              coverPath={post.coverPath}
            />
          </CardContent>
        </Card>
      )}

      <PostAuthorActions postId={post.id} status={post.status} />

      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/me/posts/${post.id}/edit`}>
              <PencilIcon />
              Sửa
            </Link>
          </Button>

          <ConfirmForm
            action={deleteMyPost}
            hidden={{ postId: post.id, slug: post.slug }}
            title="Xoá bài viết này?"
            description="Bài và mọi ảnh trong bài sẽ mất hẳn. Không khôi phục lại được."
            triggerLabel={
              <>
                <Trash2Icon />
                Xoá
              </>
            }
            triggerProps={{
              variant: "ghost",
              className: "text-destructive hover:bg-destructive/10",
            }}
          />
        </div>
      )}

      {!editable && (
        <p className="text-sm text-muted-foreground">
          Bài đã đăng thì chỉ chủ trọ sửa hoặc gỡ được — đường dẫn của nó có thể đã được
          chia sẻ ra ngoài.
        </p>
      )}
    </div>
  );
}
