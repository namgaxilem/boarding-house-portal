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
 * còn component này là bản dùng trong giao diện. Sửa một bên thì sửa cả hai
 * (và cả `assets/logo-mark.svg`, bản in ra giấy).
 *
 * Khác duy nhất: `viewBox` ở đây CẮT SÁT hình (40 60 432 396) thay vì
 * `0 0 512 512`. Lề trong file nguồn tồn tại vì Android xén maskable theo hình
 * launcher — ở giao diện thì lề đó chỉ làm logo hụt đi ~20% so với chữ bên cạnh.
 *
 * Hình là MÁI NHÀ CHE MỘT Ổ KHÓA, không có nền. Bản cũ có một plate teal bo góc
 * phía sau; bỏ đi vì trên thanh điều hướng và tab trình duyệt nó trông như
 * sticker dán đè. Nền đặc giờ chỉ còn ở apple-icon / maskable / ảnh chia sẻ,
 * do scripts/generate-icons.mjs tự trải màu kem vào — xem ghi chú ở đó.
 */

/**
 * Màu cố định, KHÔNG theo theme: logo phải giống nhau ở chế độ sáng và tối.
 *
 * `INK` sáng hơn một nấc so với `--primary` (#0d7d78). Cố ý — logo không nền
 * phải đọc được cả trên nền kem lẫn nền tối, và #0d7d78 trên nền tối chỉ đạt
 * ~2.4:1. Đổi ở đây thì đổi luôn assets/logo.svg và assets/logo-mark.svg.
 */
const INK = "#0e8f89";
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
      viewBox="40 60 432 396"
      className={cn("shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {/* Mái. Vẽ bằng nét, đầu bo tròn — cho ra hiên nhà mềm và chỉnh độ dày
          bằng đúng một con số khi cần cứu cỡ 32px. */}
      <path
        d="M76 258 L256 96 L436 258"
        fill="none"
        stroke={INK}
        strokeWidth={58}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Quai khóa, nép trong lòng chữ V của mái. Hai chân thò xuống 306 rồi
          khuất sau thân khóa (mép trên 294): không bao giờ hở đường chỉ nối. */}
      <path d="M206 306 V264 a50 50 0 0 1 100 0 V306" fill="none" stroke={INK} strokeWidth={34} />
      <rect x={156} y={294} width={200} height={154} rx={30} fill={INK} />
      {/* Lỗ khóa — điểm ấm duy nhất. Luôn nằm trong thân khóa, không chạm nền
          trang: hổ phách đặt thẳng lên nền kem chỉ được ~1.7:1. */}
      <circle cx={256} cy={355} r={24} fill={LIT} />
      <rect x={246} y={355} width={20} height={56} rx={6} fill={LIT} />
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
