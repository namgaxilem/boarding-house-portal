import {
  HomeIcon,
  ChartColumnIcon,
  DoorOpenIcon,
  GaugeIcon,
  IdCardIcon,
  ReceiptTextIcon,
  UsersIcon,
  SettingsIcon,
  WifiIcon,
  UserIcon,
  PhoneIcon,
  ScrollTextIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match nested routes too (e.g. /admin/rooms/abc highlights "Phòng"). */
  matchPrefix?: boolean;
  /**
   * Khoá trong `AdminTodo` để lấy số hiện trên huy hiệu.
   *
   * Chỉ hai mục có: giấy tờ và báo hỏng. Đó là hai chỗ NGƯỜI KHÁC tạo ra việc
   * cho chủ trọ — mọi mục còn lại là việc chủ trọ tự chủ động vào làm, và một
   * con số đỏ ở đó chỉ dạy người ta bỏ qua huy hiệu.
   */
  badge?: "pendingIdDocuments" | "openMaintenance";
}

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: HomeIcon },
  { href: "/admin/rooms", label: "Phòng", icon: DoorOpenIcon, matchPrefix: true },
  { href: "/admin/tenants", label: "Người thuê", icon: UsersIcon, matchPrefix: true },
  { href: "/admin/meters", label: "Điện nước", icon: GaugeIcon, matchPrefix: true },
  { href: "/admin/invoices", label: "Hoá đơn", icon: ReceiptTextIcon, matchPrefix: true },
  {
    href: "/admin/maintenance",
    label: "Báo hỏng",
    icon: WrenchIcon,
    matchPrefix: true,
    badge: "openMaintenance",
  },
  {
    href: "/admin/identity",
    label: "Giấy tờ",
    icon: IdCardIcon,
    matchPrefix: true,
    badge: "pendingIdDocuments",
  },
  { href: "/admin/reports", label: "Báo cáo", icon: ChartColumnIcon, matchPrefix: true },
  { href: "/admin/settings", label: "Cài đặt", icon: SettingsIcon, matchPrefix: true },
];

/**
 * Four items max — a fifth makes the bottom bar cramped on a 360px phone.
 *
 * Hoá đơn thay chỗ của Wifi: mỗi tháng người thuê mở hoá đơn vài lần, còn mật khẩu
 * wifi thì gõ một lần rồi điện thoại tự nhớ. Wifi vẫn có thẻ riêng ở trang chủ.
 */
export const TENANT_NAV: NavItem[] = [
  { href: "/me", label: "Trang chủ", icon: HomeIcon },
  { href: "/me/room", label: "Phòng", icon: DoorOpenIcon },
  { href: "/me/invoices", label: "Hoá đơn", icon: ReceiptTextIcon, matchPrefix: true },
  { href: "/me/profile", label: "Cá nhân", icon: UserIcon },
];

/** Reachable from the tenant home page rather than the bottom bar. */
export const TENANT_SECONDARY: NavItem[] = [
  { href: "/me/maintenance", label: "Báo hỏng", icon: WrenchIcon },
  { href: "/me/wifi", label: "Mật khẩu wifi", icon: WifiIcon },
  { href: "/me/identity", label: "Giấy tờ tuỳ thân", icon: IdCardIcon },
  { href: "/me/contact", label: "Liên hệ chủ trọ", icon: PhoneIcon },
  { href: "/me/rules", label: "Nội quy nhà trọ", icon: ScrollTextIcon },
];

export function isActive(pathname: string, item: NavItem) {
  if (item.matchPrefix) return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return pathname === item.href;
}
