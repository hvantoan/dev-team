# Board — sprint 2026-W48

Cập nhật: 2026-11-23 (sprint start)

| KEY | Stage | Owner | Artifact | Ghi chú |
|---|---|---|---|---|
| CB-2 | refined — PO duyệt | BA | `reports/chatbotx/ba/CB-2/refinement.md` | PO duyệt cắt story + thứ tự Đợt 1 (2026-11-23, item 4). Đợt 1 CB-3 → CB-5 → CB-4 → CB-8, CB-1 song song |
| CB-1 | dev — PR2 song song QA PR1 | Dev / QA | `reports/chatbotx/qa/CB-1/verdict.md` + PR 2 | PR #6 (head 2782fe418) QA đang verify; PR 2 mã hoá + backfill đang code trên worktree mới |
| CB-3 | clear — chờ input vận hành | — | `reports/chatbotx/ba/CB-3/spec.md` | PO clear 2026-11-23; cần stack test, nick/QR, nhóm test; Dev nhận sau PR 2 |
| CB-4 → CB-17 | backlog | — | — | `To Do` + `idea`, chưa qua gate |

Stage: backlog → refining → spec → clear → dev → qa → pr → staging.

## Daily

- 2026-11-23: mở sprint; BA nhận refinement CB-2 + spec CB-1. 13:50 — toàn văn Jira từ Chef đã vào `orchestrator/2026-11-23-cb2-refine-cb1/jira-context.md`. 13:57 — BA xong 2 draft. 14:05 — PO duyệt refinement CB-2; CB-1 đã implement ở PR #6 (CI xanh), giao Dev viết handoff rồi QA. 14:15 — Dev handoff xong (lint/types/tests pass, worktree sạch); QA nhận verify PR 1. 14:25 — mở lane song song: BA draft spec CB-3 trong khi QA verify CB-1. 14:35 — BA xong spec CB-3 (AC1–AC5 + spike ngày 1); chờ PO clear + input vận hành. 14:36 — PO mở lane PR2 + clear CB-3; Dev nhận PR2 trên worktree riêng, CB-3 chờ stack/nick/nhóm test. Chặn: MCP jira-vtx lỗi certifi ở phiên SM (đã workaround).
