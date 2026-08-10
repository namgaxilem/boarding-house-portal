import type { Metadata } from "next";
import { FileCode2Icon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { houseConfig, fullAddress } from "@/config/site";
import { formatPhone, formatVND } from "@/lib/format";

export const metadata: Metadata = { title: "Cài đặt nhà trọ" };

// Toàn bộ nội dung lấy từ config, không chạm DB — tab này tĩnh hoàn toàn.
export const instant = true;

/**
 * Read-only on purpose.
 *
 * House identity, contact details, bank account, rules and default prices all
 * live in `src/config/site.ts` — one file, one source of truth. This page mirrors
 * it so the landlord can check what tenants actually see without digging through
 * the tenant portal.
 */
export default function HouseSettingsPage() {
  const { contact, bank, defaults, rules, features } = houseConfig;

  return (
    <div className="space-y-6">
      <Alert variant="info">
        <FileCode2Icon />
        <AlertTitle>Sửa ở một chỗ duy nhất</AlertTitle>
        <AlertDescription>
          Toàn bộ thông tin dưới đây nằm trong file{" "}
          <code className="font-mono text-xs">src/config/site.ts</code>. Sửa file đó rồi
          deploy lại, mọi trang sẽ cập nhật theo. Không có bảng cấu hình trong database,
          nên không bao giờ có chuyện hai nơi ghi hai giá trị khác nhau.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nhà trọ</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Rows
              items={[
                ["Tên", houseConfig.name],
                ["Khẩu hiệu", houseConfig.tagline],
                ["Địa chỉ", fullAddress()],
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liên hệ</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Rows
              items={[
                ["Chủ trọ", contact.ownerName],
                ["Điện thoại", formatPhone(contact.phone)],
                ["Zalo", contact.zalo ? formatPhone(contact.zalo) : "—"],
                ["Email", contact.email],
                ["Khẩn cấp", formatPhone(contact.emergencyPhone)],
                ["Giờ liên hệ", contact.officeHours],
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đơn giá mặc định khi thêm phòng</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Rows
              items={[
                ["Điện", `${formatVND(defaults.electricPrice)} / kWh`],
                ["Nước", `${formatVND(defaults.waterPrice)} / m³`],
                ["Dịch vụ", `${formatVND(defaults.servicePrice)} / tháng`],
                ["Số người tối đa", `${defaults.maxOccupants} người`],
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chuyển khoản</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {bank ? (
              <Rows
                items={[
                  ["Ngân hàng", bank.name],
                  ["Số tài khoản", bank.accountNumber],
                  ["Chủ tài khoản", bank.accountHolder],
                  ["Cú pháp", bank.transferNote],
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Chưa cấu hình — người thuê chỉ thấy hướng dẫn trả tiền mặt.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nội quy ({rules.length} mục)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ol className="space-y-2 text-sm">
            {rules.map((rule, index) => (
              <li key={rule} className="flex gap-3">
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {index + 1}.
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tính năng</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-4">
          {Object.entries(features).map(([key, enabled]) => (
            <Badge key={key} variant={enabled ? "success" : "secondary"}>
              {FEATURE_LABEL[key] ?? key}: {enabled ? "bật" : "tắt"}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const FEATURE_LABEL: Record<string, string> = {
  publicLanding: "Trang giới thiệu",
  publicRoomList: "Công khai phòng trống",
  chat: "Chat",
  gateCodes: "Mã mở cổng",
  invoices: "Hoá đơn",
};

function Rows({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
