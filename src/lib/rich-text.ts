/**
 * Cú pháp soạn thảo tối thiểu cho bài viết — và lý do KHÔNG dùng thư viện Markdown.
 *
 * Hàm này trả về một cây dữ liệu, không trả về chuỗi HTML. Component render nó
 * thành phần tử React, nên `dangerouslySetInnerHTML` không xuất hiện ở đâu cả:
 * người thuê gõ `<script>alert(1)</script>` thì nhìn thấy đúng chuỗi ký tự đó
 * trên màn hình. Không có gì để sanitize vì không có gì từng được hiểu là HTML.
 * Đó là khác biệt so với react-markdown + rehype-sanitize — bốn dependency và
 * một danh sách cho phép phải nuôi, để phục vụ một chủ trọ và mười người thuê
 * viết "Thông báo cắt nước ngày 12/10".
 *
 * URL chỉ vào được kết quả qua một đường duy nhất: hàm tự dò link bên dưới, và
 * nó kiểm lại bằng `new URL()` + so protocol. `javascript:` không có cửa.
 *
 * Cú pháp:
 *   ## Tiêu đề        → h2      (nhận theo TỪNG DÒNG)
 *   ### Tiêu đề nhỏ   → h3      (nhận theo TỪNG DÒNG)
 *   - mục             → danh sách, chỉ khi MỌI dòng của khối đều bắt đầu bằng "- "
 *   > trích            → trích dẫn, chỉ khi MỌI dòng của khối đều bắt đầu bằng ">"
 *   còn lại            → đoạn văn; xuống dòng đơn giữ nguyên thành <br />
 *
 * Quy tắc "mọi dòng" cho danh sách là cố ý: tiếng Việt mở lời thoại bằng "- " rất
 * nhiều, nên một dòng gạch đầu dòng lẫn trong văn xuôi phải vẫn là văn xuôi.
 */

export interface LinkNode {
  kind: "link";
  href: string;
  text: string;
}

export interface BreakNode {
  kind: "break";
}

export type Inline = string | LinkNode | BreakNode;

export type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "quote"; content: Inline[] }
  | { kind: "ul"; items: Inline[][] }
  | { kind: "p"; content: Inline[] };

const HEADING_2 = /^##[ \t]+(\S.*)$/;
const HEADING_3 = /^###[ \t]+(\S.*)$/;
const LIST_ITEM = /^-[ \t]+(\S.*)$/;
const QUOTE_LINE = /^>[ \t]?(.*)$/;

/** Bắt link trần. Không bắt `[chữ](url)` — cú pháp đó mời người ta giấu đích đến. */
const BARE_URL = /https?:\/\/[^\s<>"']+/g;

/**
 * Dấu câu dính đuôi URL khi người ta viết "xem tại https://a.vn/b." — chấm đó
 * thuộc về câu, không thuộc về đường dẫn.
 */
const TRAILING_PUNCTUATION = /[.,;:!?…]+$/;

export function parseRichText(input: string): Block[] {
  const normalized = input.replace(/\r\n?/g, "\n");
  const blocks: Block[] = [];

  for (const chunk of normalized.split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 0) continue;

    // Tiêu đề nhận theo dòng, không theo khối: không ai viết "## " ở đầu một câu
    // tiếng Việt bình thường, nên nhận nhầm là chuyện không xảy ra — trong khi
    // "## Tiêu đề" ngay trên dòng nội dung (không có dòng trống) thì lại rất hay gõ.
    let run: string[] = [];
    const flush = () => {
      if (run.length > 0) blocks.push(classify(run));
      run = [];
    };

    for (const line of lines) {
      const h3 = HEADING_3.exec(line);
      if (h3) {
        flush();
        blocks.push({ kind: "h3", text: h3[1].trim() });
        continue;
      }
      const h2 = HEADING_2.exec(line);
      if (h2) {
        flush();
        blocks.push({ kind: "h2", text: h2[1].trim() });
        continue;
      }
      run.push(line);
    }
    flush();
  }

  return blocks;
}

function classify(lines: string[]): Block {
  if (lines.every((line) => LIST_ITEM.test(line))) {
    return {
      kind: "ul",
      items: lines.map((line) => parseInline([LIST_ITEM.exec(line)![1].trim()])),
    };
  }

  if (lines.every((line) => QUOTE_LINE.test(line))) {
    return {
      kind: "quote",
      content: parseInline(lines.map((line) => QUOTE_LINE.exec(line)![1].trim())),
    };
  }

  return { kind: "p", content: parseInline(lines.map((line) => line.trim())) };
}

/** Ghép nhiều dòng thành một chuỗi node, chèn `break` giữa các dòng. */
function parseInline(lines: string[]): Inline[] {
  const out: Inline[] = [];

  lines.forEach((line, index) => {
    if (index > 0) out.push({ kind: "break" });
    out.push(...linkify(line));
  });

  return out;
}

function linkify(line: string): Inline[] {
  const out: Inline[] = [];
  let cursor = 0;

  for (const match of line.matchAll(BARE_URL)) {
    const start = match.index;
    const raw = match[0];
    const trimmed = trimUrl(raw);
    const href = safeHref(trimmed);

    if (!href) continue;

    if (start > cursor) out.push(line.slice(cursor, start));
    out.push({ kind: "link", href, text: trimmed });
    cursor = start + trimmed.length;
  }

  if (cursor < line.length) out.push(line.slice(cursor));
  return out.filter((node) => node !== "");
}

function trimUrl(raw: string): string {
  let url = raw.replace(TRAILING_PUNCTUATION, "");
  // Dấu đóng ngoặc chỉ thuộc về URL khi trong URL có dấu mở tương ứng — câu
  // "(xem https://a.vn/b)" thì ngoặc là của câu.
  while (url.endsWith(")") && !url.includes("(")) url = url.slice(0, -1);
  return url;
}

/**
 * Chốt chặn cuối. Regex ở trên đã chỉ khớp `http(s)://`, nhưng đây là nơi duy
 * nhất trong cả luồng mà một chuỗi do người dùng nhập trở thành thuộc tính
 * `href`, nên nó kiểm lại một lần nữa bằng bộ phân tích thật.
 */
function safeHref(candidate: string): string | null {
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Dòng tóm tắt tự động khi tác giả không nhập `excerpt`. */
export function plainTextPreview(input: string, max = 200): string {
  const text = parseRichText(input)
    .map((block) => {
      switch (block.kind) {
        case "h2":
        case "h3":
          return block.text;
        case "ul":
          return block.items.map(inlineToText).join(" · ");
        default:
          return inlineToText(block.content);
      }
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const lastSpace = head.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? head.slice(0, lastSpace) : head).trimEnd()}…`;
}

function inlineToText(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      if (typeof node === "string") return node;
      return node.kind === "link" ? node.text : " ";
    })
    .join("");
}
