# Board — sprint 2026-W48

Cập nhật: 2026-11-23 (sprint start)

| KEY | Stage | Owner | Artifact | Ghi chú |
|---|---|---|---|---|
| CB-2 | refined — PO duyệt | BA | `reports/chatbotx/ba/CB-2/refinement.md` | PO duyệt cắt story + thứ tự Đợt 1 (2026-11-23, item 4). Đợt 1 CB-3 → CB-5 → CB-4 → CB-8, CB-1 song song |
| CB-1 | qa — PR 1 | QA | `reports/chatbotx/qa/CB-1/verdict.md` | PR #6 (head 2782fe418, CI xanh); verdict chỉ PR 1 — AC4/mã hoá + backfill còn ở PR 2 |
| CB-3 | spec — chờ PO clear | BA | `reports/chatbotx/ba/CB-3/spec.md` | AC1–AC5 + spike ngày 1; cần PO chốt stack test, nick/QR, nhóm test |
| CB-4 → CB-17 | backlog | — | — | `To Do` + `idea`, chưa qua gate |

Stage: backlog → refining → spec → clear → dev → qa → pr → staging.

## Daily

- 2026-11-23: mở sprint; BA nhận refinement CB-2 + spec CB-1. 13:50 — toàn văn Jira từ Chef đã vào `orchestrator/2026-11-23-cb2-refine-cb1/jira-context.md`. 13:57 — BA xong 2 draft. 14:05 — PO duyệt refinement CB-2; CB-1 đã implement ở PR #6 (CI xanh), giao Dev viết handoff rồi QA. 14:15 — Dev handoff xong (lint/types/tests pass, worktree sạch); QA nhận verify PR 1. 14:25 — mở lane song song: BA draft spec CB-3 trong khi QA verify CB-1. 14:35 — BA xong spec CB-3 (AC1–AC5 + spike ngày 1); chờ PO clear + input vận hành. Chặn: MCP jira-vtx lỗi certifi ở phiên SM (đã workaround).
