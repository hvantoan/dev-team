# Run — 2026-11-23-cb2-refine-cb1

- **RUN-id:** 2026-11-23-cb2-refine-cb1
- **Project:** chatbotx
- **Sprint:** `2026-W48` — goal tại `reports/chatbotx/scrum/sprint-2026-W48/goal.md`
- **Ngày mở:** 2026-11-23
- **Trạng thái:** Đang chạy

## Mục tiêu

Refinement Epic CB-2 thành story sẵn sàng + đưa CB-1 (OpenAI-compatible public API, mã hoá apiKey, SSRF guard) qua DoD trong sprint 2026-W48.

## Task briefs

| # | KEY | Nội dung | Trạng thái | Spec | Handoff | Verdict |
|---|---|---|---|---|---|---|
| 1 | CB-2 | BA cắt Epic thành story; PO refine + chốt thứ tự | 📋 | `reports/chatbotx/ba/CB-2/refinement.md` | — | — |
| 2 | CB-1 | Spec → PO clear → Dev → QA | 📋 | `reports/chatbotx/ba/CB-1/spec.md` | — | — |

Trạng thái: ⏳ chờ clear → 📋 BA spec → 💻 Dev → 🔍 QA → ✅ PASS / ❌ FAIL / 🚫 BLOCKED

## Input cho BA

- `reports/chatbotx/scrum/sprint-2026-W48/goal.md`
- `/home/vif/workspace/ChatbotX/plans/tasks/cb-2-he-thong-chat-zalo-personal-tu-van-ai.md` — phân tích 9 ticket từ Jira (2026-11-22)
- Jira context: chờ Chef xuất text CB-1/CB-2 (MCP `jira-vtx` phiên SM lỗi certifi 2026-11-23)
- `templates/ba-spec.md`

## Quy tắc điều phối

- Chỉ giao Dev khi PO clear `spec.md`.
- CB-1 có migration backfill: SQL phải được PO duyệt trước khi apply lên DB dùng chung.
- WIP 1 task/bot; CB-3 → CB-17 chưa vào sprint (còn `To Do` + `idea`).
- CB-2 refinement xong trước, rồi mới chốt spec CB-1 với PO.

## Kết quả / báo cáo PO

(cập nhật khi run đóng)
