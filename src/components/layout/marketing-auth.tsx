import { connection } from "next/server";

import { Link } from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMenu } from "@/components/layout/user-menu";
import { getCurrentUser } from "@/lib/auth/dal";

/**
 * Góc phải của header công khai: nút "Đăng nhập" khi chưa đăng nhập, avatar kèm
 * menu tài khoản khi đã đăng nhập.
 *
 * Tách thành component riêng thay vì đọc phiên ngay trong `(marketing)/layout.tsx`:
 * layout đó phải ở lại dạng đồng bộ để cả vỏ trang công khai vẫn prerender được.
 * Đọc cookie là dữ liệu thời-điểm-yêu-cầu, `await` nó trong layout là mất luôn
 * PPR của `/`, `/rooms` và `/contact` — ba trang mà người lạ vào nhiều nhất.
 *
 * Cách làm: layout bọc component này trong <Suspense>, phần còn lại của header
 * hiện ngay, chỗ này stream vào sau.
 */
export async function MarketingAuthSlot() {
  // `await connection()` TRƯỚC khi đọc phiên, và đặt ở ĐÂY chứ không trong
  // `getCurrentUser` — hàm đó bọc `cache()` nên từ lượt render thứ hai nó trả lại
  // promise đã ghi nhớ và `connection()` không chạy nữa. Cùng cái bẫy đã ghi ở
  // `lib/auth/dal.ts` và `features/dashboard/queries.ts`.
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link href="/login">Đăng nhập</Link>
      </Button>
    );
  }

  return <UserMenu user={user} />;
}

/**
 * Chỗ giữ khung lúc chưa biết đã đăng nhập hay chưa.
 *
 * Cố ý KHÔNG dựng sẵn nút "Đăng nhập" làm fallback: chủ trọ đang đăng nhập mở
 * trang giới thiệu sẽ thấy nút đó nháy lên rồi biến thành avatar — một trạng
 * thái sai, dù chỉ trong tích tắc. Một ô xám không khẳng định điều gì cả.
 */
export function MarketingAuthSlotFallback() {
  return <Skeleton className="h-9 w-20 rounded-md" aria-hidden />;
}
