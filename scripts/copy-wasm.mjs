/**
 * Chép bộ giải mã QR (WebAssembly) của zxing-wasm vào public/.
 *
 * Chạy tự động sau mỗi `npm install` (xem "postinstall" trong package.json).
 *
 * Vì sao phải tự host thay vì dùng CDN mặc định của thư viện:
 *
 *   Riêng tư   zxing-wasm mặc định tải file .wasm từ jsDelivr. Nghĩa là mỗi lần
 *              người thuê quét CCCD, trình duyệt lại lộ một request kèm IP sang
 *              máy chủ bên thứ ba. Việc quét thì vẫn chạy trong máy, nhưng không
 *              cần thiết phải để lại dấu vết ở đâu cả.
 *   Chạy được  Máy chủ CDN chặn hoặc chậm là tính năng quét chết, dù ảnh CCCD
 *              nằm ngay trong tay người dùng.
 *   CSP        Content-Security-Policy chặt sẽ chặn script/wasm từ origin lạ.
 *
 * File đích nằm trong .gitignore — nó là bản sao từ node_modules, không phải mã
 * nguồn. Đường dẫn được khai trong src/lib/qr.ts.
 */

import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const source = path.join(
  root,
  "node_modules",
  "zxing-wasm",
  "dist",
  "reader",
  "zxing_reader.wasm",
);
const target = path.join(root, "public", "zxing_reader.wasm");

if (!existsSync(source)) {
  // Không phải lỗi chí mạng: `npm ci` trên CI chỉ cài dependency production vẫn
  // có gói này, nhưng đừng để postinstall làm hỏng cả lệnh cài chỉ vì một file.
  console.warn("⚠ Không thấy zxing_reader.wasm — bỏ qua. Quét QR sẽ không chạy.");
  process.exit(0);
}

await mkdir(path.dirname(target), { recursive: true });
await copyFile(source, target);
console.log("✓ public/zxing_reader.wasm");
