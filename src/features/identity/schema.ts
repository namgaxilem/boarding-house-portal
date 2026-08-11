import { z } from "zod";

/**
 * Kiểm tra dữ liệu CCCD ở phía server.
 *
 * Client đã parse mã QR rồi, nhưng Server Action là endpoint HTTP công khai —
 * ai cũng POST thẳng vào được với nội dung tự bịa. Mọi trường ở đây phải được
 * kiểm lại từ đầu, coi như client không tồn tại.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Ngày không đúng định dạng",
  });

export const idDocumentSchema = z.object({
  idNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s.-]/g, ""))
    .refine((value) => /^(\d{9}|\d{12})$/.test(value), {
      message: "Số CCCD phải có 12 số, hoặc CMND cũ 9 số",
    }),

  oldIdNumber: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.replace(/[\s.-]/g, "") : null))
    .refine((value) => value === null || /^\d{9}$/.test(value), {
      message: "Số CMND cũ phải có 9 số",
    }),

  fullName: optionalText(120),

  dateOfBirth: optionalDate,
  issuedOn: optionalDate,

  // Chỉ nhận đúng hai giá trị in trên thẻ. Không mở rộng ở đây: đây là bản chép
  // lại giấy tờ, không phải ô khai giới tính của người dùng.
  gender: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "Nam" || value === "Nữ" ? value : null)),

  residence: optionalText(255),

  /** 'qr' = máy đọc được mã; 'manual' = mã mờ, người dùng gõ tay. */
  source: z.enum(["qr", "manual"]).default("manual"),
});

export const rejectIdDocumentSchema = z.object({
  documentId: z.string().uuid("Hồ sơ không hợp lệ"),
  note: z
    .string()
    .trim()
    .min(5, "Ghi rõ lý do để người thuê biết cần chụp lại thế nào")
    .max(500, "Lý do tối đa 500 ký tự"),
});

export type IdDocumentFormValues = z.infer<typeof idDocumentSchema>;
