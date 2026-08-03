import type { Metadata } from "next";
import {
  ClockIcon,
  LandmarkIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/common/copy-button";
import { houseConfig, fullAddress, telHref, zaloHref } from "@/config/site";
import { formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Liên hệ" };

export default function ContactPage() {
  const { contact, bank, address } = houseConfig;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Liên hệ</h1>
        <p className="text-muted-foreground">
          Gọi trực tiếp chủ trọ để hỏi phòng, hẹn xem hoặc báo sự cố.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Chủ trọ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Row icon={<PhoneIcon />} label="Điện thoại">
            <a
              href={telHref(contact.phone)}
              className="font-medium underline underline-offset-4"
            >
              {formatPhone(contact.phone)}
            </a>
          </Row>

          {contact.zalo && (
            <Row icon={<MessageCircleIcon />} label="Zalo">
              <a
                href={zaloHref(contact.zalo)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-4"
              >
                {formatPhone(contact.zalo)}
              </a>
            </Row>
          )}

          <Row icon={<MailIcon />} label="Email">
            <a
              href={`mailto:${contact.email}`}
              className="font-medium break-all underline underline-offset-4"
            >
              {contact.email}
            </a>
          </Row>

          <Row icon={<ClockIcon />} label="Giờ liên hệ">
            <span className="font-medium">{contact.officeHours}</span>
          </Row>

          <Row icon={<TriangleAlertIcon />} label="Khẩn cấp">
            <a
              href={telHref(contact.emergencyPhone)}
              className="font-medium text-destructive underline underline-offset-4"
            >
              {formatPhone(contact.emergencyPhone)}
            </a>
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Địa chỉ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Row icon={<MapPinIcon />} label="Nhà trọ">
            <span className="font-medium">{fullAddress()}</span>
          </Row>
          {address.mapUrl && (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <a href={address.mapUrl} target="_blank" rel="noopener noreferrer">
                <MapPinIcon />
                Mở Google Maps
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {bank && (
        <Card>
          <CardHeader>
            <CardTitle>Chuyển khoản tiền phòng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Row icon={<LandmarkIcon />} label="Ngân hàng">
              <span className="font-medium">{bank.name}</span>
            </Row>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Số tài khoản</p>
              <div className="flex items-center gap-1">
                <code className="flex-1 rounded-md bg-secondary px-2.5 py-1.5 font-mono text-sm">
                  {bank.accountNumber}
                </code>
                <CopyButton value={bank.accountNumber} label="Sao chép số tài khoản" />
              </div>
            </div>
            <Row icon={<LandmarkIcon />} label="Chủ tài khoản">
              <span className="font-medium">{bank.accountHolder}</span>
            </Row>
            <p className="rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
              Nội dung chuyển khoản: <strong>{bank.transferNote}</strong>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground [&_svg]:size-4"
      >
        {icon}
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  );
}
