# Run — 2026-11-23-cb2-refine-cb1

- **RUN-id:** 2026-11-23-cb2-refine-cb1
- **Project:** chatbotx
- **Sprint:** `2026-W48` — goal tại `reports/chatbotx/scrum/sprint-2026-W48/goal.md`
- **Ngày mở:** 2026-11-23
- **Trạng thái:** Xong — đóng 2026-11-25

## Mục tiêu

Refinement Epic CB-2 thành story sẵn sàng + đưa CB-1 (OpenAI-compatible public API, mã hoá apiKey, SSRF guard) qua DoD trong sprint 2026-W48.

## Task briefs

| # | KEY | Nội dung | Trạng thái | Spec | Handoff | Verdict |
|---|---|---|---|---|---|---|
| 1 | CB-2 | BA cắt Epic thành story; PO refine + chốt thứ tự | ✅ | `reports/chatbotx/ba/CB-2/refinement.md` | — | PO duyệt 2026-11-23 |
| 2 | CB-1 | Spec → PO clear → Dev → QA | ✅ | `reports/chatbotx/ba/CB-1/spec.md` | `reports/chatbotx/dev/CB-1/handoff.md` | PASS #6/#8; #7 merge uỷ quyền PO |

Trạng thái: ⏳ chờ clear → 📋 BA spec → 💻 Dev → 🔍 QA → ✅ PASS / ❌ FAIL / 🚫 BLOCKED

## Input cho BA

- `reports/chatbotx/scrum/sprint-2026-W48/goal.md`
- `/home/vif/workspace/ChatbotX/plans/tasks/cb-2-he-thong-chat-zalo-personal-tu-van-ai.md` — phân tích 9 ticket từ Jira (2026-11-22)
- `reports/chatbotx/orchestrator/2026-11-23-cb2-refine-cb1/jira-context.md` — toàn văn description + comment CB-1/CB-2, lấy qua Chef 2026-11-23 (MCP `jira-vtx` phiên SM lỗi certifi)
- `templates/ba-spec.md`

## Quy tắc điều phối

- Chỉ giao Dev khi PO clear `spec.md`.
- CB-1 có migration backfill: SQL phải được PO duyệt trước khi apply lên DB dùng chung.
- WIP 1 task/bot; CB-3 → CB-17 chưa vào sprint (còn `To Do` + `idea`).
- CB-2 refinement xong trước, rồi mới chốt spec CB-1 với PO.

## Kết quả / báo cáo PO

Run đóng 2026-11-25.

- **CB-2:** refinement xong, PO duyệt cắt story + thứ tự Đợt 1 (CB-3 → CB-5 → CB-4 → CB-8, CB-1 song song) — `reports/chatbotx/ba/CB-2/refinement.md`.
- **CB-1:** 3 PR merged vào `main` — #8 `ecd9f9127`, #7 `6f0e00f55`, #6 `0f88afe86`. QA verdict PASS cho #6 (`qa/CB-1/verdict.md`, mục PR 1) và #8; **#7 không có verdict.md riêng** — merge trên uỷ quyền PO + CI 14/14 xanh, QA đã ACK verify #7 trước lệnh merge. Staging chưa bắt đầu (chờ PO yêu cầu).
- **Còn lại ngoài run:** SRS + ADR của CB-1 (`docs/chatbotx/srs/integration-openai-compatible.md`, ADR `encryptedAuth`) đã giao BA 2026-11-25; legacy provider vẫn lộ `(code ...)` → issue riêng nếu PO muốn đóng; nhánh UI `providerUnreachable` chỉ có unit test.
- Sprint board: `reports/chatbotx/scrum/sprint-2026-W48/board.md`.
