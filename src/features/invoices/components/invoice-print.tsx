"use client";

import { PrinterIcon } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Nút In / Lưu PDF.
 *
 * `window.print()` chứ không phải một thư viện sinh PDF: hộp thoại in của mọi
 * trình duyệt đều có sẵn "Lưu thành PDF", và nó dựng file từ chính HTML đang
 * hiện — nên bản in không bao giờ lệch với bản trên màn hình. Một thư viện PDF
 * lại là nơi thứ hai định nghĩa hoá đơn trông như thế nào, và hai nơi thì sớm
 * muộn lệch nhau.
 *
 * Bố cục khi in do các lớp `print:*` trong trang và khối `@media print` ở
 * globals.css lo.
 */
export function PrintButton({
  label = "In / Lưu PDF",
  ...props
}: ButtonProps & { label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      {...props}
    >
      <PrinterIcon />
      {label}
    </Button>
  );
}
