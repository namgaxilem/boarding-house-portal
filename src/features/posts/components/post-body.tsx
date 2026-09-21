import { Fragment } from "react";

import { parseRichText, type Inline } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/**
 * Nội dung bài viết.
 *
 * KHÔNG có `dangerouslySetInnerHTML` ở đây, và đó là toàn bộ điểm của thiết kế:
 * `parseRichText` trả về một cây dữ liệu, component này biến cây đó thành phần
 * tử React, và React tự escape mọi chuỗi. Người thuê gõ `<script>alert(1)</script>`
 * thì nhìn thấy đúng chuỗi ký tự đó — không có gì để sanitize vì không có gì
 * từng được hiểu là HTML.
 *
 * Đây là Server Component: HTML nằm sẵn trong lần tải đầu tiên, nên Googlebot
 * đọc được mà không cần chạy JavaScript, và bundle client không tăng một byte.
 */

export function PostBody({ body, className }: { body: string; className?: string }) {
  const blocks = parseRichText(body);

  return (
    <div className={cn("space-y-4 leading-7 text-foreground", className)}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "h2":
            return (
              <h2 key={index} className="pt-2 text-xl font-semibold tracking-tight">
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={index} className="pt-1 text-lg font-semibold tracking-tight">
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={index} className="list-disc space-y-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <InlineNodes nodes={item} />
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-2 border-border pl-4 text-muted-foreground"
              >
                <InlineNodes nodes={block.content} />
              </blockquote>
            );
          default:
            return (
              <p key={index}>
                <InlineNodes nodes={block.content} />
              </p>
            );
        }
      })}
    </div>
  );
}

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        if (typeof node === "string") return <Fragment key={index}>{node}</Fragment>;
        if (node.kind === "break") return <br key={index} />;

        return (
          <a
            key={index}
            href={node.href}
            target="_blank"
            // `ugc` + `nofollow`: bài do người thuê viết. Không có hai thuộc tính
            // này thì một liên kết spam trong bài mượn được uy tín tên miền của
            // nhà trọ. `noopener` chặn trang đích với tới `window.opener`.
            rel="nofollow ugc noopener noreferrer"
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            {node.text}
          </a>
        );
      })}
    </>
  );
}
