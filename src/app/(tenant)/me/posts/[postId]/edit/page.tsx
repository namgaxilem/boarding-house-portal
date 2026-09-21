import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { PostForm } from "@/features/posts/components/post-form";
import { getMyPost } from "@/features/posts/queries";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Sửa bài viết",
  description: "Sửa nội dung một bài viết chưa đăng.",
});

export default async function EditMyPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await getMyPost(postId);

  if (!post) notFound();

  // Bài đã đăng thì tác giả không sửa được — RLS đã chặn, nhưng dựng form ra rồi
  // để người ta gõ xong mới báo lỗi là tệ hơn hẳn việc đưa họ về trang xem.
  if (post.status === "published" || post.status === "archived") {
    redirect(`/me/posts/${post.id}`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sửa bài viết"
        breadcrumbs={[
          { label: "Bài viết của tôi", href: "/me/posts" },
          { label: post.title, href: `/me/posts/${post.id}` },
          { label: "Sửa" },
        ]}
      />
      <PostForm mode="author" post={post} />
    </div>
  );
}
