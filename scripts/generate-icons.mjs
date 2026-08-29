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
 * Vì sao maskable là bộ riêng: Android cắt icon theo hình của launcher (tròn,
 * vuông bo, giọt nước) và chỉ đảm bảo giữ lại đường tròn nội tiếp 80% ở giữa.
 * Đưa icon thường vào đó thì mất bốn góc. Bộ maskable thu logo còn 60% và trải
 * nền thương hiệu ra toàn khung, cắt kiểu gì cũng còn nguyên hình.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Nền của bộ maskable. Đổi cùng lúc với `rect fill` trong assets/logo.svg. */
const BRAND_BG = "#0d7d78";

/** Tỉ lệ logo chiếm trong khung maskable. 0.6 nằm gọn trong vùng an toàn 80%. */
const MASKABLE_SCALE = 0.6;

/**
 * Thẻ xem trước khi chia sẻ link — 1200×630 là tỉ lệ mọi nền tảng dùng chung.
 *
 * Cố ý KHÔNG in chữ lên ảnh: tên nhà trọ nằm ở `houseConfig.name`, và một cái
 * tên nướng vào file PNG sẽ sai ngay lần đầu chủ trọ đổi tên. Zalo/Messenger
 * hiển thị tiêu đề và mô tả bằng chữ ngay cạnh ảnh — chúng đọc từ thẻ meta, vốn
 * luôn khớp với config.
 */
const OG = { width: 1200, height: 630, logo: 368 };

/** Nền thẻ chia sẻ: đậm hơn màu thương hiệu một nấc, để khối logo nổi lên. */
const OG_BG = "#0a5f5b";

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

  await mkdir(path.join(root, "public", "icons"), { recursive: true });

  const plain = [
    { size: 32, out: path.join(root, "src", "app", "icon.png") },
    { size: 180, out: path.join(root, "src", "app", "apple-icon.png") },
    { size: 192, out: path.join(root, "public", "icons", "icon-192.png") },
    { size: 512, out: path.join(root, "public", "icons", "icon-512.png") },
  ];

  for (const { size, out } of plain) {
    await load()
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`✓ ${path.relative(root, out)} (${size}×${size})`);
  }

  for (const size of [192, 512]) {
    const inner = Math.round(size * MASKABLE_SCALE);
    const logo = await load().resize(inner, inner, { fit: "contain" }).png().toBuffer();

    const out = path.join(root, "public", "icons", `maskable-${size}.png`);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BRAND_BG,
      },
    })
      .composite([{ input: logo, gravity: "centre" }])
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`✓ ${path.relative(root, out)} (${size}×${size}, maskable)`);
  }

  // Thẻ chia sẻ mạng xã hội. Next tự nhận `src/app/opengraph-image.png` và chèn
  // <meta property="og:image">, không phải khai gì thêm.
  const ogLogo = await load().resize(OG.logo, OG.logo, { fit: "contain" }).png().toBuffer();
  const ogOut = path.join(root, "src", "app", "opengraph-image.png");
  await sharp({
    create: { width: OG.width, height: OG.height, channels: 4, background: OG_BG },
  })
    .composite([{ input: ogLogo, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toFile(ogOut);
  console.log(`✓ ${path.relative(root, ogOut)} (${OG.width}×${OG.height}, chia sẻ link)`);

  // Trình duyệt cũ và một số công cụ vẫn dò /favicon.ico ở gốc. Next phục vụ
  // src/app/icon.png cho thẻ <link>, nhưng request thẳng tới /favicon.ico thì
  // trả 404 và bẩn log. Ghi một bản PNG 32px vào đó — mọi trình duyệt hiện nay
  // đọc được PNG dù đuôi là .ico.
  const ico = await load().resize(32, 32, { fit: "contain" }).png().toBuffer();
  await writeFile(path.join(root, "public", "favicon.ico"), ico);
  console.log("✓ public/favicon.ico (32×32)");

  console.log(`\nNguồn: ${path.relative(root, source)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
