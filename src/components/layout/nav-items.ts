import {
  HomeIcon,
  DoorOpenIcon,
  IdCardIcon,
  UsersIcon,
  SettingsIcon,
  WifiIcon,
  UserIcon,
  PhoneIcon,
  ScrollTextIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match nested routes too (e.g. /admin/rooms/abc highlights "Phòng"). */
  matchPrefix?: boolean;
}

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: HomeIcon },
  { href: "/admin/rooms", label: "Phòng", icon: DoorOpenIcon, matchPrefix: true },
  { href: "/admin/tenants", label: "Người thuê", icon: UsersIcon, matchPrefix: true },
  { href: "/admin/identity", label: "Giấy tờ", icon: IdCardIcon, matchPrefix: true },
  { href: "/admin/settings", label: "Cài đặt", icon: SettingsIcon, matchPrefix: true },
];

/** Four items max — a fifth makes the bottom bar cramped on a 360px phone. */
export const TENANT_NAV: NavItem[] = [
  { href: "/me", label: "Trang chủ", icon: HomeIcon },
  { href: "/me/room", label: "Phòng", icon: DoorOpenIcon },
  { href: "/me/wifi", label: "Wifi", icon: WifiIcon },
  { href: "/me/profile", label: "Cá nhân", icon: UserIcon },
];

/** Reachable from the tenant home page rather than the bottom bar. */
export const TENANT_SECONDARY: NavItem[] = [
  { href: "/me/identity", label: "Giấy tờ tuỳ thân", icon: IdCardIcon },
  { href: "/me/contact", label: "Liên hệ chủ trọ", icon: PhoneIcon },
  { href: "/me/rules", label: "Nội quy nhà trọ", icon: ScrollTextIcon },
];

export function isActive(pathname: string, item: NavItem) {
  if (item.matchPrefix) return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return pathname === item.href;
}
