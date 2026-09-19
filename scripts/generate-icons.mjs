/**
 * Sinh toàn bộ icon của app từ một file nguồn duy nhất.
 *
 *   npm run icons
 *
 * Nguồn: assets/logo.svg (hoặc logo.png). Thay file đó rồi chạy lại là cả bộ
 * icon được sinh mới — không phải mở Photoshop, không phải lên web xuất icon.
 *
 * Sinh ra 8 file, mỗi file phục vụ đúng một chỗ:
 *
 *   src/app/icon.png              32      tab trình duyệt (Next tự chèn <link rel="icon">)
 *   src/app/apple-icon.png       180      màn hình chính iPhone/iPad
 *   public/icons/icon-192.png    192      Android, cửa sổ cài đặt
 *   public/icons/icon-512.png    512      màn hình chờ (splash) khi mở app
 *   public/icons/maskable-*  192/512      Android cắt theo hình launcher
 *   public/favicon.ico            32      trình duyệt cũ dò thẳng /favicon.ico
 *   src/app/opengraph-image.png 1200×630  thẻ xem trước khi gửi link qua Zalo,
 *                                         Messenger, Facebook (Next tự chèn thẻ meta)
 *
 * ---------------------------------------------------------------------------
 * NỀN TRONG SUỐT, TRỪ BA CHỖ KHÔNG TRÁNH ĐƯỢC
 * ---------------------------------------------------------------------------
 * Logo nguồn không có nền (xem đầu assets/logo.svg). Phần lớn icon giữ nguyên
 * nền trong suốt. Ba chỗ buộc phải đặc, và script tự trải `PLATE_BG` vào:
 *
 *   apple-icon  — iOS tô ĐEN mọi vùng trong suốt của icon màn hình chính. Đây
 *                 không phải tuỳ chọn: thả icon alpha vào là được một ô đen.
 *                 iOS tự bo góc squircle, nên nền phải tràn hết khung.
 *   maskable    — Android cắt theo hình launcher (tròn, vuông bo, giọt nước) và
 *                 chỉ đảm bảo giữ đường tròn nội tiếp 80% ở giữa. Không nền thì
 *                 hở bốn góc; logo thu còn 60% để cắt kiểu gì cũng còn nguyên.
 *   opengraph   — thẻ chia sẻ link là một tấm ảnh, không có khái niệm alpha.
 *
 * `PLATE_BG` là màu kem của app, KHÔNG phải teal. Dùng teal thì mọi thứ lại
 * thành cái plate màu mà bản thiết kế này vừa bỏ đi.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Nền cho những icon buộc phải đặc.
 *
 * Phải khớp `background_color`/`theme_color` trong src/app/manifest.ts và
 * `themeColor` (light) trong src/app/layout.tsx. Lệch nhau thì lúc khởi động
 * app chớp một màu rồi đổi sang màu khác.
 */
const PLATE_BG = "#fbfaf7";

/** Tỉ lệ logo chiếm trong khung maskable. 0.6 nằm gọn trong vùng an toàn 80%. */
const MASKABLE_SCALE = 0.6;

/**
 * Tỉ lệ logo trong khung apple-icon.
 *
 * Rộng hơn maskable vì iOS chỉ bo góc chứ không cắt sâu, nhưng vẫn chừa lề —
 * icon chạm mép trông chật giữa hàng icon khác trên màn hình chính.
 */
const APPLE_SCALE = 0.78;

/**
 * Thẻ xem trước khi chia sẻ link — 1200×630 là tỉ lệ mọi nền tảng dùng chung.
 *
 * Cố ý KHÔNG in chữ lên ảnh: tên nhà trọ nằm ở `houseConfig.name`, và một cái
 * tên nướng vào file PNG sẽ sai ngay lần đầu chủ trọ đổi tên. Zalo/Messenger
 * hiển thị tiêu đề và mô tả bằng chữ ngay cạnh ảnh — chúng đọc từ thẻ meta, vốn
 * luôn khớp với config.
 */
const OG = { width: 1200, height: 630, logo: 340 };

function findSource() {
  for (const name of ["logo.svg", "logo.png"]) {
    const file = path.join(root, "assets", name);
    if (existsSync(file)) return file;
  }
  throw new Error(
    "Không tìm thấy assets/logo.svg hoặc assets/logo.png. Đặt logo vào đó rồi chạy lại.",
  );
}

async function main() {
  const source = findSource();
  const buffer = await readFile(source);

  // `density` chỉ có tác dụng với SVG: bảo sharp rasterise ở độ phân giải cao rồi
  // mới thu nhỏ. Bỏ qua thì SVG được vẽ ở 72dpi và icon 512 sẽ mờ nhoè.
  const load = () => sharp(buffer, { density: 384 });

  /** Logo thu về `size`, nền trong suốt, trả ra buffer PNG để dán lên nền khác. */
  const logoAt = (size) =>
    load()
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

  await mkdir(path.join(root, "public", "icons"), { recursive: true });

  const rel = (out) => path.relative(root, out);

  // --- Nền trong suốt -------------------------------------------------------
  const transparent = [
    { size: 32, out: path.join(root, "src", "app", "icon.png") },
    { size: 192, out: path.join(root, "public", "icons", "icon-192.png") },
    { size: 512, out: path.join(root, "public", "icons", "icon-512.png") },
  ];

  for (const { size, out } of transparent) {
    await load()
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`✓ ${rel(out)} (${size}×${size}, trong suốt)`);
  }

  // --- Nền đặc: iOS + Android maskable -------------------------------------
  const plated = [
    {
      size: 180,
      scale: APPLE_SCALE,
      out: path.join(root, "src", "app", "apple-icon.png"),
      note: "iOS tô đen vùng trong suốt",
    },
    {
      size: 192,
      scale: MASKABLE_SCALE,
      out: path.join(root, "public", "icons", "maskable-192.png"),
      note: "maskable",
    },
    {
      size: 512,
      scale: MASKABLE_SCALE,
      out: path.join(root, "public", "icons", "maskable-512.png"),
      note: "maskable",
    },
  ];

  for (const { size, scale, out, note } of plated) {
    const logo = await logoAt(Math.round(size * scale));
    await sharp({
      create: { width: size, height: size, channels: 4, background: PLATE_BG },
    })
      .composite([{ input: logo, gravity: "centre" }])
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`✓ ${rel(out)} (${size}×${size}, ${note})`);
  }

  // --- Thẻ chia sẻ mạng xã hội ---------------------------------------------
  // Next tự nhận `src/app/opengraph-image.png` và chèn <meta property="og:image">,
  // không phải khai gì thêm.
  const ogLogo = await logoAt(OG.logo);
  const ogOut = path.join(root, "src", "app", "opengraph-image.png");
  await sharp({
    create: { width: OG.width, height: OG.height, channels: 4, background: PLATE_BG },
  })
    .composite([{ input: ogLogo, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toFile(ogOut);
  console.log(`✓ ${rel(ogOut)} (${OG.width}×${OG.height}, chia sẻ link)`);

  // Trình duyệt cũ và một số công cụ vẫn dò /favicon.ico ở gốc. Next phục vụ
  // src/app/icon.png cho thẻ <link>, nhưng request thẳng tới /favicon.ico thì
  // trả 404 và bẩn log. Ghi một bản PNG 32px vào đó — mọi trình duyệt hiện nay
  // đọc được PNG dù đuôi là .ico.
  const ico = await logoAt(32);
  await writeFile(path.join(root, "public", "favicon.ico"), ico);
  console.log("✓ public/favicon.ico (32×32, trong suốt)");

  console.log(`\nNguồn: ${rel(source)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
