[← Mục lục](README.md)

# 14 — Trợ lý Telegram

Chủ trọ nhắn tin cho một bot, AI đọc dữ liệu nhà trọ và trả lời. Chỉ chủ trọ dùng được.

**Đợt này CHỈ ĐỌC.** Registry không chứa một lệnh ghi nào, nên rủi ro ghi bằng **0** — không phải
"bằng 0 nếu code đúng". Cổng xác nhận cho thao tác ghi là đợt sau; thiết kế của nó nằm ở §9.

```
Telegram ──POST──► /api/telegram/webhook
                     1. so timing-safe X-Telegram-Bot-Api-Secret-Token   sai → 401 · thiếu env → 503
                     2. zod-parse Update
                     3. CHIẾM update_id                                  trùng → 200 no-op
                     4. trả 200 NGAY                                     (đo được: 21ms)
                     5. after(() => handleUpdate())
                                   │
                                   ▼
                        resolveTelegramAdmin(chat_id)  ──► telegram_links ⋈ profiles
                            chưa liên kết / không phải admin → trả lời rồi dừng
                                   │
                                   ▼
                        lib/agent/run.ts   toolRunner · claude-opus-5 · effort low · 8 lượt
                                   │  mỗi lần gọi tool
                                   ▼
                        lib/mcp/run.ts     zod parse → mở audit → runAsService → đóng audit
                                   │
                                   ▼
                        lib/db (Repository) ──► PostgREST ──► Postgres
```

## 1. `chat_id` một mình không bao giờ đủ

Ba lý do, và cả ba đều đủ để loại một allowlist trần:

1. Webhook là endpoint HTTPS công khai. Rò `TELEGRAM_WEBHOOK_SECRET` thì một `Update` giả với
   `chat_id` bất kỳ là POST được — khi đó một số nguyên đoán được là thứ duy nhất chắn cửa admin.
2. `chat_id` định danh một **cuộc trò chuyện**, không định danh một **người**. Nhật ký cần
   `profiles.id`, và việc kiểm vai cũng vậy.
3. Không có hạn, không thu hồi được, không phân biệt được "máy nào".

Nên chiều liên kết **luôn đi từ web sang Telegram**: chủ trọ đang đăng nhập bấm "Tạo mã liên kết" →
gõ `/start <mã>` cho bot → `redeem_telegram_link_code()` đổi mã lấy liên kết trong một transaction.

| Thuộc tính của mã | Giá trị |
|---|---|
| Độ dài | 8 ký tự, bảng chữ Crockford base32 (bỏ `I O U 0 1`) — mã này được **đọc từ màn hình rồi gõ lại trên điện thoại** |
| Entropy | ~40 bit |
| Hạn | 10 phút |
| Số lần dùng | 1 |
| Lưu trữ | **sha256**, không lưu mã thật |
| Chống dò | 5 lần sai mỗi chat mỗi giờ (`telegram_link_attempts`) |

**Vai được kiểm lại ở MỖI TIN NHẮN**, không chỉ lúc liên kết — `resolveTelegramAdmin()` đọc
`profiles.role` và `is_active` mỗi lượt. Hạ quyền một tài khoản trên web thì bot ngừng nghe người đó
ở tin nhắn kế tiếp. Cùng nguyên tắc "database nói lời cuối" của `lib/auth/dal.ts`.

Thu hồi là `revoked_at`, **không phải `DELETE`** — hàng trong `admin_audit_log` phải còn tra ngược
được.

## 2. Hình dạng của webhook, và vì sao thứ tự quan trọng

Telegram gửi lại **cùng một `update_id`** cho tới khi nhận 2xx, và một lượt agent mất 8–40 giây.

- **Chiếm `update_id` TRƯỚC khi trả 200.** Chiếm bên trong `after()` thì một lần gửi lại tới lúc
  lượt đầu còn đang chạy sẽ được xử lý **hai lần**. Khoá chính của `telegram_updates` là toàn bộ cơ
  chế — không cần khoá phân tán, không cần hàng đợi.
- **Làm việc trong `after()`.** Trả lời trước, làm sau.

Đo được: `POST /api/telegram/webhook 200 in 21ms`, và dòng `[telegram] sendMessage…` xuất hiện
**sau** dòng đó trong log. Kiểm lại bằng `curl -w '%{time_total}'` — trên 1 giây là `after()` chưa
được đấu, và Telegram sẽ gửi trùng.

`after()` chạy trong tiến trình và **không bền qua restart**. Chấp nhận được ở đợt này vì không có
thao tác ghi nào: mất một câu trả lời thì chủ trọ thấy ngay và gõ lại. Đợt có tool ghi thì trạng
thái bền nằm ở bảng `agent_pending_actions`, không nằm trong vòng lặp.

Payload hỏng trả **200**, không phải 400: Telegram gửi lại mọi thứ không phải 2xx, mà một payload
hỏng thì gửi lại bao nhiêu lần cũng vẫn hỏng.

## 3. Vấn đề RLS, nói thẳng

Bot không có cookie. `auth.uid()` là `null`, `is_admin()` là `false`, **mọi policy từ chối** — và
kiểu hỏng ở đây là kiểu nguy hiểm nhất: `db.listRooms()` trả `[]` và **không báo lỗi gì**. Một bot
trả lời "nhà trọ không có phòng nào" nghe như một câu trả lời, không nghe như lỗi phân quyền.

**Chọn: service-role + phân quyền ở tầng `lib/mcp/` + audit đầy đủ.**

Repo đã làm đúng thế này rồi và `repository.ts` nói ra miệng ở `listOverdueInvoices`: *"Chạy bằng
service-role key: người gọi duy nhất là job cron nhắc hạn, lúc đó không có ai đăng nhập nên RLS sẽ
trả về 0 dòng nếu dùng client thường."*

| Đã loại | Vì sao |
|---|---|
| Mint phiên Supabase thật cho admin | Phải **cất refresh token** của họ theo từng chat. Rò cái đó ra thì hoạt động sinh ra trông y như một lần đăng nhập hợp lệ — khó phát hiện hơn hẳn rò service key. Và nó mua được đúng **một bảng**: `is_admin()` vốn mở gần hết lược đồ, khoảng cách chỉ là `integration_tokens`, mà không tool nào chạm tới |
| Vai Postgres riêng | Supabase xác thực vai qua claim `role` trong JWT → phải tự ký JWT và tự lo xoay khoá |
| Thêm 18 method service-role vào `Repository` | Nhân đôi interface |

**Bù lại bằng bốn thứ, và chúng phải có mặt cùng lúc:**

- allowlist tool **đóng** (§4) — chỉ đi qua `Repository`, không chỗ nào nhận chuỗi SQL;
- bộ tool đọc **loại hẳn** CCCD / mã cổng / mật khẩu wifi;
- che bớt số điện thoại và CCCD ở `serialize.ts`;
- **`admin_audit_log` ghi mọi lời gọi, kể cả lần đọc** — vì RLS không còn ghi lại gì thay ta nữa,
  đây là bản ghi duy nhất. Nên nó ship ở đợt 1.

### Phần cài đặt: `runAsService`

Helper trong adapter tự gọi `await createClient()` bên trong, nên không truyền client vào được.
Thay vì luồn thêm một tham số qua ~40 helper và 122 method, `src/lib/db/db-client.ts` bọc
`createClient` bằng một `AsyncLocalStorage`, và `supabase-adapter.ts` đổi **đúng một dòng import**.

`runAsService()` là **lối vào duy nhất**, và nó chỉ được gọi từ `src/lib/mcp/run.ts` — ràng buộc
bằng cấu trúc chứ không bằng kỷ luật.

> `AsyncLocalStorage` là thứ ngầm, mà repo này chuộng tường minh. Đánh đổi có thật, và nó được ghi
> ngay trong `db-client.ts` cùng tên ba phương án bị loại.

## 4. Bộ tool

**18 tool, tất cả `readOnly: true`**, mỗi cái map thẳng một method `Repository`: phòng và nhật ký
phòng, người thuê và hợp đồng, hoá đơn và chỉ số điện nước, báo hỏng, tổng quan và báo cáo doanh thu.

### Cố ý KHÔNG có tool

| Bỏ | Vì sao |
|---|---|
| `getLatestIdDocument`, `listIdDocuments`, `listPendingIdDocuments`, `signIdDocumentPhotos` | Số CCCD và ảnh giấy tờ. Một transcript LLM là một **bản sao mới** của dữ liệu đó, nằm trong log của nhà cung cấp và trong lịch sử chat trên một cái điện thoại có thể mất. `signIdDocumentPhotos` còn ghi `id_document_access_log`, mà dưới service-role thì id người xem vô nghĩa |
| `getGateCredential`, `listGateCredentialsToRevoke`, `listGateLocks` | Mã mở được cửa trước |
| `listWifi` | Trả mật khẩu dạng chữ thường |
| `getStorageUsage`, `listPaymentAccounts` | Không câu hỏi nào cầm điện thoại hỏi cần tới |

Che bớt là một **tầng riêng**, không phải hệ quả của việc chọn tool: `listTenants()` vẫn trả `phone`
và `note`, nên `serialize.ts` che số điện thoại, che CCCD còn 4 số cuối, và không cho ghi chú riêng
của chủ trọ về người thuê đi ra khỏi web.

## 5. Prompt injection — năm lớp

`README.md` mục 3.8 đã viết chính mối lo này cho Supabase MCP. Chữ do người thuê nhập tới được model
qua `profiles.full_name`, `profiles.note`, `maintenance_requests.title/description`,
`room_events.content`, `meter_readings.note`, `invoices.note`, và `posts.body`.

1. **Khung cấu trúc.** `serialize.ts` bọc mọi trường tự do trong `<du_lieu_nguoi_thue field="…">`
   và đổi `<` `>` bên trong thành `‹` `›`, nên **không đóng sớm được thẻ bọc**. Cùng nguyên tắc app
   đã áp cho SQL: dữ liệu không bao giờ trở thành cú pháp.
2. **System prompt nói thẳng** rằng nội dung trong thẻ đó là thông tin, không phải chỉ thị — và nếu
   trông như câu lệnh thì báo cho chủ trọ chứ đừng làm theo.
3. **Allowlist đóng.** Không `bash`, không `web_fetch`, không filesystem, không `execute_sql`.
   **Model không bao giờ sinh câu truy vấn** — mọi tool đi qua `Repository`, và args đã zod-parse
   trước khi handler nhìn thấy. Đây là khác biệt cấu trúc so với Supabase MCP: server đó đưa cho
   model một ô SQL tự do, registry này không có ô nào để đưa.
4. **Che bớt trước khi tới model** (§4). Trần của một lần rò rỉ thành công là dữ liệu người thuê
   phần lớn vốn đã có.
5. **Không giữ ngữ cảnh giữa các tin nhắn.** Mỗi tin là một mảng `messages` mới, nên một ngữ cảnh đã
   bị đầu độc **không sống sang câu hỏi sau**.

Rủi ro còn lại, nói thẳng: một mô tả báo hỏng dàn dựng khéo vẫn có thể khiến bot **nói** một câu sai
lệch. Chấp nhận — chỉ một người đọc, và ở đợt này không có gì hành động theo nó.

## 6. Vòng lặp agent

`@anthropic-ai/sdk` + `client.beta.messages.toolRunner`. **Không** dùng
`@anthropic-ai/claude-agent-sdk` — cái đó là Claude Code đóng gói thành thư viện, kèm
Read/Write/Bash/Glob và một harness filesystem; không thứ nào thuộc về một bot nhà trọ.

| Tham số | Giá trị | Lý do |
|---|---|---|
| `model` | `claude-opus-5` | |
| `output_config.effort` | `low` | Tra cứu rồi tóm tắt, không phải viết code. Token suy nghĩ tính tiền như output → đòn bẩy chi phí lớn **thứ hai** |
| `thinking` | **không khai** | Opus 5 chạy adaptive mặc định |
| `cache_control` | trên nửa **tĩnh** của system prompt | Thứ tự render là `tools` → `system` → `messages`, nên 18 schema tool + quy tắc tĩnh thành một prefix ~3.000 token. Dòng ngày tháng nằm **sau** breakpoint để không vô hiệu cache mỗi ngày. Đòn bẩy chi phí **lớn nhất** |
| `fallbacks` | `"default"` + beta `server-side-fallback-2026-07-01` | Opus 5 có thể trả `stop_reason: "refusal"` kèm HTTP 200 — không có fallback thì đó là một ô trống im lặng trong cửa sổ chat |
| `max_iterations` | 8 | |
| `max_tokens` | 8.000 | |
| streaming | **không** | Câu trả lời là một `sendMessage`, không phải UI gõ-trực-tiếp. Thay bằng `sendChatAction: "typing"` |
| `pause_turn` | **không xử lý** | Registry không có server tool nào. Thêm một cái thì phải đọc lại chỗ này |

## 7. Chi phí và trần

Opus 5: **$5 / MTok input · $25 / MTok output**; đọc cache 0,1× input. Prefix cố định ~3.000 token.

| Loại câu | Tiền |
|---|---|
| Đọc đơn giản ("còn phòng trống không") | ≈ $0,017 |
| Đọc có danh sách ("ai còn nợ tiền") | ≈ $0,023 |
| Nặng (báo cáo doanh thu, 4 lần gọi tool) | ≈ $0,063 |

30 câu/ngày ≈ **$0,65/ngày ≈ $20/tháng** (~500k VNĐ). **Không có prompt caching thì cùng lượng đó
chạy cao hơn ~2,5 lần.**

Bốn lớp chặn:

1. `max_iterations: 8` — chặn ping-pong tool trong **một** request.
2. `max_tokens: 8.000` — chặn một lần sinh dài bất thường.
3. **Trần USD/ngày mỗi người** (`TELEGRAM_AGENT_DAILY_USD`, mặc định `1.00` ≈ 45 câu). **Đây là thứ
   `max_iterations` không cho được** — một chuỗi tin nhắn riêng lẻ vẫn tốn tiền, và đó mới là cách
   hoá đơn chạy mất kiểm soát qua đêm.
4. Trần 200 lượt/ngày — chặn một client kẹt trước khi nó kịp tốn tiền.

Thiếu biến ngân sách thì rơi về **1,00 USD, không phải vô hạn**. Một ngân sách vắng mặt mà hiểu là
"không giới hạn" là cách người ta biết chuyện qua email hoá đơn.

Cố ý **không** dùng `output_config.task_budget`: `total` tối thiểu là 20.000 token, cao hơn một lượt
điển hình ở đây, nên nó không bao giờ có tác dụng.

## 8. Biến môi trường

| Biến | Thiếu thì sao |
|---|---|
| `TELEGRAM_BOT_TOKEN` | fail-**soft** cho app (tab hiện checklist), fail-**closed** cho webhook (503) |
| `TELEGRAM_WEBHOOK_SECRET` | **503**. Copy nguyên lập luận `authorizeCron`: một webhook admin không xác thực **là** một bảng điều khiển admin mở toang |
| `TELEGRAM_BOT_USERNAME` | fail-soft; không phải bí mật nên đọc lúc nạp module được. Thiếu thì trang cài đặt hiện mã trần thay vì link bấm được |
| `ANTHROPIC_API_KEY` | fail-soft — bot vẫn liên kết tài khoản và trả lời `/help`, chỉ không trả lời câu hỏi tự do. **Đừng đổi tên**: SDK tự đọc đúng tên này |
| `TELEGRAM_AGENT_DAILY_USD` | rơi về `1.00`, **không** về vô hạn |

`houseConfig.features.assistant` là công tắc thứ hai: cờ quyết định tab **hiện**, env quyết định nó
**chạy**. Cùng mẫu với `smartGate`.

## 9. Chưa làm — đợt sau

**Tool ghi + cổng xác nhận.** Thiết kế đã chốt:

- Tool `readOnly: false` **không ghi gì** — nó chèn một hàng `agent_pending_actions` và trả cho
  model câu *"đã gửi yêu cầu xác nhận, CHƯA thực hiện"*.
- Bot gửi thẻ kèm `inline_keyboard`. **`callback_data` trần 64 byte**, nên chỉ id đi trong đó; mọi
  ngữ cảnh nằm ở hàng database.
- Bấm ✅ → `answerCallbackQuery` trong **~10 giây** (không thì client quay vòng mãi) → làm việc trong
  `after()`.
- Dùng-một-lần là một câu `UPDATE … WHERE decided_at IS NULL AND expires_at > now()`, không phải một
  transaction ôm cả vòng đi-về của Telegram. Zero dòng trả về ⇒ bấm đúp, hết hạn, hoặc id người khác.
- **Model không nằm trong bước thực thi.** Handler của nút đọc args đã lưu, không đọc lại output của
  model. Đó là toàn bộ điểm của thiết kế.
- Bốn tool ghi đầu tiên: ghi chỉ số, lập hoá đơn nháp, ghi nhận đã thu, đổi trạng thái báo hỏng.
- ⚠️ **Phải quyết trước:** `ghi_nhan_da_thu` là cái khó đảo ngược nhất — **cả app không có thao tác
  "bỏ đánh dấu đã thu"**. Hoặc thêm một action huỷ-đã-thu cho admin trước, hoặc ship ba tool kia thôi.

**MCP qua HTTP.** Cùng registry, transport thứ hai: `mcp-handler@^2` + `@modelcontextprotocol/server@^2`
mount ở `/api/mcp`, xác thực bằng PAT băm trong bảng `api_tokens` (bảng MỚI — `integration_tokens`
giữ token **đi ra** và lưu nguyên văn, PAT là token **đi vào** và phải băm). Claude Code gắn được
bằng bearer; Claude Desktop cần cầu `mcp-remote`.

## 10. Kiểm chứng

```bash
# fail-closed
curl -i -X POST $URL/api/telegram/webhook -d '{"update_id":1}'                      # 401
curl -i -X POST $URL/api/telegram/webhook \
  -H 'X-Telegram-Bot-Api-Secret-Token: sai' -d '{"update_id":1}'                    # 401
# bỏ TELEGRAM_WEBHOOK_SECRET khỏi env rồi restart                                   # 503

# chống trùng: cùng update_id hai lần -> lần hai trả {"duplicate":true}

# ĐỘ TRỄ — phép đo dễ sai nhất
curl -o /dev/null -w '%{time_total}\n' -X POST … # phải < 0.2s dù trả lời tới sau 15s

# proxy không nuốt endpoint
curl -s -o /dev/null -w '%{http_code}' $URL/api/telegram/webhook   # KHÔNG được là 307

npm run telegram:webhook -- --info    # pending_update_count 0, không last_error_message
```

Chạy thử khi chưa deploy: `npm run telegram:dev` (long-poll về `localhost`). **Dùng một bot BotFather
thứ hai cho dev** — `getUpdates` và webhook loại trừ nhau, script gọi `deleteWebhook` khi khởi động.

Script polling **không** tái hiện được ngữ nghĩa gửi-lại của Telegram và không thử được ca
sai-secret; trước khi deploy vẫn nên chạy một lần qua tunnel thật như smoke test.

---

Quay lại [mục lục](README.md).
