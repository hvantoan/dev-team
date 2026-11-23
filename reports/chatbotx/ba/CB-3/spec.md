# Spec — CB-3

- **Ticket:** CB-3 — Hạ tầng: deploy Zalo Personal Gateway + connect channel + spike nhóm (Epic: CB-2)
- **Project:** `chatbotx` (`/home/vif/workspace/ChatbotX`)
- **Trạng thái:** DRAFT — chờ PO (anh Văn Toàn) clear `spec.md` (Jira CB-3 đang `To Do`, label `idea`; **không tự clear**)
- **Ngày viết:** 2026-11-23
- **Nguồn tham chiếu:**
  - `reports/chatbotx/ba/CB-2/refinement.md` (Story CB-3 — Đợt 1)
  - `/home/vif/workspace/ChatbotX/plans/tasks/cb-2-he-thong-chat-zalo-personal-tu-van-ai.md` (mục CB-3)
  - `/home/vif/workspace/ChatbotX/plans/reports/advise-261122-2344-zalo-personal-ai-chatbot.md` (mục 2.1, 8, 9)
  - `/home/vif/workspace/ChatbotX/plans/journals/2026-11-22-zalo-personal-survive-gateway-restarts-route-ws-locally.md`
  - `/home/vif/workspace/ChatbotX/plans/journals/2026-11-22-zalo-personal-group-history-backfill.md`
  - `/home/vif/workspace/ChatbotX/AGENTS.md` và mã nguồn read-only tại `/home/vif/workspace/ChatbotX`

---

## Mục tiêu nghiệp vụ

Đưa kênh **Zalo Personal** (`zalo-personal`) vào trạng thái sẵn sàng và ổn định cho toàn bộ pipeline Đợt 1 của Epic CB-2:
1. Vận hành `apps/zalo-personal-gateway` ổn định (phiên đăng nhập Zalo sống sót qua restart gateway nhờ cron khôi phục 60s và send gate 409).
2. Kết nối đúng 1 nick Zalo cá nhân vào workspace mục tiêu, chạy **Sync** để tạo contact nhóm `group:<threadId>`, và khoá chế độ nhóm ở `groupReplyConfig = { mode: "disabled" }` để AI không trả lời vào nhóm.
3. Thực hiện **Spike Ngày 1** kiểm chứng 2 giả định nền: (a) broadcast `now` có gửi được tới contact `group:<id>` hay không; (b) nhắn vào nhóm khi `groupReplyConfig=disabled` chắc chắn không tạo job AI.

---

## Phân tách Config vs Code

| Hạng mục | Bản chất | Hiện trạng trong `/home/vif/workspace/ChatbotX` |
|---|---|---|
| Gateway service & Docker profile | **Infra / Config** (đã có code) | `/home/vif/workspace/ChatbotX/apps/zalo-personal-gateway` + profile `zalo-personal` trong `docker-compose.yml:110-143` (port `3220`, `/health`) |
| Tự khôi phục phiên sau restart | **Đã có code** (verify vận hành) | Cron 60s `restore-zalo-personal-sessions.ts` → `ensureZaloPersonalSession`; send gate 409 defer (5s/10s/20s/40s, max 4) ở `zalo-personal-send-gate.ts` |
| Webhook HMAC + `groupReplyConfig=disabled` | **Config channel** (đã có code) | `integrations/zalo-personal/src/handlers/webhook.ts` fail-closed nếu thiếu `webhookSecret`; `mode="disabled"` trả `"ok"` ngay tại webhook, không enqueue |
| Sync tạo contact `group:<id>` | **Thao tác vận hành / Config** | `POST /v1/zalo-personal-channels/{id}/sync` (`manage-zalo-personal.ts:101-126`) + `backfillGroupHistory` (`session-manager.ts`); `isHistorySync` gắn `suppressAutomation: true` |
| Spike broadcast `now` vào `group:<id>` | **Kiểm chứng (không sửa code trước)** | `broadcasts/schema/action.ts:152` & `docs/broadcasts.md` mặc định lọc contact đã có DM; `outgoing-message.ts` đã map `group:` → `threadType: "group"` |
| Phát sinh sửa code (chỉ nếu Spike/Sync vướng) | **Ngoài config CB-3** (cần báo SM/PO) | Nếu broadcast không tới được `group:` → đổi kiến trúc nhắc lịch sang API gửi tin trực tiếp; nếu `getCloudMessage` rỗng khiến nhóm K chưa có contact `group:` → cần bổ sung endpoint/luồng import danh sách nhóm từ `getAllGroups` |

---

## Phạm vi (Scope Allow / Deny — đường dẫn tuyệt đối)

### Tài liệu & mã nguồn tham chiếu / phạm vi được phép (Allow)
- **Triển khai/cấu hình & chạy kiểm chứng trên gateway + channel (theo môi trường được PO chỉ định, không sửa code ứng dụng):**
  - `/home/vif/workspace/ChatbotX/apps/zalo-personal-gateway/src/index.ts`
  - `/home/vif/workspace/ChatbotX/apps/zalo-personal-gateway/src/server.ts`
  - `/home/vif/workspace/ChatbotX/apps/zalo-personal-gateway/src/session-manager.ts`
  - `/home/vif/workspace/ChatbotX/apps/zalo-personal-gateway/src/lock.ts`
  - `/home/vif/workspace/ChatbotX/docker-compose.yml` (service `zalo-personal-gateway`, dòng 110–143)
  - `/home/vif/workspace/ChatbotX/scripts/stack-up.sh` (profile `zalo-personal`)
  - `/home/vif/workspace/ChatbotX/integrations/zalo-personal/src/handlers/webhook.ts`
  - `/home/vif/workspace/ChatbotX/integrations/zalo-personal/src/handlers/message/incoming-message.ts`
  - `/home/vif/workspace/ChatbotX/integrations/zalo-personal/src/handlers/message/outgoing-message.ts`
  - `/home/vif/workspace/ChatbotX/apps/builder/src/features/integration-zalo-personal/api/public.ts`
  - `/home/vif/workspace/ChatbotX/apps/builder/src/features/integration-zalo-personal/lib/manage-zalo-personal.ts`
  - `/home/vif/workspace/ChatbotX/apps/builder/src/features/broadcasts/schema/action.ts`
  - `/home/vif/workspace/ChatbotX/apps/worker/src/lib/zalo-personal-session.ts`
  - `/home/vif/workspace/ChatbotX/apps/worker/src/schedule/handlers/restore-zalo-personal-sessions.ts`
  - `/home/vif/workspace/ChatbotX/apps/worker/src/chat/utils/zalo-personal-send-gate.ts`
  - `/home/vif/workspace/ChatbotX/docs/broadcasts.md`
- **Artifact báo cáo của BA/Dev/QA:**
  - `/home/vif/tuanvu/dev-team/reports/chatbotx/ba/CB-3/spec.md`
  - `/home/vif/tuanvu/dev-team/reports/chatbotx/dev/CB-3/handoff.md` (khi Dev thực thi)
  - `/home/vif/tuanvu/dev-team/reports/chatbotx/qa/CB-3/verdict.md` (khi QA verify)

### Ngoài scope / Non-goals (Deny)
- **Không** sửa code nghiệp vụ ChatbotX (AI tư vấn, Master Agent UI, endpoint mới list bạn bè/nhóm) trong ticket CB-3; nếu Spike Ngày 1 chứng minh broadcast không gửi được tới `group:`, dừng lại báo SM/PO để mở/điều chỉnh scope.
- **Không** bật `groupReplyConfig` sang `all` / `allowlist` / `mentions` trên môi trường production.
- **Không** bật `selfListen` (mirror tin từ app điện thoại) hay sửa logic webhook echo trong CB-3.
- **Không** dùng nhóm học viên thật (K3, K4, Tổng) để bắn thử tin nhắn Spike Ngày 1.
- **Cấm tuyệt đối:** Không chạy lệnh `down`, `kill`, `restart` hay chỉnh sửa trực tiếp trên stack container `chatbotx-*` đang chạy của anh Toàn khi chưa được PO cho phép/chỉ định rõ môi trường.

---

## Acceptance Criteria

| # | AC | Vai trò/user | Cách kiểm |
|---|---|---|---|
| AC1 | **Gateway sống sót qua restart:** Service `zalo-personal-gateway` báo `healthy` (`/health` = 200); sau khi restart container gateway (chỉ thực hiện trên môi trường test/được cấp phép), trong vòng ~60s (hoặc khi có thao tác gửi qua send gate 409) `ensureZaloPersonalSession` tự khôi phục trạng thái `running`/`connected` mà không cần quét QR lại | Ops / Dev / QA | Kiểm tra `/accounts/:uid/status` trước và sau restart gateway; kiểm tra log `Restored Zalo personal gateway session` |
| AC2 | **Nick giữ phiên ổn định & webhook bảo mật:** Nick Zalo kết nối thành công qua `zalo-personal`, `webhookSecret` hợp lệ (fail-closed), tin nhắn DM 1-1 đến/đi qua gateway ổn định và không bị văng phiên do gọi trùng `/accounts/start` | Ops / QA | Gửi/nhận thử DM 1-1 với tài khoản test; kiểm tra trạng thái phiên không chuyển `error` |
| AC3 | **Contact `group:<id>` được tạo sau Sync (không kích hoạt AI):** Bấm Sync (hoặc `POST /v1/zalo-personal-channels/{id}/sync`) tạo được contact nhóm dạng `sourceId = "group:<threadId>"` (kèm ghi nhận trường hợp nhóm ít tin nhắn mà `getCloudMessage` trả rỗng) và không phát sinh automation/AI reply trong quá trình Sync | Ops / QA | Kiểm tra danh sách contacts có bản ghi `group:<threadId>`; kiểm tra `suppressAutomation` / không có outgoing message AI khi Sync |
| AC4 | **Chặn tuyệt đối AI trong nhóm (`groupReplyConfig=disabled`):** Khi đặt `groupReplyConfig = { mode: "disabled" }`, gửi tin nhắn bất kỳ (kể cả có từ khoá hoặc `@mention`) vào nhóm trên Zalo sẽ bị bỏ qua ngay ở `webhook.ts`, **0 job `incomingMessage`** được tạo trong worker và **0 tin outgoing AI** được gửi vào nhóm | Security / QA | Nhắn vào nhóm test → kiểm tra log webhook/queue & lịch sử hội thoại nhóm không có job/trả lời AI |
| AC5 | **Spike Ngày 1 — Broadcast `now` tới `group:<id>`:** Thực hiện gửi 1 broadcast `schedulesType = "now"` nhắm tới duy nhất contact nhóm test `group:<testGroupId>` (ghi nhận rõ kết quả với filter mặc định vs filter `lastInteraction` theo `docs/broadcasts.md`) và kèm báo cáo đạt/không đạt cùng hướng xử lý nếu FAIL | PO / Dev / QA | Thực hiện đúng quy trình chạy & rollback bên dưới; đính kèm bằng chứng kết quả gửi tin vào nhóm test |

---

## Rule nghiệp vụ

1. **Một workspace, một nick Zalo:** Theo `CB-2`, toàn bộ hệ thống chạy trên 1 workspace và 1 nick Zalo cá nhân; chỉ đặt 1 `groupReplyConfig` cho channel là `mode: "disabled"`.
2. **Bảo vệ phiên đăng nhập (anti-kick):** Không tự ý gọi `/accounts/start` lặp lại khi phiên đang `disconnected` hoặc `error` (để `ensureZaloPersonalSession` xử lý đúng rule: chỉ start khi `tracked === false`).
3. **An toàn stack live của owner:** Trước mọi thao tác hạ tầng, kiểm tra `docker compose ps`; nếu stack `chatbotx-*` của anh Toàn đang chạy trên port cố định (`3123`, `25432`, `26379`, `3220`), **không** kill hoặc reset DB/Redis của owner.
4. **Quy tắc Sync lịch sử nhóm:** `backfillGroupHistory` giới hạn 200 tin/nhóm và phụ thuộc dữ liệu `getCloudMessage` từ Zalo; nếu nhóm mục tiêu (K3/K4/Tổng) không có tin trả về từ Sync, ghi nhận rõ ràng làm cơ sở quyết định bước tiếp (tin mồi có kiểm soát hoặc bổ sung API import từ `getAllGroups`).

---

## Steps / Hướng dẫn chạy & rollback Spike Ngày 1

### A. Chuẩn bị & cấu hình (AC1 → AC4)
1. Xác nhận môi trường/stack được PO cấp phép thao tác (tách biệt hoặc dùng có kiểm soát trên stack đã dựng); kiểm tra `zalo-personal-gateway` health (`/health`).
2. Connect nick Zalo theo chỉ định của PO; kiểm tra `webhookSecret` được sinh và lưu bình thường.
3. Cập nhật cấu hình channel `groupReplyConfig = { mode: "disabled" }` (`PATCH /v1/zalo-personal-channels/{id}` hoặc UI).
4. Chạy `Sync` (`POST /v1/zalo-personal-channels/{id}/sync`), kiểm tra các contact `group:<threadId>` xuất hiện (đặc biệt nhóm test dùng cho Spike).
5. Test nhắn vào nhóm test khi `disabled` → xác nhận không sinh job `incomingMessage` và không có AI reply.
6. Test khởi động lại chỉ service `zalo-personal-gateway` (trên môi trường test được phép) → xác nhận cron 60s / send gate khôi phục phiên thành công.

### B. Cách chạy Spike Ngày 1 (AC5 — Broadcast `now` tới `group:`)
1. Chọn **1 nhóm Zalo test nội bộ** (tuyệt đối không chọn nhóm học viên K3/K4 hoặc nhóm Tổng), ghi nhận `testGroupId` và contact `group:<testGroupId>`.
2. Kiểm tra `contactFilter` nhắm **chính xác duy nhất** contact `group:<testGroupId>` (dùng preview recipient count trên UI hoặc API để chắc chắn `recipientCount` chỉ chọn đúng 1 nhóm test — không bắn nhầm toàn bộ danh bạ).
3. **Lần thử 1 (filter mặc định — không có `lastInteraction`):** Tạo broadcast `schedulesType = "now"` với nội dung test (vd: `[SPIKE CB-3] Test broadcast group - vui long bo qua`), kiểm tra xem contact `group:<testGroupId>` có nằm trong audience mặc định hay bị loại (vì mặc định broadcast chỉ lấy contact đã có DM theo `docs/broadcasts.md`).
4. **Lần thử 2 (nếu lần 1 audience = 0, thử thêm điều kiện `lastInteraction` theo `docs/broadcasts.md`):** Tạo broadcast `now` nhắm riêng contact `group:<testGroupId>` với điều kiện `lastInteraction` (`isNotEmpty` hoặc `isEmpty` tuỳ trạng thái contact).
5. Ghi lại kết quả thực tế:
   - Broadcast status (`sent`/`failed`), số recipient, và tin nhắn có hiển thị thực tế trong nhóm test trên app Zalo không.
   - Nếu **FAIL** (không gửi được vào nhóm qua Broadcast), ghi rõ lỗi/hành vi vào `handoff.md` / `verdict.md` để SM & PO chuyển kiến trúc nhắc lịch (CB-4/CB-5/CB-6/CB-7) sang gọi API gửi tin trực tiếp tới conversation nhóm.

### C. Cách rollback sau Spike Ngày 1
1. Nếu broadcast đang ở trạng thái chuẩn bị/gửi: chuyển broadcast về nháp (`Move back to draft` theo `docs/broadcasts.md`) để dừng chuẩn bị và dọn recipient, hoặc xoá/đánh dấu archived broadcast test.
2. Trên ứng dụng Zalo của nick test: thu hồi/xoá tin nhắn `[SPIKE CB-3]` trong nhóm test nếu cần làm sạch lịch sử.
3. Nếu trong quá trình test tạo contact `group:<testGroupId>` có bật tạm `groupReplyConfig`, **bắt buộc** kiểm tra và đặt lại `groupReplyConfig = { mode: "disabled" }` trước khi kết thúc.
4. Nếu dùng chung workspace staging/prod, xoá contact nhóm test (nếu không giữ dùng lại cho QA) và ghi rõ trạng thái sạch vào report bàn giao.

---

## Trường hợp biên & ngoại lệ

- **Nhóm Zalo chưa có tin nhắn trên cloud (`getCloudMessage` trả rỗng):** Sync không tự tạo được contact `group:<id>` (`2026-11-22-zalo-personal-group-history-backfill.md`). Cần ghi nhận rõ nhóm nào thiếu contact `group:` để xử lý trước khi lên lịch nhắc K3/K4.
- **Độ trễ khôi phục phiên 60s:** Trong khoảng <60s ngay sau khi gateway restart, tin nhắn gửi đi có thể gặp HTTP `409 session_not_connected` — send gate sẽ tự park job và thử lại sau 5s/10s/20s/40s (tối đa 4 lần), không đánh fail ngay.
- **Tin nhắn gửi từ app Zalo điện thoại (`isSelf && !isHistorySync`):** Webhook hiện bỏ qua (`webhook.ts:77-79`), nên tư vấn viên/admin không dùng app điện thoại để trả lời khách.

---

## Rủi ro

1. **Rủi ro khoá nick Zalo (API unofficial `zca-js`):** Đăng nhập lại liên tục, chạy nhiều phiên song song hoặc gửi tin hàng loạt có thể bị Zalo đá phiên hoặc khoá nick. Cần nick dự phòng và người phụ trách quét lại QR.
2. **Rủi ro Broadcast không gửi được vào `group:`:** `broadcasts/schema/action.ts:152` và `docs/broadcasts.md` thiết kế mặc định cho contact có DM; kết quả Spike Ngày 1 quyết định trực tiếp kiến trúc nhắc lịch của CB-4/CB-5/CB-6/CB-7.
3. **Rủi ro đụng stack live của owner:** Container `chatbotx-*` đang chạy trên máy host dùng các port cố định (`3123`, `25432`, `26379`, `3220`); mọi thao tác restart/env phải tránh làm gián đoạn stack đang chạy của anh Toàn.

---

## Done when (Điều kiện hoàn thành CB-3)

- Báo cáo thực thi (`dev/CB-3/handoff.md` hoặc report vận hành) + kết quả verify độc lập (`qa/CB-3/verdict.md`) đạt **PASS** cho AC1 → AC4.
- Có kết luận rõ ràng bằng chứng thực nghiệm cho **Spike Ngày 1 (AC5)** (PASS gửi được broadcast tới `group:` hay FAIL cần đổi kiến trúc) và đã thực hiện rollback sạch dữ liệu test.

---

## Cập nhật docs sau khi DONE

- [ ] SRS / Ops runbook: `docs/chatbotx/srs/zalo-personal-channel.md` (hoặc runbook tương ứng) — ghi cấu hình `groupReplyConfig=disabled`, cơ chế khôi phục phiên, giới hạn `getCloudMessage` khi Sync, và kết luận cách gửi tin vào nhóm `group:` từ kết quả Spike.

---

## Open Questions (cần PO clear trước khi triển khai)

1. **Môi trường & stack thực thi:** Dev/QA được phép test/restart `zalo-personal-gateway` trên stack nào (tách môi trường/profile test riêng hay thao tác trên stack đang chạy của anh Toàn vào khung giờ chỉ định)?
2. **Tài khoản Zalo & nhóm test Spike:** Dùng nick Zalo test hay nick production ngay cho CB-3; nhóm Zalo test nào dùng để chạy Spike Ngày 1; ai là người phụ trách quét lại QR khi mất phiên?
3. **Phương án nếu nhóm K3/K4/Tổng bị rỗng `getCloudMessage` khi Sync:** Nếu Sync không tạo ra contact `group:` cho nhóm K3/K4/Tổng, PO chọn gửi 1 tin mồi có kiểm soát hay ưu tiên mở scope thêm endpoint import danh sách nhóm từ `getAllGroups`?
