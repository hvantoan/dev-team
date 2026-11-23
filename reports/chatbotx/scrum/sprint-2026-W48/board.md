# Board — sprint 2026-W48

Cập nhật: 2026-11-23 (sprint start)

| KEY | Stage | Owner | Artifact | Ghi chú |
|---|---|---|---|---|
| CB-2 | refined — PO duyệt | BA | `reports/chatbotx/ba/CB-2/refinement.md` | PO duyệt cắt story + thứ tự Đợt 1 (2026-11-23, item 4). Đợt 1 CB-3 → CB-5 → CB-4 → CB-8, CB-1 song song |
| CB-1 | qa — PR1 PASS, chờ PR2 | QA / Dev | `reports/chatbotx/qa/CB-1/verdict.md` + PR 2 | PR1 #6 @2782fe418 PASS (AC1 E2E 6 bước trên stack cô lập); PR2 mã hoá + backfill đang code; merge + OQ chờ PO |
| CB-3 | clear — chờ input vận hành | — | `reports/chatbotx/ba/CB-3/spec.md` | PO clear 2026-11-23; cần stack test, nick/QR, nhóm test; Dev nhận sau PR 2 |
| CB-4 → CB-17 | backlog | — | — | `To Do` + `idea`, chưa qua gate |

Stage: backlog → refining → spec → clear → dev → qa → pr → staging.

## Daily

- **Đang làm:** CB-1 PR1 PASS; PR2 worker mã hoá + backfill đang code; BA đã sync spec (AC1 token scope).
- **Chờ:** PO merge PR #6 + chốt 2 OQ (mã lỗi SSRF connect, message UI unreachable); CB-3 chờ stack/nick/nhóm test.
- **Chặn:** MCP `jira-vtx` lỗi certifi ở phiên SM (đã workaround qua Chef).

## Log

- 13:45 mở sprint 2026-W48; 13:50 toàn văn Jira vào run plan; 13:57 BA xong refinement CB-2 + spec CB-1.
- 14:05 PO duyệt refinement; CB-1 đã implement ở PR #6; 14:15 Dev handoff; 14:25 BA draft spec CB-3.
- 14:35 PO clear CB-3 + mở lane PR2; 14:40 QA BLOCKED (AC1) → SM duyệt retry stack riêng.
- 14:43 PR2 worker trên branch riêng; 15:25 QA retry PASS PR1 (E2E 6 bước); BA sửa AC1 scope.
