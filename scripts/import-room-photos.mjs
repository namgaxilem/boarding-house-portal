/**
 * Nạp ảnh phòng từ một thư mục trên máy lên Supabase.
 *
 *   node --env-file=.env.local scripts/import-room-photos.mjs "<thư mục>" [--dry-run] [--replace]
 *
 * Vì sao cần script: giao diện /admin/rooms/<id> tải ảnh từng phòng một, qua
 * trình duyệt. Mười phòng × vài tấm là mười lần mở trang, chọn file, chờ. Đây
 * là đường tắt cho lần nạp ĐẦU TIÊN; sau đó chủ trọ vẫn thêm/xoá ảnh trong app.
 *
 * Thư mục nguồn phải có dạng:
 *
 *   <thư mục>/phong_1/anh1.jpg
 *   <thư mục>/phong_1/anh2.jpg
 *   <thư mục>/phong_6/IMG_0162.jpg
 *
 * Tên thư mục con `phong_<mã>` khớp với `rooms.code`. Ngoại lệ duy nhất là
 * `phong_0` → phòng `Master` (tầng trệt): thư mục ảnh đánh số từ 0, còn bảng
 * `rooms` gọi phòng đó là Master. File và thư mục không khớp quy tắc thì bị bỏ
 * qua kèm một dòng cảnh báo — KHÔNG đoán mò.
 *
 * ---------------------------------------------------------------------------
 * CHẠY LẠI ĐƯỢC BAO NHIÊU LẦN CŨNG ĐƯỢC
 * ---------------------------------------------------------------------------
 * `storage_path` không dùng UUID ngẫu nhiên như luồng trong app mà dùng BĂM
 * NỘI DUNG file gốc: `<room_id>/<sha256 16 byte đầu>.webp`. Cột đó có ràng buộc
 * UNIQUE, nên nạp lại cùng một tấm ảnh là bị chặn ở tầng database chứ không
 * sinh ra bản sao. Đổi tên file trên máy cũng không tạo thêm bản sao — nội dung
 * mới là thứ được băm.
 *
 * `--replace` xoá sạch ảnh hiện có của những phòng CÓ trong thư mục nguồn rồi
 * mới nạp. Phòng không có thư mục nguồn thì không bị đụng tới.
 *
 * ---------------------------------------------------------------------------
 * NÉN
 * ---------------------------------------------------------------------------
 * Ảnh điện thoại 2–3MB không được đẩy thẳng lên: gói Supabase miễn phí có 1GB
 * storage và 5GB băng thông/tháng. Script nén y như trình duyệt vẫn làm —
 * WebP, cạnh dài 1600px, hạ dần chất lượng cho tới khi xuống dưới 400KB.
 *
 * Thang nén dưới đây SAO CHÉP `encodeLadder()` trong src/lib/image.ts theo
 * `ROOM_PHOTO_POLICY` của src/lib/upload-policy.ts. Sao chép chứ không import
 * vì đây là file .mjs chạy bằng node trần, không qua bundler TypeScript. Sửa
 * chính sách bên đó thì sửa ở đây.
 */

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

// --------------------------------------------------------------- chính sách

/** Bản sao của ROOM_PHOTO_POLICY — xem ghi chú đầu file. */
const POLICY = {
  maxDimension: 1600,
  /** sharp nhận 1–100, còn policy bên app ghi 0–1. 0.82 → 82. */
  quality: 82,
  targetBytes: 400 * 1024,
  maxUploadBytes: 1536 * 1024,
  maxPerParent: 12,
};

/** Bản sao của encodeLadder(). Dừng ở bậc đầu tiên lọt dưới `targetBytes`. */
const LADDER = [
  { maxDimension: 1600, quality: 82 },
  { maxDimension: 1600, quality: 70 },
  { maxDimension: 1600, quality: 58 },
  { maxDimension: 1200, quality: 70 },
  { maxDimension: 960, quality: 64 },
  { maxDimension: 800, quality: 58 },
];

const BUCKET = "room-photos";

/** Đuôi file được nhận. Video (.mp4) bị bỏ qua: bucket chỉ cho phép ảnh. */
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/**
 * Thư mục ảnh đánh số từ 0, bảng `rooms` gọi phòng tầng trệt là "Master".
 * Thêm ngoại lệ mới ở đây chứ đừng nới lỏng quy tắc khớp tên.
 */
const FOLDER_CODE_ALIASES = { 0: "Master" };

// ------------------------------------------------------------------ tham số

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const replace = args.includes("--replace");
const sourceDir = args.find((arg) => !arg.startsWith("--"));

if (!sourceDir) {
  console.error(
    'Thiếu thư mục nguồn.\n' +
      '  node --env-file=.env.local scripts/import-room-photos.mjs "<thư mục>" [--dry-run] [--replace]',
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Chạy bằng `node --env-file=.env.local ...` để nạp .env.local.",
  );
  process.exit(1);
}

// service_role bỏ qua RLS. Bắt buộc: policy ghi của cả bảng lẫn bucket đều đòi
// `public.is_admin()`, mà script thì không có phiên đăng nhập nào.
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ------------------------------------------------------------------- tiện ích

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/** Nén đúng thang của trình duyệt. Trả về bậc nhẹ nhất nếu chạy hết thang. */
async function encode(buffer) {
  let best = null;

  for (const step of LADDER) {
    const output = await sharp(buffer)
      // `withoutEnlargement` giữ ảnh vốn đã nhỏ ở nguyên kích thước — phóng to
      // chỉ làm file nặng thêm mà không thêm chi tiết nào.
      .rotate() // tôn trọng EXIF orientation trước khi resize, nếu không ảnh dọc bị nằm ngang
      .resize(step.maxDimension, step.maxDimension, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: step.quality })
      .toBuffer();

    if (!best || output.length < best.length) best = output;
    if (output.length <= POLICY.targetBytes) return output;
  }

  return best;
}

async function listRooms() {
  const { data, error } = await supabase.from("rooms").select("id, code");
  if (error) throw new Error(`Không đọc được danh sách phòng: ${error.message}`);
  return new Map(data.map((room) => [room.code, room.id]));
}

/** Thư mục con `phong_<mã>` → mã phòng, hoặc null nếu tên không khớp quy tắc. */
function folderToCode(name) {
  const match = /^phong[_-](.+)$/i.exec(name);
  if (!match) return null;
  const raw = match[1];
  return FOLDER_CODE_ALIASES[raw] ?? raw;
}

// --------------------------------------------------------------------- chạy

async function main() {
  const rooms = await listRooms();
  const entries = await readdir(sourceDir, { withFileTypes: true });

  console.log(`Nguồn: ${sourceDir}`);
  console.log(`Đích:  ${url} · bucket ${BUCKET}`);
  if (dryRun) console.log("CHẠY THỬ — không ghi gì lên server.\n");
  else console.log("");

  let totalUploaded = 0;
  let totalSkipped = 0;
  const warnings = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) {
      // Ảnh nằm ngay ở gốc thư mục (cổng, nhà xe, sơ đồ) không thuộc phòng nào
      // — app chưa có chỗ chứa ảnh chung, nên bỏ qua chứ không gán bừa.
      if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        warnings.push(`${entry.name} — ảnh ở gốc, không thuộc phòng nào, bỏ qua.`);
      }
      continue;
    }

    const code = folderToCode(entry.name);
    if (!code) {
      warnings.push(`${entry.name}/ — tên không theo dạng "phong_<mã>", bỏ qua.`);
      continue;
    }

    const roomId = rooms.get(code);
    if (!roomId) {
      warnings.push(`${entry.name}/ — không có phòng nào mã "${code}" trong database.`);
      continue;
    }

    const dir = path.join(sourceDir, entry.name);
    const files = (await readdir(dir, { withFileTypes: true }))
      .filter((file) => file.isFile())
      .map((file) => file.name)
      .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const ignored = (await readdir(dir)).length - files.length;
    if (ignored > 0) {
      warnings.push(`${entry.name}/ — bỏ qua ${ignored} file không phải ảnh (video, README…).`);
    }

    if (files.length === 0) {
      console.log(`· ${entry.name}/ → phòng ${code}: chưa có ảnh nào.`);
      continue;
    }

    console.log(`· ${entry.name}/ → phòng ${code} (${roomId})`);

    if (replace && !dryRun) {
      const { data: old } = await supabase
        .from("room_photos")
        .select("storage_path")
        .eq("room_id", roomId);

      if (old?.length) {
        await supabase.storage.from(BUCKET).remove(old.map((row) => row.storage_path));
        await supabase.from("room_photos").delete().eq("room_id", roomId);
        console.log(`    xoá ${old.length} ảnh cũ (--replace)`);
      }
    }

    // `sort_order` nối tiếp ảnh cuối đang có: ảnh mới xuống cuối danh sách,
    // không cướp chỗ ảnh bìa mà chủ trọ đã chọn.
    const { data: last } = await supabase
      .from("room_photos")
      .select("sort_order")
      .eq("room_id", roomId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    let sortOrder = (last?.sort_order ?? -1) + 1;
    let existing = sortOrder;

    for (const name of files) {
      if (existing >= POLICY.maxPerParent) {
        warnings.push(
          `${entry.name}/${name} — phòng ${code} đã đủ ${POLICY.maxPerParent} ảnh, bỏ qua phần còn lại.`,
        );
        break;
      }

      const source = path.join(dir, name);
      const original = await readFile(source);
      const encoded = await encode(original);

      if (encoded.length > POLICY.maxUploadBytes) {
        warnings.push(
          `${entry.name}/${name} — nén hết thang vẫn còn ${formatBytes(encoded.length)}, bỏ qua.`,
        );
        continue;
      }

      // Băm NỘI DUNG GỐC, không phải bản đã nén: đổi thang nén sau này cũng
      // không làm cùng một tấm ảnh được coi là ảnh mới.
      const digest = createHash("sha256").update(original).digest("hex").slice(0, 32);
      const storagePath = `${roomId}/${digest}.webp`;

      const label =
        `    ${name} ${formatBytes(original.length)} → ${formatBytes(encoded.length)}`;

      if (dryRun) {
        console.log(`${label}  (thử)`);
        existing += 1;
        continue;
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, encoded, { contentType: "image/webp", upsert: true });

      if (uploadError) {
        warnings.push(`${entry.name}/${name} — không tải lên được: ${uploadError.message}`);
        continue;
      }

      const { error: insertError } = await supabase.from("room_photos").insert({
        room_id: roomId,
        storage_path: storagePath,
        sort_order: sortOrder,
      });

      if (insertError) {
        // 23505 = trùng UNIQUE(storage_path): ảnh này đã nạp lần trước. Không
        // phải lỗi, và KHÔNG xoá file trên bucket — hàng cũ vẫn đang trỏ vào nó.
        if (insertError.code === "23505") {
          console.log(`${label}  (đã có, bỏ qua)`);
          totalSkipped += 1;
          continue;
        }

        // Ghi bảng hỏng thì file vừa lên thành rác vĩnh viễn — dọn ngay.
        await supabase.storage.from(BUCKET).remove([storagePath]);
        warnings.push(`${entry.name}/${name} — không lưu được: ${insertError.message}`);
        continue;
      }

      console.log(label);
      sortOrder += 1;
      existing += 1;
      totalUploaded += 1;
    }
  }

  console.log(
    `\n${dryRun ? "Sẽ nạp" : "Đã nạp"} ${totalUploaded} ảnh` +
      (totalSkipped ? `, bỏ qua ${totalSkipped} ảnh đã có` : "") +
      ".",
  );

  if (warnings.length) {
    console.log("\nCần biết:");
    for (const warning of warnings) console.log(`  ! ${warning}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
