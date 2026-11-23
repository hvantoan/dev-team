# Refinement — CB-2 (Epic: Hệ thống chat Zalo Personal)

- **Epic:** CB-2 — https://vtxsolution.atlassian.net/browse/CB-2
- **Loại / Trạng thái Jira:** Epic / `To Do`, label `idea`, **0 comment**, assignee Hồ Văn Toàn
- **Children & Subtasks:** Children `CB-1`, `CB-3..CB-11`; Subtasks `CB-12..CB-17`
- **Project:** `chatbotx` (`/home/vif/workspace/ChatbotX`)
- **Sprint:** `2026-W48` (`reports/chatbotx/orchestrator/2026-11-23-cb2-refine-cb1/plan.md`)
- **Trạng thái tài liệu:** DRAFT — chờ PO (anh Văn Toàn) review, chốt thứ tự & clear; **không tự clear**
- **Ngày viết:** 2026-11-23
- **Nguồn:**
  - `reports/chatbotx/orchestrator/2026-11-23-cb2-refine-cb1/jira-context.md`
  - `/home/vif/workspace/ChatbotX/plans/tasks/cb-2-he-thong-chat-zalo-personal-tu-van-ai.md`
  - `/home/vif/workspace/ChatbotX/plans/reports/advise-261122-2344-zalo-personal-ai-chatbot.md`

---

## 1. Bối cảnh & 4 mục tiêu của Epic CB-2

Trên **một workspace ChatbotX** và **một nick Zalo cá nhân** (kênh `zalo-personal`):
1. **AI tư vấn & chốt 3 khoá học qua DM:** K1 Đồng hành làm chủ thương hiệu Viral, K2 Video quay sẵn Xác định Thương Hiệu tạo chuyển đổi, K3 Đồng hành 1:1 3–6 tháng VIP; ngoài khả năng thì chuyển cho tư vấn viên qua Inbox ChatbotX.
2. **Nhắc lịch định kỳ vào các nhóm khoá:** Zoom, bài tập, lịch học; dùng chung cho K3, K4 và khoá mới K5, K6, K7 (với `groupReplyConfig=disabled` để AI không trả lời trong nhóm; contact nhóm tạo qua Sync lịch sử).
3. **Master agent cùng workspace (bắt buộc có UI):** Trợ lý chat trực tiếp trên trang ChatbotX (chỉ dành cho thành viên), gửi tóm tắt sau buổi zoom để agent tạo/sửa nhắc lịch (nháp) và mẫu tin; không qua Zalo/Telegram, không dùng phương án tạm CLI/MCP.
4. **Tin số clip hằng tuần & báo cáo nhóm Tổng:** Số liệu từ Google Sheet do trợ giảng điền tay (không đếm link trong nhóm); mỗi tuần gửi 1 tin gộp mỗi nhóm với mục tiêu riêng từng học viên; báo cáo ngày/tuần vào nhóm Tổng.

> **Gate Jira CB:** Project CB chỉ có `To Do` / `In Progress` / `Done` (không có `READY TO DEVELOP`). Gate = assignee PO + `In Progress` (+ PO clear).

---

## 2. Cắt Epic thành Story & Thứ tự thực hiện

### Đợt này (Tuần tới) — Thứ tự theo ticket: `CB-3` → `CB-5` → `CB-4` → `CB-8`, `CB-1` song song

| Thứ tự | KEY | Mục tiêu | AC tóm tắt | Phụ thuộc | Config vs Code |
|---|---|---|---|---|---|
| 1 | **CB-3** — Hạ tầng gateway + connect channel + spike nhóm | Dựng `apps/zalo-personal-gateway`, connect nick production, Sync lịch sử để có contact `group:`, đặt `groupReplyConfig=disabled` | 1) Gateway sống sót qua restart, nick giữ phiên ổn định; 2) Contact `group:<id>` tồn tại sau Sync; 3) Nhắn vào nhóm khi `disabled` không tạo job AI; 4) **Test ngày 1:** xác minh broadcast gửi được vào contact `group:` | Không (tiên quyết cho `CB-4`/`CB-5`/`CB-6`/`CB-7`) | **Infra + Config** (chỉ code nếu phát hiện lỗi gateway hoặc broadcast không gửi được vào `group:` phải đổi kiến trúc) |
| 2 | **CB-5** — AI tư vấn 3 khoá (DM) + handoff + nhắc lịch định kỳ K3/K4 | Cấu hình default agent tư vấn 3 khoá qua DM (provider OpenAI-compatible), AI Files, `actionRules`, chuyển tư vấn viên + push, và broadcast `recurring` cho K3/K4 | 1) AI trả lời đúng kiến thức 3 khoá qua DM; 2) Gọi `connectUserToHuman` → trigger `conversationTransferredToHuman` → `assignConversation` gửi push cho tư vấn viên; 3) Tư vấn viên trả lời trên Inbox ChatbotX (không trên app Zalo điện thoại) và có quy trình bật lại bot; 4) Broadcast `recurring` (`Asia/Saigon`) chạy cho K3/K4 | Phụ thuộc **CB-3**; hưởng lợi từ **CB-1** (mã hoá `apiKey` production) | **Config + Quy trình** |
| 3 | **CB-4** — Master agent cùng workspace (UI bắt buộc + Public API) | Cho phép trợ lý chat với master agent (`isDefault=false`) trên trang members-only của ChatbotX để biến tóm tắt zoom thành broadcast nhắc lịch nháp (bấm Xác nhận mới lên lịch) | 1) Public API procedure (Invariant 23) + trang chat members-only (`workspaceAuthorizedMidddleware`), ngoài workspace trả 401/403; 2) Worker chạy agent chỉ tạo/sửa broadcast **nháp** (`listGroups`, `listReminders`, `draftReminder`, `updateReminderDraft`, `stopReminder`), không có tool `schedule`/`send`/`delete`; 3) Nút Xác nhận gọi `/v1/broadcasts/{id}/schedule`; 4) Dùng cho K5/K6/K7 không cần sửa code; 5) Bảng lịch sử chat mới có `workspaceId`, FK index, workspace purge | Phụ thuộc **CB-3**; SQL migration bảng chat **phải chờ PO duyệt** trước khi `db:migrate` | **Cần code mới** (DB migration + Business service/tools + Worker + Public API + UI + i18n; rủi ro trễ cao) |
| 4 | **CB-8** — Vận hành & giám sát `zalo-personal` | Phát hiện sớm mất phiên Zalo và chuẩn hoá xử lý sự cố | 1) Cảnh báo khi gateway `disconnected`; 2) Runbook đổi nick / quét lại QR; 3) Kiểm soát tần suất gửi nhóm giảm rủi ro khoá nick | Phụ thuộc **CB-3** | **Cần code nhẹ** (cảnh báo disconnect) + **Runbook** |
| // | **CB-1** — OpenAI-compatible Public API + mã hoá `apiKey` + SSRF | Xem `reports/chatbotx/ba/CB-1/spec.md` | Xem `CB-1/spec.md` | Độc lập, chạy **song song** để bảo vệ `apiKey` (2 PR + migration/backfill chờ PO duyệt) | **Cần code** |

### Đợt sau (Ngay sau tuần tới) — `CB-6`, `CB-7`

| Thứ tự | KEY | Mục tiêu | AC tóm tắt | Phụ thuộc | Config vs Code |
|---|---|---|---|---|---|
| 5 | **CB-6** — Google Sheet → đối chiếu tên Zalo & tin số clip gộp | Đọc Sheet do trợ giảng nhập tay, đối chiếu tên Zalo trên dữ liệu đã Sync, báo tên không khớp/trùng, tạo 1 broadcast tin gộp mỗi nhóm K với mục tiêu riêng từng học viên | 1) Đọc đúng link & cột Sheet PO cung cấp; 2) Phát hiện và báo tên Zalo không khớp/trùng; 3) Render 1 tin gộp đúng số clip & mục tiêu riêng từng người; 4) Master agent dùng chung hàm soạn tin | Phụ thuộc **CB-3** + PO cung cấp Sheet/cột; cân nhắc endpoint gateway liệt kê thành viên nhóm | **Cần code mới** (script ngoài + endpoint gateway nếu cần) |
| 6 | **CB-7** — Báo cáo ngày/tuần vào nhóm Tổng | Tổng hợp chỉ số qua Analytics Public API và gửi báo cáo ngày/tuần vào nhóm Tổng | 1) Contact nhóm Tổng tồn tại qua Sync; 2) Báo cáo gửi đúng nhóm Tổng, đúng lịch | Phụ thuộc **CB-3**, **CB-6** (nếu gộp số clip tuần) | **Cần code mới** (script ngoài gọi Public API) |

### Mapping các key còn lại thuộc Epic CB-2 (`CB-9..CB-11`, `CB-12..CB-17`)

- **CB-9** (trước đây là MCP server nội bộ cho admin agent): theo mô tả mới của Epic CB-2, vai trò admin agent đã chuyển thành **CB-4 Master Agent có UI trong cùng workspace** — cần PO xác nhận đóng/gộp CB-9.
- **CB-10, CB-11 (children) và CB-12..CB-17 (subtasks):** Chưa có chi tiết phạm vi riêng trong bộ phân tích CB-2 hiện tại; cần PO/SM rà soát để gộp dưới `CB-3`/`CB-4`/`CB-5` hoặc giữ cho đợt sau.

---

## 3. Rủi ro chính

- **Broadcast tới contact `group:` (`CB-3` test ngày 1):** `broadcasts/schema/action.ts:152` mặc định chỉ lọc contact có DM. Nếu broadcast không gửi được tới `group:`, toàn bộ `CB-4`/`CB-5`/`CB-6`/`CB-7` phải chuyển sang API gửi tin trực tiếp kèm lịch chạy riêng.
- **Tiến độ `CB-4` (Master Agent UI):** Chưa có UI chat nội bộ trong builder; PO đã chấp nhận rủi ro trễ cao và không dùng phương án tạm CLI/MCP.
- **Kênh Zalo cá nhân unofficial:** Rủi ro khoá nick nếu gửi quá dày; tư vấn viên phải trả lời qua Inbox ChatbotX vì webhook drop tin `isSelf` live.

---

## 4. Câu hỏi mở (Open Questions) cần PO chốt

1. **Xử lý `CB-9..CB-17`:** PO xác nhận đóng/bỏ `CB-9` theo `CB-4` hay giữ lại; các child `CB-10..CB-11` và subtask `CB-12..CB-17` gắn vào story nào hay để đợt sau?
2. **Mở gate Jira Đợt 1:** PO đổi trạng thái `CB-3`, `CB-5`, `CB-4`, `CB-8` từ `To Do` sang `In Progress` và clear từng spec trước khi Dev nhận?
3. **Thông tin đầu vào vận hành:**
   - Nick Zalo dùng cho production và người phụ trách quét lại QR khi rớt phiên?
   - Tên tư vấn viên nhận chuyển giao (`assignConversation`) trong workspace?
   - Endpoint/model OpenAI-compatible cụ thể dự kiến dùng cho AI tư vấn?
4. **Thông tin đầu vào Đợt 2 (`CB-6`):** Link Google Sheet và tên các cột chuẩn.
