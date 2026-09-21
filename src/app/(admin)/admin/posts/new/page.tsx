import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { PostForm } from "@/features/posts/components/post-form";
import { requireAdmin } from "@/lib/auth/dal";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Viết bài",
  description: "Soạn một bài viết mới cho nhà trọ.",
  path: "/admin/posts/new",
});

export default async function NewAdminPostPage() {
  await requireAdmin();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Viết bài"
        breadcrumbs={[{ label: "Bài viết", href: "/admin/posts" }, { label: "Viết bài" }]}
        description="Lưu bản nháp trước. Đăng ở trang chi tiết, khi đó mới chọn nội bộ hay công khai."
      />
      <PostForm mode="author" />
    </div>
  );
}
