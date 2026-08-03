import { DoorClosedIcon, PhoneIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { houseConfig, telHref } from "@/config/site";

/**
 * Shown to a tenant whose account exists but who has not been assigned a room.
 * Happens between "admin created the account" and "admin did the check-in".
 */
export function NoRoomNotice() {
  return (
    <EmptyState
      icon={<DoorClosedIcon />}
      title="Bạn chưa được xếp phòng"
      description={`Tài khoản đã tạo nhưng chưa gán vào phòng nào. Liên hệ ${houseConfig.contact.ownerName} để được xếp phòng.`}
      action={
        <Button asChild>
          <a href={telHref(houseConfig.contact.phone)}>
            <PhoneIcon />
            Gọi {houseConfig.contact.phone}
          </a>
        </Button>
      }
    />
  );
}
