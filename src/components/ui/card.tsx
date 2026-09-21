import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-5 pb-0", className)}
      {...props}
    />
  );
}

/**
 * `as` đổi CẤP tiêu đề mà không đổi cỡ chữ.
 *
 * Mặc định `h3` đúng cho phần lớn chỗ trong app: card nằm dưới một `h2` của
 * khối. Nhưng ở trang công khai như `/contact`, card LÀ khối cấp một — để `h3`
 * thì cấu trúc nhảy thẳng h1 → h3. Trình đọc màn hình mất một bậc điều hướng,
 * và bot thấy một trang chỉ có đúng một tiêu đề rồi hết.
 *
 * Chỉ mở ba cấp: `h2`–`h4`. Không nhận `div` — một card không có tiêu đề thì
 * đừng dùng `CardTitle`, đừng biến nó thành thẻ trung tính.
 */
function CardTitle({
  className,
  as: Tag = "h3",
  ...props
}: React.ComponentProps<"h3"> & { as?: "h2" | "h3" | "h4" }) {
  return (
    <Tag
      data-slot="card-title"
      className={cn("text-base font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("p-5", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-2 p-5 pt-0", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
};
