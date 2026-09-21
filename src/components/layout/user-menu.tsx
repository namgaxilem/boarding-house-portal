"use client";

import { Link } from "@/components/common/link";
import { LogOutIcon, UserIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { ROLE_LABEL } from "@/lib/constants";
import { initials } from "@/lib/format";
import type { SessionUser } from "@/types";

export function UserMenu({ user }: { user: SessionUser }) {
  const profileHref = user.role === "admin" ? "/admin/settings/account" : "/me/profile";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Nhãn PHẢI chứa hai chữ cái đang hiện trên nút.
            Nút hiện chữ "NN" mà tên trợ năng chỉ là "Tài khoản" là lỗi
            label-content-name-mismatch: người điều khiển bằng giọng nói đọc
            thấy "NN" rồi ra lệnh "bấm NN", và trình duyệt không tìm ra nút nào
            tên như vậy. Đặt `aria-hidden` lên avatar KHÔNG chữa được — chữ vẫn
            hiện trên màn hình, đó mới là thứ người dùng đọc theo. */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${initials(user.fullName)} — tài khoản`}
        >
          <Avatar>
            <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5 py-2">
          <p className="truncate text-sm font-medium text-foreground">{user.fullName}</p>
          <p className="truncate text-xs font-normal">{user.email}</p>
          <p className="text-xs font-normal">{ROLE_LABEL[user.role]}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={profileHref}>
            <UserIcon />
            Tài khoản của tôi
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* A real form POST, so signing out works even if the dropdown's JS fails. */}
        <form action={signOut}>
          <button type="submit" className="w-full">
            <DropdownMenuItem variant="destructive" asChild>
              <span>
                <LogOutIcon />
                Đăng xuất
              </span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
