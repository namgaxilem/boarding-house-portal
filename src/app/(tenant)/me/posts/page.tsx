import { Suspense } from "react";
import type { Metadata } from "next";
import { NotebookPenIcon, PlusIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PostList } from "@/features/posts/components/post-list";
import { listMyPosts } from "@/features/posts/queries";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Bài viết của tôi",
  description: "Bài bạn đã viết và tình trạng duyệt của từng bài.",
  path: "/me/posts",
});

export const instant = true;

export default async function MyPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bài viết của tôi"
        description="Viết thông báo hoặc chia sẻ cho cả nhà trọ. Chủ trọ duyệt rồi bài mới hiện."
      />

      {params.error && (
        <Alert variant="destructive">
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      )}
      {params.deleted && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã xoá bài viết.</AlertDescription>
        </Alert>
      )}

      <Button asChild className="w-full">
        <Link href="/me/posts/new">
          <PlusIcon />
          Viết bài mới
        </Link>
      </Button>

      <Suspense fallback={<ListSkeleton />}>
        <MyPosts />
      </Suspense>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 2 }).map((_, index) => (
        <Skeleton key={index} className="h-[140px] w-full rounded-xl" />
      ))}
    </div>
  );
}

async function MyPosts() {
  const posts = await listMyPosts();

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<NotebookPenIcon />}
        title="Chưa có bài nào"
        description="Bấm “Viết bài mới” để gửi một thông báo hoặc chia sẻ cho cả nhà trọ. Chủ trọ đọc và duyệt trước khi bài hiện ra."
      />
    );
  }

  return <PostList posts={posts} basePath="/me/posts" />;
}
