import { Link } from "@/components/common/link";
import { ReceiptTextIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-lines";
import { formatDate, formatMonthYear, formatVND } from "@/lib/format";
import type { InvoiceDetail } from "@/types";

/**
 * Bảng hoá đơn cho khu quản trị.
 *
 * Không lọc ở client như bảng phòng: hoá đơn tích lại theo tháng và sẽ nhiều hơn
 * số phòng rất nhanh, nên bộ lọc nằm ở query string và do server thu hẹp.
 */
export function InvoiceTable({ invoices }: { invoices: InvoiceDetail[] }) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptTextIcon />}
        title="Chưa có hoá đơn nào"
        description="Ghi chỉ số điện nước trước, rồi lập hoá đơn cho tháng đó."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phòng</TableHead>
              <TableHead>Tháng</TableHead>
              <TableHead>Người thuê</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead>Hạn đóng</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <Link
                    href={`/admin/invoices/${invoice.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {invoice.room.code}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatMonthYear(invoice.period)}
                </TableCell>
                <TableCell className="max-w-40 truncate">
                  {invoice.tenant.fullName}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatVND(invoice.total)}
                </TableCell>
                <TableCell className="tabular-nums">{formatDate(invoice.dueDate)}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
