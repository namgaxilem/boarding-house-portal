import { Link } from "@/components/common/link";
import { HomeIcon, SearchXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground"
      >
        <SearchXIcon className="size-6" />
      </span>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Không tìm thấy trang</h1>
        <p className="max-w-sm text-muted-foreground">
          Trang bạn tìm không tồn tại hoặc đã bị xoá.
        </p>
      </div>

      <Button asChild>
        <Link href="/">
          <HomeIcon />
          Về trang chủ
        </Link>
      </Button>
    </div>
  );
}
