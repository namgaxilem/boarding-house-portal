"use client";

import { useEffect } from "react";

/**
 * Đăng ký service worker ở `public/sw.js`.
 *
 * Không render gì. Đặt trong root layout để chạy đúng một lần cho cả app.
 *
 * App không chạy offline — service worker tồn tại vì Chrome trên Android chỉ
 * bắn `beforeinstallprompt` (tức là nút "Cài đặt" mới hiện) khi trang có service
 * worker đã đăng ký kèm hàm xử lý `fetch`.
 */

/** Tăng cùng lúc với SW_VERSION trong public/sw.js. */
const SW_VERSION = "2";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Dev không đăng ký: service worker sẽ cache chunk của Turbopack và mọi lần
    // sửa code đều phải hard-reload mới thấy. Chỉ bật ở production.
    if (process.env.NODE_ENV !== "production") return;

    // Hoãn 1.2s: đăng ký service worker tranh băng thông với chunk JS của trang
    // đầu tiên. Người thuê mở app trên 3G sẽ thấy trang hiện chậm hơn.
    //
    // Query string là cách ép trình duyệt coi đây là script MỚI. Không có nó,
    // sửa sw.js xong vẫn phải chờ trình duyệt tự kiểm tra (tối đa 24 giờ).
    const timer = window.setTimeout(() => {
      navigator.serviceWorker
        .register(`/sw.js?v=${SW_VERSION}`, { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Đăng ký hỏng thì app vẫn chạy bình thường, chỉ mất khả năng cài đặt.
          // Không hiện lỗi cho người thuê — họ không làm gì được với thông tin đó.
        });
    }, 1_200);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}

/**
 * Xoá sạch cache của service worker. Gọi khi đăng xuất.
 *
 * Hiện `sw.js` không cache HTML nên đây là biện pháp phòng xa, không phải thứ
 * đang gánh trách nhiệm bảo mật.
 */
export function clearServiceWorkerCaches() {
  navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_CACHES" });
}
