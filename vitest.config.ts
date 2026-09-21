import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Test chỉ chạy cho code THUẦN trong `src/lib` — tính tiền, kỳ, định dạng ngày,
 * parse mã QR trên thẻ căn cước.
 *
 * Cố ý không dựng môi trường jsdom và không test component: đây là nhà trọ mười
 * phòng, và thứ đáng test là những hàm mà sai một chỗ thì người thuê bị tính sai
 * tiền — không phải việc một cái thẻ có đúng class Tailwind hay không.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/lib/**/*.test.ts"],
    // Cố định múi giờ TIẾN TRÌNH lệch hẳn khỏi Việt Nam. Test phải chứng minh
    // rằng hiển thị bám theo `houseConfig.timeZone` chứ không theo máy chủ —
    // chạy test trên máy đã UTC+7 thì bug lệch 7 tiếng không bao giờ lộ ra.
    env: { TZ: "UTC" },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` là một package chỉ để NÉM LỖI khi bị nạp ngoài Server
      // Component; Next phân giải nó qua điều kiện bundler riêng, vitest thì
      // không nên nó nạp trúng bản ném lỗi và cả file test chết trước khi chạy.
      //
      // Thay bằng một module rỗng: ở đây không có ranh giới client nào để bảo
      // vệ, và ranh giới thật vẫn được `next build` kiểm như cũ.
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
});
