import { Link } from "@/components/common/link";
import { houseConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Logo nhà trọ, vẽ thẳng bằng SVG trong React.
 *
 * Không `<Image src="/logo.svg">`: đây là hình xuất hiện trên MỌI trang, và một
 * thẻ ảnh thì tốn thêm một request, nhấp nháy một nhịp trước khi tải xong, và
 * không ăn theo `currentColor`. Vài chục byte markup rẻ hơn tất cả những thứ đó.
 *
 * Hình giống hệt `assets/logo.svg` — file đó là nguồn sinh icon PWA/favicon,
 * còn component này là bản dùng trong giao diện. Sửa một bên thì sửa cả hai.
 */

/** Màu cố định, KHÔNG theo theme: logo phải giống nhau ở chế độ sáng và tối. */
const BRAND = "#0d7d78";
const WALL = "#ffffff";
const LIT = "#f6b93b";

export function HouseLogo({
  className,
  title = houseConfig.name,
}: {
  className?: string;
  /** Đặt "" để ẩn hẳn với trình đọc màn hình, khi cạnh nó đã có chữ tên nhà trọ. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <rect width="512" height="512" rx="112" fill={BRAND} />
      <path d="M92 252 L256 112 L420 252 L372 252 L372 404 L140 404 L140 252 Z" fill={WALL} />
      {/* Dải ngăn hai tầng — chi tiết nói "nhà trọ" thay vì "cái nhà". */}
      <rect x="140" y="318" width="232" height="26" fill={BRAND} />
      {/* Hai ô sáng nằm chéo nhau: hai phòng đang có người ở. */}
      <rect x="176" y="272" width="68" height="42" rx="10" fill={LIT} />
      <rect x="268" y="272" width="68" height="42" rx="10" fill={BRAND} />
      <rect x="176" y="348" width="68" height="42" rx="10" fill={BRAND} />
      <rect x="268" y="348" width="68" height="42" rx="10" fill={LIT} />
    </svg>
  );
}

/**
 * Logo + tên nhà trọ, bấm được.
 *
 * Ba khu (giới thiệu, đăng nhập, quản trị) trước đây mỗi nơi tự dựng lại khối
 * này bằng `BuildingIcon`. Gộp về một chỗ để đổi logo là đổi cả ba, và để tên
 * nhà trọ luôn đọc từ `houseConfig` chứ không bị gõ cứng ở đâu đó.
 */
export function BrandLockup({
  href = "/",
  className,
  logoClassName = "size-8",
  labelClassName,
}: {
  href?: string;
  className?: string;
  logoClassName?: string;
  labelClassName?: string;
}) {
  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {/* `title=""`: tên nhà trọ đã nằm ngay cạnh dưới dạng chữ, để logo mang
          thêm một nhãn nữa là trình đọc màn hình đọc tên hai lần. */}
      <HouseLogo className={logoClassName} title="" />
      <span className={cn("truncate font-semibold", labelClassName)}>
        {houseConfig.name}
      </span>
    </Link>
  );
}
