# Board — sprint 2026-W48

Cập nhật: 2026-11-23 (sprint start)

| KEY | Stage | Owner | Artifact | Ghi chú |
|---|---|---|---|---|
| CB-2 | refined — PO duyệt | BA | `reports/chatbotx/ba/CB-2/refinement.md` | PO duyệt cắt story + thứ tự Đợt 1 (2026-11-23, item 4). Đợt 1 CB-3 → CB-5 → CB-4 → CB-8, CB-1 song song |
| CB-1 | merge — PR1 + PR8 PASS; #8 MERGED; #7 đang rebase → QA verify → merge #7 → #6 | Dev / QA | `reports/chatbotx/qa/CB-1/verdict.md` + PR #6, #7 | PR1 #6 PASS + demo 9router local (CI 14/14 @`ab182d743`, merge-ready chờ PO duyệt); **PR #8 MERGED** @`a28adfda4`; PR #7 đang rebase → QA verify head mới. **Phát hiện mới:** `ALLOW_PRIVATE_URLS=true` tắt hẳn SSRF guard → `169.254.169.254` không bị chặn — PO quyết (item 4). Migration applied DB dev, dry-run 0 row; PO chốt không reverse-script |
| CB-3 | clear — chờ input vận hành | — | `reports/chatbotx/ba/CB-3/spec.md` | PO clear 2026-11-23; cần stack test, nick/QR, nhóm test; Dev nhận sau PR 2 |
| CB-4 → CB-17 | backlog | — | — | `To Do` + `idea`, chưa qua gate |

Stage: backlog → refining → spec → clear → dev → qa → pr → staging.

## Daily

- **Đang làm:** #8 đã merge; Dev rebase #7 lên base mới → QA verify head mới → merge #7 → #6 (PO đã uỷ quyền Dev merge cả 3).
- **Chờ:** Dev báo sha rebase #7 → QA verify → merge #7, #6; PO quyết chặn link-local khi ALLOW_PRIVATE_URLS=true (item 4); CB-3 chờ stack/nick/nhóm test.
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
- 19:3x PR #8 head mới `ecd9f9127` (adopt gate: lint+check-types local, suite CI) — CI all green (run 45158885996); worker đổi marker `data.reason` → `OpenaiCompatibleProviderUnreachableError`. Vẫn OPEN chờ QA verify + PO merge.
- 20:0x Dev đồng bộ body PR #7 theo gate mới (lint+check-types local, AC evidence, CI run link); recheck `gh pr checks` #7+#8 all pass. Còn lại: QA verify #8 → merge #8 → rebase #7 → merge #7 → #6.
- 20:4x QA verdict **PR #8 PASS** tại head mới `ecd9f9127` (head đổi trong lúc verify; lỗi rò `(reason=unreachable)` ở `340868793` đã đóng). Evidence: `qa/CB-1/evidence/07-pr8-e2e-transcript.md` + `08-pr8-tests-lint-ci.txt`. Còn tồn ngoài scope: legacy provider vẫn lộ `(code connectionProviderRejected)` → ghi item 4 cần issue riêng; nhánh UI `providerUnreachable` chỉ unit test.
- 21:0x PO chốt (item 4, e129): **không làm PR reverse-script** — DB dev rỗng, rủi ro chỉ phát sinh khi --apply prod; chấp nhận, ghi impediments. Cả 3 PR vẫn OPEN, chờ PO merge #8 trước.
- 21:2x SM kiểm tra Dev không treo: session active, PR2 worktree sạch @`56b5f7b8f`, không worker chạy; #6/#7/#8 đều checks pass, cả 3 OPEN. Dev đỗ ở cổng merge của PO (đã hỏi Dev 1 dòng xác nhận).
- 21:3x Dev kết thúc turn KHÔNG trả lời câu hỏi check sống (idle 0m, không lỗi) → xác nhận Dev sống nhưng thụ động, chỉ chờ tín hiệu merge #8; SM tự kiểm bằng `gh`/worktree. Coaching: câu hỏi trực tiếp phải trả lời 1 dòng, kể cả "đang chờ PO merge".
- 21:4x **PO uỷ quyền merge** (phương án 2): Dev tự merge #8 → rebase #7 (QA PASS head mới) → merge #7 → merge #6 vào main. Không chạy backfill `--apply` thật. SM đã handoff Dev + báo QA chuẩn bị verify #7 sau rebase.
- 21:5x **Dev runtime chết** (không còn process `pi`; 4 session sống đều là `omp`) → 2 lần nhắn vào Home Chat cũ không có agent đọc. SM mở chat mới cho Dev (`--chat new`) → session sống lại, **PR #8 MERGED** vào `feat/cb-1-openai-compatible-api-ssrf` (base mới `a28adfda4`). Tiếp: rebase #7.
- 22:0x Dev: #8 merged `a28adfda4`; #7 rebase sạch → head mới `6f0e00f55` (MERGEABLE, CI đang chạy). SM đã giao QA verify #7 tại đúng head này; merge #7/#6 chờ verdict PASS.
- 22:1x CI #7 XANH tại `6f0e00f55` (14/14 check SUCCESS, MERGEABLE) — Dev giữ watch, không merge; chờ verdict QA đúng head này.
- 22:1x QA đọc handoff nhưng kết thúc turn im lặng, không sinh evidence mới (mtime cuối 18:04) — cùng kiểu lỗi phiên: tin vào chat cũ `5ea26f58`, Home Chat hiện tại `c6ffdcf3`. SM gửi lại qua `--chat new` + yêu cầu ACK bắt đầu/verdict.
- 22:2x QA ACK: verify #7 @6f0e00f55 bằng worktree tạm `/tmp/qa-cb7-pr7` + compose project `qa-cb7` port riêng, 7 nhóm test case chức năng (schema, store-bindings+AAD, dual-read, consumer, backfill dry-run, public API, 401/403), gate local lint+check-types, ghi link CI + head sha; teardown sau.
