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
import { listPostsForAdmin } from "@/features/posts/queries";
import { POST_STATUS_OPTIONS } from "@/lib/constants";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { PostStatus } from "@/types";

export const metadata: Metadata = pageMeta({
  title: "Bài viết",
  description: "Duyệt bài người thuê gửi và quản lý bài đã đăng.",
  path: "/admin/posts",
});

export const instant = true;

type StatusFilter = PostStatus | "all";

/** Mặc định là "chờ duyệt": đó là việc NGƯỜI KHÁC tạo ra cho chủ trọ. */
function readStatus(value: string | undefined): StatusFilter {
  if (!value) return "pending";
  if (value === "all") return "all";
  const found = POST_STATUS_OPTIONS.find((option) => option.value === value);
  return found ? (found.value as PostStatus) : "pending";
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; deleted?: string; error?: string }>;
}) {
  const params = await searchParams;
  const status = readStatus(params.status);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bài viết"
        description="Người thuê gửi bài thì nó nằm ở “Chờ duyệt”. Duyệt xong bạn chọn bài nào ra công khai."
        actions={
          <Button asChild>
            <Link href="/admin/posts/new">
              <PlusIcon />
              Viết bài
            </Link>
          </Button>
        }
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

      <nav className="flex flex-wrap gap-2" aria-label="Lọc theo trạng thái">
        {[{ value: "all" as StatusFilter, label: "Tất cả" }, ...POST_STATUS_OPTIONS].map(
          (option) => (
            <FilterChip
              key={option.value}
              href={buildHref(option.value as StatusFilter)}
              active={status === option.value}
              label={option.label}
            />
          ),
        )}
      </nav>

      {/* `key` đổi theo bộ lọc để skeleton hiện lại mỗi lần chuyển tab — không có
          nó thì danh sách cũ đứng im cho tới khi dữ liệu mới về. */}
      <Suspense key={status} fallback={<ListSkeleton />}>
        <AdminPosts status={status} />
      </Suspense>
    </div>
  );
}

/** Bỏ `status` khỏi URL khi nó là giá trị mặc định — một trạng thái, một địa chỉ. */
function buildHref(status: StatusFilter) {
  return status === "pending" ? "/admin/posts" : `/admin/posts?status=${status}`;
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-secondary",
      )}
    >
      {label}
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-[140px] w-full rounded-xl" />
      ))}
    </div>
  );
}

async function AdminPosts({ status }: { status: StatusFilter }) {
  const posts = await listPostsForAdmin({ status });

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<NotebookPenIcon />}
        title={status === "pending" ? "Không còn bài nào chờ duyệt" : "Chưa có bài nào"}
        description={
          status === "pending"
            ? "Người thuê gửi bài thì nó hiện ở đây, kèm một con số đỏ trên thanh bên."
            : "Bấm “Viết bài” để đăng thông báo cho cả nhà trọ, hoặc một bài giới thiệu lên trang công khai."
        }
      />
    );
  }

  return <PostList posts={posts} basePath="/admin/posts" showAuthor />;
}
