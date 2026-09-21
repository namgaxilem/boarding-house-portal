import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { PostForm } from "@/features/posts/components/post-form";
import { getPostForAdmin } from "@/features/posts/queries";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Sửa bài viết",
  description: "Sửa nội dung và phạm vi hiển thị của một bài viết.",
});

export default async function EditAdminPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await getPostForAdmin(postId);
  if (!post) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sửa bài viết"
        breadcrumbs={[
          { label: "Bài viết", href: "/admin/posts" },
          { label: post.title, href: `/admin/posts/${post.id}` },
          { label: "Sửa" },
        ]}
        description={
          post.publishedAt
            ? "Bài đã đăng: sửa tiêu đề KHÔNG đổi đường dẫn — mọi link đã chia sẻ vẫn chạy."
            : undefined
        }
      />
      <PostForm mode="admin" post={post} />
    </div>
  );
}
