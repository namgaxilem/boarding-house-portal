/**
 * Bản thay thế `server-only` khi chạy vitest.
 *
 * Package thật chỉ làm đúng một việc: ném lỗi nếu bị nạp từ bundle client. Next
 * phân giải nó bằng điều kiện bundler riêng; vitest không có điều kiện đó nên
 * nạp trúng bản ném lỗi và giết cả file test trước khi có test nào chạy.
 *
 * Không nới lỏng gì cả: ranh giới client/server vẫn do `next build` kiểm.
 * Xem alias trong vitest.config.ts.
 */
export {};
