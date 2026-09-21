import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { cn } from "@/lib/utils";

/**
 * Trước / Sau bằng `<Link>`, không JavaScript.
 *
 * Bám mẫu chip-lọc-là-link của `/admin/invoices`. Không có component
 * `Pagination` dùng chung vì đây là chỗ DUY NHẤT trong app cần phân trang: mọi
 * danh sách khác đều bị chặn bởi ngôi nhà (10 phòng, 15 người), còn bài viết thì
 * mọc mãi theo thời gian.
 *
 * `page=1` KHÔNG xuất hiện trong URL: để nó xuất hiện là `/blog` và `/blog?page=1`
 * thành hai địa chỉ cho cùng một nội dung, và Google phải tự đoán cái nào là thật.
 */
export function PostPagination({ page, pageCount }: { page: number; pageCount: number }) {
  if (pageCount <= 1) return null;

  const href = (target: number) => (target <= 1 ? "/blog" : `/blog?page=${target}`);

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Phân trang bài viết">
      <PageLink
        href={href(page - 1)}
        disabled={page <= 1}
        rel="prev"
        label="Trang trước"
        icon={<ChevronLeftIcon className="size-4" />}
      />

      <p className="text-sm text-muted-foreground tabular-nums">
        Trang {page} / {pageCount}
      </p>

      <PageLink
        href={href(page + 1)}
        disabled={page >= pageCount}
        rel="next"
        label="Trang sau"
        iconAfter={<ChevronRightIcon className="size-4" />}
      />
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  rel,
  label,
  icon,
  iconAfter,
}: {
  href: string;
  disabled: boolean;
  rel: "prev" | "next";
  label: string;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
}) {
  const className = cn(
    "inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm",
    disabled
      ? "pointer-events-none text-muted-foreground opacity-50"
      : "hover:bg-secondary",
  );

  // Đầu danh sách không có "trang trước" — vẫn dựng một phần tử để hai nút không
  // nhảy chỗ khi sang trang 2.
  if (disabled) {
    return (
      <span className={className} aria-hidden>
        {icon}
        {label}
        {iconAfter}
      </span>
    );
  }

  return (
    <Link href={href} rel={rel} className={className}>
      {icon}
      {label}
      {iconAfter}
    </Link>
  );
}
