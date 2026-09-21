import { describe, expect, it } from "vitest";

import { parseRichText, plainTextPreview, type Block, type Inline } from "./rich-text";

/** Gom mọi chuỗi trong cây về một chỗ để khẳng định "không có gì thành HTML". */
function allText(blocks: Block[]): string {
  const parts: string[] = [];
  const walk = (nodes: Inline[]) => {
    for (const node of nodes) {
      if (typeof node === "string") parts.push(node);
      else if (node.kind === "link") parts.push(node.text);
    }
  };
  for (const block of blocks) {
    if (block.kind === "h2" || block.kind === "h3") parts.push(block.text);
    else if (block.kind === "ul") block.items.forEach(walk);
    else walk(block.content);
  }
  return parts.join("\n");
}

describe("parseRichText — khối", () => {
  it("đoạn văn thường", () => {
    expect(parseRichText("Xin chào cả nhà.")).toEqual([
      { kind: "p", content: ["Xin chào cả nhà."] },
    ]);
  });

  it("tách khối theo dòng trống, bỏ qua dòng trống thừa", () => {
    const blocks = parseRichText("Một.\n\n\n\nHai.");
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.kind === "p")).toBe(true);
  });

  it("xuống dòng đơn trong một đoạn thành node break", () => {
    const blocks = parseRichText("Dòng một\nDòng hai");
    expect(blocks).toEqual([
      { kind: "p", content: ["Dòng một", { kind: "break" }, "Dòng hai"] },
    ]);
  });

  it("chấp nhận CRLF", () => {
    expect(parseRichText("Một.\r\n\r\nHai.")).toEqual(parseRichText("Một.\n\nHai."));
  });

  it("tiêu đề nhận theo dòng, kể cả khi dính liền nội dung", () => {
    expect(parseRichText("## Thông báo\nNội dung ngay dưới")).toEqual([
      { kind: "h2", text: "Thông báo" },
      { kind: "p", content: ["Nội dung ngay dưới"] },
    ]);
    expect(parseRichText("### Nhỏ hơn")).toEqual([{ kind: "h3", text: "Nhỏ hơn" }]);
  });

  it("### được nhận trước ## nên không bị cắt thành '# Nhỏ'", () => {
    const blocks = parseRichText("### Nhỏ");
    expect(blocks[0]).toEqual({ kind: "h3", text: "Nhỏ" });
  });

  it("danh sách chỉ khi MỌI dòng của khối bắt đầu bằng '- '", () => {
    expect(parseRichText("- Điện\n- Nước\n- Rác")).toEqual([
      { kind: "ul", items: [["Điện"], ["Nước"], ["Rác"]] },
    ]);
  });

  it("một dòng gạch đầu dòng lẫn trong văn xuôi vẫn là đoạn văn", () => {
    const blocks = parseRichText("Chủ trọ nói:\n- Mai cắt nước nhé");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("p");
  });

  it("trích dẫn chỉ khi mọi dòng bắt đầu bằng '>'", () => {
    expect(parseRichText("> Câu một\n> Câu hai")).toEqual([
      { kind: "quote", content: ["Câu một", { kind: "break" }, "Câu hai"] },
    ]);
    expect(parseRichText("Mở đầu\n> Câu một")[0].kind).toBe("p");
  });

  it("chuỗi rỗng cho mảng rỗng", () => {
    expect(parseRichText("")).toEqual([]);
    expect(parseRichText("   \n\n  ")).toEqual([]);
  });
});

describe("parseRichText — an toàn", () => {
  it("thẻ HTML sống sót nguyên văn dưới dạng chữ", () => {
    const blocks = parseRichText("<script>alert(1)</script>");
    expect(blocks).toEqual([{ kind: "p", content: ["<script>alert(1)</script>"] }]);
    expect(allText(blocks)).toContain("<script>");
  });

  it("javascript: và data: không bao giờ thành link", () => {
    for (const evil of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      const blocks = parseRichText(`Bấm vào ${evil} đi`);
      const links = blocks.flatMap((b) =>
        b.kind === "p" ? b.content.filter((n) => typeof n !== "string" && n.kind === "link") : [],
      );
      expect(links).toHaveLength(0);
    }
  });

  it("cú pháp [chữ](url) KHÔNG sinh link — đích đến không được phép giấu", () => {
    const blocks = parseRichText("[bấm đây](https://evil.example/x)");
    const links = blocks.flatMap((b) =>
      b.kind === "p" ? b.content.filter((n) => typeof n !== "string" && n.kind === "link") : [],
    );
    // URL trần bên trong vẫn được dò ra, nhưng chữ hiển thị là chính URL đó.
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ kind: "link", text: "https://evil.example/x" });
  });
});

describe("parseRichText — dò link", () => {
  it("dò link trần và giữ nguyên chữ quanh nó", () => {
    const blocks = parseRichText("Xem tại https://nhatro.vn/rooms nhé");
    expect(blocks[0]).toEqual({
      kind: "p",
      content: [
        "Xem tại ",
        { kind: "link", href: "https://nhatro.vn/rooms", text: "https://nhatro.vn/rooms" },
        " nhé",
      ],
    });
  });

  it("dấu chấm cuối câu không bị nuốt vào URL", () => {
    const blocks = parseRichText("Xem https://nhatro.vn/a.");
    const [, link, tail] = (blocks[0] as { content: Inline[] }).content;
    expect(link).toMatchObject({ text: "https://nhatro.vn/a" });
    expect(tail).toBe(".");
  });

  it("dấu đóng ngoặc của câu không bị nuốt vào URL", () => {
    const blocks = parseRichText("(xem https://nhatro.vn/a)");
    const content = (blocks[0] as { content: Inline[] }).content;
    expect(content.at(-1)).toBe(")");
  });

  it("dò được nhiều link trong một dòng", () => {
    const blocks = parseRichText("https://a.vn và https://b.vn");
    const links = (blocks[0] as { content: Inline[] }).content.filter(
      (n) => typeof n !== "string" && n.kind === "link",
    );
    expect(links).toHaveLength(2);
  });
});

describe("plainTextPreview", () => {
  it("gộp các khối thành một dòng", () => {
    expect(plainTextPreview("## Tiêu đề\n\nNội dung.\n\n- Một\n- Hai")).toBe(
      "Tiêu đề Nội dung. Một · Hai",
    );
  });

  it("cắt tại khoảng trắng và thêm dấu ba chấm", () => {
    const out = plainTextPreview("một hai ba bốn năm sáu bảy tám chín mười", 20);
    expect(out.length).toBeLessThanOrEqual(21);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toContain("  ");
  });

  it("không cắt khi đã đủ ngắn", () => {
    expect(plainTextPreview("Ngắn thôi.", 200)).toBe("Ngắn thôi.");
  });
});
