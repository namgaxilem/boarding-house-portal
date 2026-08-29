import { PageHeader } from "@/components/common/page-header";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt"
        description="Thông tin nhà trọ, wifi và tài khoản của bạn."
        breadcrumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Cài đặt" }]}
      />
      <SettingsTabs />
      {children}
    </div>
  );
}
