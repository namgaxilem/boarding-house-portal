import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { PostForm } from "@/features/posts/components/post-form";
import { requireUser } from "@/lib/auth/dal";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Viết bài mới",
  description: "Soạn một bài viết để gửi chủ trọ duyệt.",
  path: "/me/posts/new",
});

export default async function NewPostPage() {
  // Guard ở đây dù layout đã gọi: trang này không đọc dữ liệu nào khác, nên nếu
  // bỏ qua thì form vẫn dựng ra cho một người không đăng nhập, và họ chỉ biết
  // mình không được phép sau khi gõ xong cả bài.
  await requireUser();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Viết bài mới"
        breadcrumbs={[{ label: "Bài viết của tôi", href: "/me/posts" }, { label: "Viết bài" }]}
        description="Lưu bản nháp trước, gửi duyệt sau — bản nháp chỉ mình bạn thấy."
      />
      <PostForm mode="author" />
    </div>
  );
}
