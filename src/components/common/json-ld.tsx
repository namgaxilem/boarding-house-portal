/**
 * Nhúng một khối JSON-LD vào trang.
 *
 * Google đọc dữ liệu có cấu trúc từ thẻ `<script type="application/ld+json">`
 * chứ không đoán từ HTML. Đây là thứ biến một kết quả tìm kiếm trơ chữ thành
 * kết quả có giá thuê, địa chỉ, số điện thoại và giờ mở cửa hiện ngay bên dưới.
 *
 * Không dùng `next/script`: dữ liệu phải nằm sẵn trong HTML đầu tiên mà bot tải
 * về. `next/script` với strategy mặc định sẽ chèn thẻ này bằng JavaScript sau
 * khi hydrate — Googlebot có render JS, nhưng vòng render đó xếp hàng riêng và
 * đến chậm hơn hẳn vòng đọc HTML.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Escape `<` thành `<`. Dữ liệu ở đây có phần do chủ trọ nhập (mô tả
      // phòng), và một chuỗi chứa "</script>" sẽ đóng sớm thẻ script rồi biến
      // phần còn lại thành HTML thật — đúng định nghĩa XSS lưu trữ. `<`
      // vẫn là JSON hợp lệ và parser của Google đọc bình thường.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
