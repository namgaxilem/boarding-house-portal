/*
 * =============================================================================
 *  Service Worker — tồn tại để app CÀI ĐƯỢC, không phải để chạy offline
 * =============================================================================
 *
 * App này bắt buộc có mạng. Mất mạng thì trình duyệt hiện màn hình lỗi của
 * chính nó — cố ý, và trung thực hơn là bày ra một trang giả vờ.
 *
 * Vậy sao vẫn cần file này? Vì Chrome trên Android chỉ bắn sự kiện
 * `beforeinstallprompt` khi trang có service worker ĐÃ ĐĂNG KÝ VÀ CÓ HÀM XỬ LÝ
 * `fetch`. Không có nó thì nút "Cài đặt" trong app không bao giờ hiện, người
 * thuê phải tự mò menu ⋮ của trình duyệt.
 *
 * Nên phần fetch dưới đây làm đúng một việc có ích: cache tài nguyên tĩnh có
 * hash trong tên. Mở app lần thứ hai không phải tải lại JS/CSS.
 *
 * ⚠️ NGUYÊN TẮC BẢO MẬT — đọc trước khi sửa file này:
 *
 *   KHÔNG BAO GIỜ cache phản hồi HTML của trang đã đăng nhập.
 *
 * Cache của service worker dùng chung cho cả origin, không tách theo tài khoản.
 * Nhà trọ hay có cảnh hai người mượn điện thoại nhau: A đăng nhập xem phòng,
 * đăng xuất, B đăng nhập trên cùng máy. Nếu HTML của A nằm trong cache thì B mở
 * ra thấy số CCCD, số phòng, mật khẩu wifi của A. Đăng xuất không xoá được cache.
 *
 * Vì vậy request điều hướng đi thẳng ra mạng, không qua tay service worker.
 *
 * -----------------------------------------------------------------------------
 * Đổi file này rồi thì PHẢI tăng SW_VERSION, nếu không trình duyệt vẫn chạy bản
 * cũ đã cache. `src/components/common/service-worker.tsx` dùng con số này làm
 * query string khi đăng ký để ép trình duyệt tải lại.
 */

const SW_VERSION = "2";

const ASSET_CACHE = `assets-v${SW_VERSION}`;

/** Chỉ những đường dẫn này được cache. Đều là nội dung tĩnh, công khai, có hash. */
function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".wasm")
  );
}

/* --------------------------------------------------------------------- cài */

self.addEventListener("install", (event) => {
  // Không precache gì cả: app cần mạng, nên không có tài nguyên nào đáng tải
  // trước. Lên bản mới ngay, không chờ tab cũ đóng.
  event.waitUntil(self.skipWaiting());
});

/* ----------------------------------------------------------------- kích hoạt */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== ASSET_CACHE).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/* --------------------------------------------------------------------- fetch */

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Chỉ GET. POST là Server Action — cache lại thì hỏng dữ liệu.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Chỉ cùng origin. Ảnh Supabase, font Google... để trình duyệt tự lo.
  if (url.origin !== self.location.origin) return;

  // Điều hướng trang, RSC payload, Server Action, API: không đụng vào.
  // Xem ghi chú bảo mật ở đầu file.
  if (!isCacheableAsset(url)) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { cacheName: ASSET_CACHE });
      if (cached) return cached;

      const response = await fetch(request);
      // Chỉ lưu bản 200 thật. Phản hồi `opaque` (status 0) không đọc được nội
      // dung nên lưu vào là cache một lỗi vĩnh viễn.
      if (response.ok && response.status === 200) {
        const cache = await caches.open(ASSET_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});

/* -------------------------------------------------- dọn cache lúc đăng xuất */

// Trang gọi sang khi người dùng bấm đăng xuất. Hiện tại không có HTML nào trong
// cache nên gần như không cần, nhưng giữ đường dây này để nếu sau có ai thêm
// cache trang thì đã có sẵn chỗ dọn.
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name)))),
    );
  }
});
