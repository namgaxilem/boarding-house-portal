"use client";

import { useEffect, useState } from "react";

import { useUiStore } from "@/stores/ui-store";

/**
 * Thanh tiến trình mảnh ở mép trên màn hình khi đang chuyển trang.
 *
 * Nguồn tín hiệu là `useLinkStatus` gom qua `ui-store` (xem components/common/link.tsx),
 * không phải sự kiện click. Khác biệt quan trọng: `useLinkStatus` chỉ báo pending
 * khi Next THỰC SỰ phải chờ dữ liệu. Trang đã prefetch xong thì chuyển tức thì và
 * thanh này không hiện lần nào — đúng như mong muốn, thêm hiệu ứng vào một thao
 * tác vốn đã tức thì chỉ làm nó có cảm giác chậm đi.
 *
 * Ba mốc thời gian, mỗi mốc chống một kiểu khó chịu:
 *   130ms trước khi hiện  — điều hướng nhanh không nháy một vệt màu vô nghĩa.
 *   chạy tới 90% rồi chậm — không bao giờ đứng ở 100% trong khi trang chưa xong.
 *   220ms để kết thúc     — lấp đầy rồi mờ dần, thay vì biến mất đột ngột.
 */
export function NavProgress() {
  const active = useUiStore((state) => state.navigationCount > 0);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    // Cả hai nhánh đều đổi state trong callback của timer, không đổi thẳng trong
    // thân effect. Nhánh mở cần độ trễ thật (130ms). Nhánh đóng thì không, nhưng
    // vẫn đi qua timer: đổi state đồng bộ ngay trong effect ép React render thêm
    // một vòng nữa trước khi kịp vẽ khung hình — đúng lúc trình duyệt đang bận
    // dựng trang mới, tức là đúng lúc không được phép tốn thêm.
    if (active) {
      const timer = window.setTimeout(() => setPhase("loading"), 130);
      return () => window.clearTimeout(timer);
    }

    // Chỉ đóng đẹp nếu đã kịp hiện ra. Điều hướng xong dưới 130ms thì quay thẳng
    // về idle, người dùng không thấy gì cả.
    const timer = window.setTimeout(
      () => setPhase((current) => (current === "loading" ? "done" : "idle")),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    if (phase !== "done") return;
    const timer = window.setTimeout(() => setPhase("idle"), 220);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "idle") return null;

  return (
    <div aria-hidden className="nav-progress">
      <div className={phase === "done" ? "nav-progress-bar is-done" : "nav-progress-bar"} />
    </div>
  );
}
