import { z } from "zod";

/**
 * Mọi schema ở đây PHẲNG, không lồng object.
 *
 * `invalid()` dựng `fieldErrors` theo `issue.path[0]` (lib/action-result.ts), nên
 * một object lồng làm mọi lỗi con dồn hết về khoá của object cha, và `<Field>`
 * không hiện được gì cả.
 *
 * Giới hạn ở đây phải khớp với CHECK trong migration 0013. Zod là để báo lỗi tử
 * tế trước khi tốn một vòng mạng; ràng buộc trong database mới là chốt chặn —
 * Server Action là một endpoint POST công khai.
 */

const title = z
  .string()
  .trim()
  .min(5, "Tiêu đề ít nhất 5 ký tự")
  .max(160, "Tiêu đề tối đa 160 ký tự — Google cắt ở khoảng đó");

const excerpt = z
  .string()
  .trim()
  .max(300, "Tóm tắt tối đa 300 ký tự")
  .optional()
  .transform((value) => (value ? value : null));

const body = z
  .string()
  .trim()
  .min(20, "Nội dung quá ngắn")
  .max(20000, "Nội dung tối đa 20.000 ký tự — cắt bớt hoặc tách thành hai bài");

/** Người thuê và chủ trọ dùng chung khi soạn: trạng thái không nằm trong form. */
export const postSchema = z.object({ title, excerpt, body });

/**
 * Chủ trọ duyệt bài.
 *
 * `visibility` chỉ xuất hiện ở đây, không ở `postSchema`: đưa nó vào form của
 * người thuê là mời họ gửi lên `public`, và dù RLS chặn thì một ô bị từ chối
 * lặng lẽ vẫn là giao diện nói dối.
 */
export const approvePostSchema = z.object({
  postId: z.string().uuid("Bài viết không hợp lệ"),
  visibility: z.enum(["public", "internal"], { error: "Chọn phạm vi hiển thị" }),
});

export const rejectPostSchema = z.object({
  postId: z.string().uuid("Bài viết không hợp lệ"),
  note: z
    .string()
    .trim()
    .min(5, "Ghi rõ lý do để tác giả biết cần sửa gì")
    .max(500, "Lý do tối đa 500 ký tự"),
});

export const postIdSchema = z.object({
  postId: z.string().uuid("Bài viết không hợp lệ"),
});
