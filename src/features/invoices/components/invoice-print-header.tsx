import { houseConfig, fullAddress } from "@/config/site";
import { formatDate, formatMonthYear } from "@/lib/format";
import type { InvoiceDetail } from "@/types";

/**
 * Đầu trang chỉ hiện khi IN.
 *
 * Trên màn hình, tên nhà trọ nằm ở thanh bên và mã hoá đơn nằm trên URL. Tờ giấy
 * không có hai thứ đó — mà tờ giấy lại chính là thứ được đưa cho người thuê, hoặc
 * kẹp vào sổ để đối chiếu ba tháng sau.
 */
export function InvoicePrintHeader({ invoice }: { invoice: InvoiceDetail }) {
  const { name, contact } = houseConfig;

  return (
    <div className="hidden print:block">
      <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-3">
        <div>
          <p className="text-lg font-bold">{name}</p>
          <p className="text-xs">{fullAddress()}</p>
          <p className="text-xs">
            {contact.ownerName} · {contact.phone}
            {contact.email && ` · ${contact.email}`}
          </p>
        </div>

        <div className="text-right">
          <p className="text-base font-bold uppercase">Hoá đơn tiền phòng</p>
          <p className="text-xs">Tháng {formatMonthYear(invoice.period)}</p>
          <p className="text-xs">Phòng {invoice.room.code}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <div className="flex gap-2">
          <dt className="font-medium">Người thuê:</dt>
          <dd>{invoice.tenant.fullName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium">Ngày lập:</dt>
          <dd>{formatDate(invoice.createdAt)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium">Hạn đóng:</dt>
          <dd>{formatDate(invoice.dueDate)}</dd>
        </div>
        <div className="flex gap-2">
          {/* Tám ký tự đầu của uuid là đủ để tra ngược một hoá đơn trong nhà trọ
              mười phòng, và ngắn để đọc qua điện thoại cho nhau. */}
          <dt className="font-medium">Mã hoá đơn:</dt>
          <dd className="font-mono">{invoice.id.slice(0, 8).toUpperCase()}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Chân trang chỉ hiện khi in: hai ô ký.
 *
 * Nhà trọ thu tiền mặt vẫn cần một tờ có chữ ký hai bên — đó là toàn bộ lý do
 * người ta in hoá đơn ra thay vì mở app.
 */
export function InvoicePrintFooter() {
  return (
    <div className="hidden print:block">
      <div className="mt-8 grid grid-cols-2 gap-8 text-center text-xs">
        <div>
          <p className="font-medium">Người nộp tiền</p>
          <p className="text-[10px]">(ký, ghi rõ họ tên)</p>
          <div className="h-16" />
        </div>
        <div>
          <p className="font-medium">Người nhận tiền</p>
          <p className="text-[10px]">(ký, ghi rõ họ tên)</p>
          <div className="h-16" />
        </div>
      </div>

      <p className="mt-6 text-center text-[10px]">
        {houseConfig.name} · {fullAddress()}
      </p>
    </div>
  );
}
