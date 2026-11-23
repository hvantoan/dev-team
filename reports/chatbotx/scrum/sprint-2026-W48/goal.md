# Sprint 2026-W48 — Goal

**Sprint Goal:** Refine Epic CB-2 thành story sẵn sàng và đưa CB-1 (OpenAI-compatible public API + mã hoá apiKey + SSRF guard) qua DoD.

- **Thời gian:** 2026-11-23 (Mon) → 2026-11-27 (Fri)
- **PO:** anh Văn Toàn
- **Quyết định mở sprint:** PO chọn "Refine CB-2" + xác nhận Hồ Văn Toàn là PO (item 4, 2026-11-23).

## KEY cam kết

| KEY | Loại | Cam kết | Điều kiện xong (DoD) |
|---|---|---|---|
| CB-2 | Epic → refinement | BA cắt Epic thành story nhỏ; PO refine + chốt thứ tự | `reports/chatbotx/ba/CB-2/refinement.md` + PO comment trên CB-2 |
| CB-1 | Task | Dev implement; QA verify độc lập | `handoff.md` + `verdict.md` PASS + PR (merge khi PO duyệt) |

## Không cam kết

- CB-3 → CB-17: còn `To Do` + label `idea`, chưa qua gate READY TO DEVELOP / IN DEVELOP. Chỉ vào sprint sau khi PO đổi trạng thái/bỏ label.

## Rủi ro sprint

- MCP `jira-vtx` lỗi certifi ở phiên SM (2026-11-23) — nội dung ticket lấy qua Chef và file phân tích `ChatbotX/plans/tasks/cb-2-he-thong-chat-zalo-personal-tu-van-ai.md`.
- CB-1 có migration backfill: SQL phải được PO duyệt trước khi apply lên DB dùng chung.
