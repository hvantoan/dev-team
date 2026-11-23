# Board — sprint 2026-W48

Cập nhật: 2026-11-23 (sprint start)

| KEY | Stage | Owner | Artifact | Ghi chú |
|---|---|---|---|---|
| CB-2 | refined — PO duyệt | BA | `reports/chatbotx/ba/CB-2/refinement.md` | PO duyệt cắt story + thứ tự Đợt 1 (2026-11-23, item 4). Đợt 1 CB-3 → CB-5 → CB-4 → CB-8, CB-1 song song |
| CB-1 | qa — PR1 PASS; PR2 + contract-fix CI green; dry-run xong; chờ QA verify PR8 → merge #8→#7→#6 | QA / Dev | `reports/chatbotx/qa/CB-1/verdict.md` + PR #6, #7, #8 | PR1 #6 PASS; PR8 #8 @340868793 CI green — QA verify; PR2 #7 @56b5f7b8f CI green — rebase sau #8. Migration applied DB dev `localhost:25432`, dry-run 0 row (probe chứng minh script đúng). **PO chốt merge order #8 → #7 → #6**; rollback auth={} ngoài scope (PO đã xem) |
| CB-3 | clear — chờ input vận hành | — | `reports/chatbotx/ba/CB-3/spec.md` | PO clear 2026-11-23; cần stack test, nick/QR, nhóm test; Dev nhận sau PR 2 |
| CB-4 → CB-17 | backlog | — | — | `To Do` + `idea`, chưa qua gate |

Stage: backlog → refining → spec → clear → dev → qa → pr → staging.

## Daily

- **Đang làm:** CB-1 PR2 xong (PR #7) + contract-fix xong (PR #8), cả hai CI green; chờ merge thứ tự #8 → #7 → #6.
- **Chờ:** PO quyết PR reverse-script trước --apply (item 4 needs-you); PO merge theo thứ tự #8→#7→#6 sau khi QA verify PR8; CB-3 chờ stack/nick/nhóm test.
- **Chặn:** MCP `jira-vtx` lỗi certifi ở phiên SM (đã workaround qua Chef). Server vif chưa sign-in Orca Cloud → không watch được GitHub PR #8 merge; SM check thủ công bằng `gh` mỗi daily, đã offer connect card.

## Log

- 13:45 mở sprint 2026-W48; 13:50 toàn văn Jira vào run plan; 13:57 BA xong refinement CB-2 + spec CB-1.
- 14:05 PO duyệt refinement; CB-1 đã implement ở PR #6; 14:15 Dev handoff; 14:25 BA draft spec CB-3.
- 14:35 PO clear CB-3 + mở lane PR2; 14:40 QA BLOCKED (AC1) → SM duyệt retry stack riêng.
- 14:43 PR2 worker trên branch riêng; 15:25 QA retry PASS PR1 (E2E 6 bước); BA sửa AC1 scope.
- 16:10 PO chốt: merge PR1 chờ PR2; connect map `ssrfBlocked`; UI tách `providerUnreachable` — Dev nhận fix lane, BA sync spec.
- 16:15 Dev dispatch worker contract-fix (`fix/cb-1-pr1-contract`, worktree riêng, item #6); PR2 rebase sau khi fix vào base.
- 17:05 PR2 xong: PR https://github.com/hvantoan/ChatbotX/pull/7 (stacked, head `56b5f7b8f`) CI all SUCCESS — 7 bảng `encryptedAuth` jsonb + dual-read + decrypt ở service/factory; backfill chỉ unit test vì cột chưa có trên DB. Dev báo chờ PO duyệt SQL migration + log backfill dry-run → SM đưa lên item 4.
- 17:40 contract-fix xong: PR https://github.com/hvantoan/ChatbotX/pull/8 (stacked, head `340868793`) CI all SUCCESS — `ssrfBlocked` chỉ unwrap ở `openaiCompatible`, `providerUnreachable` 21 locale; Dev đề xuất merge thứ tự #8 → #7 → #6, PR2 cần rebase sau #8.
- 18:00 PO duyệt rule test mới cho chatbotx (commit dev-team `2f2db4e6c2`): local chỉ lint + check-types, test chạy trên CI; ghi vào `scrum/config.md`.
- 18:2x PO chốt merge order **#8 → #7 → #6** theo đề xuất Dev (item 4); Dev đã apply migration DB dev `localhost:25432`, backfill dry-run 0 row (probe chứng minh script đúng); chờ QA verify PR #8 trước merge.
- 18:3x PO chỉnh rule test: vẫn bắt buộc **test case chức năng** — Dev chạy theo AC trước handoff (evidence trong `handoff.md`), QA chạy độc lập + ghi link CI run; `pnpm test` vẫn chỉ trên CI (commit `fc749e7500`); cập nhật `scrum/config.md`.
- 18:5x Dev apply migration DB dev `localhost:25432` + backfill dry-run xong: log `reports/chatbotx/dev/CB-1/backfill-dryrun-2026-11-23.log` — 0 row (DB dev rỗng), probe row chứng minh script + idempotent; Dev đề xuất PR nhỏ script reverse (decrypt→auth) trước `--apply`, chờ PO; PR #7 sẵn sàng rebase sau #8 merge.
- 19:0x Dev ack: giữ chờ reverse-script (PO) + sẵn sàng dispatch rebase PR #7 khi #8 vào base (Dev không có GitHub event). SM không tạo được watch vì server chưa sign-in Orca Cloud → đã offer GitHub connect card; check `gh` thủ công.
