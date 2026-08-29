import { Suspense } from "react";
import type { Metadata } from "next";
import { PlusIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { RequestList } from "@/features/maintenance/components/request-list";
import { listMaintenanceRequests } from "@/features/maintenance/queries";
import { MAINTENANCE_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MaintenanceStatus } from "@/types";

export const metadata: Metadata = { title: "Báo hỏng" };

export const instant = true;

/**
 * "Đang xử lý" là bộ lọc MẶC ĐỊNH, không phải "tất cả".
 *
 * Trang này tồn tại để trả lời "còn gì phải sửa". Mở ra thấy sáu tháng phiếu đã
 * đóng thì câu trả lời bị chôn ở dưới, và chủ trọ sẽ thôi mở nó.
 */
type Filter = MaintenanceStatus | "active" | "all";

const FILTERS: Filter[] = ["active", "open", "in_progress", "resolved", "closed", "all"];

const FILTER_LABEL: Record<Filter, string> = {
  active: "Đang xử lý",
  all: "Tất cả",
  open: MAINTENANCE_STATUS_LABEL.open,
  in_progress: MAINTENANCE_STATUS_LABEL.in_progress,
  resolved: MAINTENANCE_STATUS_LABEL.resolved,
  closed: MAINTENANCE_STATUS_LABEL.closed,
};

function readFilter(value: unknown): Filter {
  return typeof value === "string" && FILTERS.includes(value as Filter)
    ? (value as Filter)
    : "active";
}

export default async function MaintenancePage(props: PageProps<"/admin/maintenance">) {
  const searchParams = await props.searchParams;
  const filter = readFilter(searchParams.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo hỏng"
        description="Phiếu do người thuê gửi và phiếu bạn tự ghi."
        breadcrumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Báo hỏng" }]}
        actions={
          <Button asChild>
            <Link href="/admin/maintenance/new">
              <PlusIcon />
              Ghi phiếu
            </Link>
          </Button>
        }
      />

      {searchParams.deleted === "1" && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã xoá phiếu báo hỏng.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((value) => (
          <Link
            key={value}
            href={value === "active" ? "/admin/maintenance" : `/admin/maintenance?status=${value}`}
            aria-current={filter === value ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              filter === value
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {FILTER_LABEL[value]}
          </Link>
        ))}
      </div>

      <Suspense key={filter} fallback={<ListSkeleton />}>
        <Requests filter={filter} />
      </Suspense>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-[104px] w-full rounded-xl" />
      ))}
    </div>
  );
}

async function Requests({ filter }: { filter: Filter }) {
  const requests = await listMaintenanceRequests({ status: filter });

  return (
    <RequestList
      requests={requests}
      basePath="/admin/maintenance"
      emptyTitle={
        filter === "active" ? "Không còn gì phải sửa" : "Chưa có phiếu nào ở mục này"
      }
      emptyDescription={
        filter === "active"
          ? "Người thuê gửi báo hỏng thì phiếu hiện ở đây, và bạn nhận thông báo ngay."
          : undefined
      }
    />
  );
}
