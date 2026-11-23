# ChatbotX — onboarding vào pipeline team

**Trạng thái:** ⏳ chờ PO triage CB (Phase 2 ✅, D1/D2 đã chốt) · **Ngày:** 2026-11-23 · **Project:** `chatbotx` · **Jira:** CB

## Mục tiêu

Đưa ChatbotX vào cùng pipeline file-based của `dev-team`: ticket Jira CB → BA spec → PO clear → Dev code + test → QA verdict PASS → BA cập nhật docs. Một task chỉ xong khi code xong + test/build pass tại chỗ + `verdict.md` PASS.

**Non-goals:** không tạo department MausBot mới, không clone bot trước quyết định D1, không sửa code ChatbotX trong plan này, không dựng deploy/CI mới (repo đã có `.github/workflows/ci.yml`).

## Hiện trạng (đã kiểm 2026-11-23)

| Mục | Bằng chứng |
|---|---|
| Repo | `/home/vif/workspace/ChatbotX` — monorepo pnpm 10 + Turborepo, Node 24, nhánh `main`, remote `hvantoan/ChatbotX` |
| Stack local | `scripts/dev-up.sh` dựng docker infra + migrate DB local + `turbo dev` + smoke login; builder `:3123`, postgres `:25432`, redis `:26379`; demo `demo@example.com / Demo@1234` |
| Quality gate | `pnpm lint` (invariants + turbo lint + ultracite), `pnpm check-types` (cổng type duy nhất — `next build` bỏ qua TS), `pnpm test`; CI chia 3 job |
| Test harness | Repo chỉ có vitest trong workspace; **chưa có Playwright/e2e** |
| Jira CB | 9 ticket: CB-1 In Progress (assign Hồ Văn Toàn), CB-2 Epic To Do, CB-3→CB-9 To Do, label `idea`, chưa sprint |
| Input BA sẵn có | `ChatbotX/plans/tasks/cb-2-he-thong-chat-zalo-personal-tu-van-ai.md` (đang staged, chưa commit) — phân tích 9 ticket + mâu thuẫn |
| Jira access | MCP `jira-vtx` đọc/ghi được; `orca jira` **chưa** lưu site `vtxsolution` → dùng MCP |
| Workspace | `projects/chatbotx.json` + `reports|docs|tests/chatbotx` đã tạo, schema validate pass |
| Máy | 31 GB RAM (14 GB available), 63 GB disk trống |

## Quyết định

| # | Quyết định | Chọn | Trạng thái |
|---|---|---|---|
| D1 | Dàn bot | **Dùng chung** Orchestrator/ba-tms/dev-tms/qa-tms, generalize SOUL thành đa project | ✅ PO chốt 2026-11-23 |
| D2 | Pilot | **Chưa chạy** — chờ PO triage CB-1..CB-9 | ✅ PO chốt 2026-11-23 |
| D3 | Jira | MCP `jira-vtx`; không chặn vì `orca jira` thiếu site | đã chốt |
| D4 | Nơi lưu | Code ở repo ChatbotX; artifact ở `dev-team/reports/chatbotx/...` | đã chốt |

## Scrum (vai trò Scrum Master từ 2026-11-23)

- Nhịp mặc định 1 tuần — **chờ PO chốt ngày bắt đầu** (ghi `reports/chatbotx/scrum/config.md`); artifact `reports/chatbotx/scrum/sprint-<YYYY-Www>/{goal,board,review,retro}.md`, chặn `reports/chatbotx/scrum/impediments.md`.
- Backlog = ticket CB READY TO DEVELOP / IN DEVELOP assign Văn Toàn + item `orca bot item` chưa đóng. Triage xong → planning chốt goal + KEY cam kết vào `goal.md`, trình PO clear.
- WIP = 1 task/bot; task chờ quá 1 ngày → item `needs-you` cho PO.
- Review/retro cuối sprint ghi metric: cycle time, throughput, carry-over %, số lần FAIL/BLOCKED.

## Phases

### Phase 0 — Access & triage (PO + Orchestrator)

- [ ] PO gán assignee, sprint/due date, bỏ label `idea` cho ticket được clear; chốt thứ tự CB-3 → CB-5 → CB-8 (theo phân tích) và CB-1 song song.
- [ ] Chốt sprint goal + KEY cam kết vào `reports/chatbotx/scrum/sprint-<YYYY-Www>/goal.md` và tạo `board.md` trước khi giao Dev.
- [ ] Với ≥2 ticket READY TO DEVELOP: gom nhóm theo phạm vi, link trên Jira, comment nhóm + lý do (quy tắc PO 2026-11-20).
- [ ] Chốt câu hỏi mâu thuẫn trong phân tích CB: cách đếm clip, `groupReplyConfig`, gateway trong repo, provider AI.
- **Done:** mỗi ticket có assignee + trạng thái READY TO DEVELOP / IN DEVELOP; board 3 phản ánh đúng.

### Phase 1 — Registry & workspace ✅

- [x] `projects/chatbotx.json` (jira, repos, stack, notes).
- [x] Cây `reports/chatbotx/{orchestrator,ba,dev,qa}`, `docs/chatbotx/{srs,adr,research}`, `tests/chatbotx`.
- **Done:** `jq` validate pass; registry đủ 6 mục theo `AGENTS.md` §1.

### Phase 2 — Runtime gates ✅

- [x] `scripts/stack-chatbotx.sh` bọc `dev-up.sh`: `up <bot> <KEY>` / `down` / `status`; lock `~/.local/state/chatbotx-stack/lock.json`; từ chối khi lock sống hoặc port bận; **không đổi port**.
- [x] `status` phân biệt 2 chế độ đang có trên máy: (a) host dev `dev-up.sh` (pid `/tmp/chatbotx-dev.pid`), (b) docker stack (`docker compose ps`: builder/caddy/worker/realtime). Docker stack đang chạy sẵn 14–19h, caddy giữ `:3123`, PG `:25432` — wrapper không kill container của anh Toàn; `up` từ chối nếu container stack đang chạy, `down` chỉ dừng phần nó khởi động.
- [x] QA harness `tests/chatbotx`: Playwright Chromium + probe API; `.env.example` (`APP_URL=http://localhost:3123`, `DEMO_EMAIL`, `DEMO_PASSWORD`); smoke: sign-in → workspace → dashboard/inbox, API sign-in trả token.
- [x] `stack-chatbotx.sh down` dọn process tree + nhả lock; stale lock chỉ xoá lock, không `dev-up --stop`, không pkill.
- **Done (verify 2026-11-23):** `status` exit 0 liệt kê 12 container + port; `down` khi chỉ có docker stack không đổi `docker ps`; `up` từ chối exit 1; Playwright 2/2 pass (UI 4.0s, API 427ms); commit `961e1d9` + `9e8a189`.

### Phase 3 — Bot adaptation ✅ (D1: dùng chung 4 bot)

- [x] Generalize SOUL 4 bot: `reports/tms/...` → `reports/<proj>/...` lấy từ ticket key/brief; TMS chỉ là một project.
- [x] Skill `orca-dispatch`: thêm repo `ChatbotX` cho worker; nhánh `feat|fix/CB-<n>-<slug>`; gate `pnpm lint && pnpm check-types && pnpm test`; PR chỉ sau verdict PASS.
- [x] Skill QA: đường verify ChatbotX (builder UI + API + DB local), evidence path, login demo.
- [x] `team-config/team.md`: souls + bulletin mô tả 2 project (`tms`, `chatbotx`); copy skill/SOUL sang bot home.
- **Done:** brief ChatbotX → bot ghi đúng `reports/chatbotx/...`, không tạo file trong `reports/tms/...`.

### Phase 4 — Pilot (chờ PO triage)

- [ ] Mở run `reports/chatbotx/orchestrator/2026-11-23-cb1/plan.md`; BA viết `reports/chatbotx/ba/CB-1/spec.md`; PO clear.
- [ ] Dev worker trên repo `ChatbotX`, nhánh `feat/CB-1-openai-compatible-public-api`; `handoff.md` ghi branch/commit/lệnh test.
- [ ] QA verify từng done-condition (public API, mã hoá apiKey, SSRF guard, migration backfill) + evidence tái tạo; `verdict.md`.
- [ ] PASS → BA cập nhật `docs/chatbotx/adr|srs`; Orchestrator báo PO kèm link.
- **Done:** `verdict.md` PASS từng done-condition, PR xanh (lint/check-types/test), docs cập nhật.

### Phase 5 — Vận hành

- [ ] Mỗi task một run; `status.md` cập nhật theo trạng thái ⏳📋💻🔍✅❌🚫.
- [ ] Evidence nặng ngoài git, nhẹ commit; `verdict.md` ghi đường dẫn tuyệt đối cho file nặng.
- [ ] Tùy chọn: automation nhắc PO ticket CB chưa clear mỗi sáng.

## Rủi ro

| # | Rủi ro | Xử lý |
|---|---|---|
| R1 | `dev-up.sh` tự chạy `db:migrate` lên DB **local** | Chấp nhận cho local; migration shared/staging/prod phải có PO duyệt SQL. Không trỏ `DATABASE_URL` ra ngoài local. |
| R2 | Chỉ một builder `:3123` — docker stack đang chạy sẵn (caddy giữ `:3123`, PG `:25432`) nên `dev-up.sh` sẽ đụng port | Phase 2 bắt buộc xong trước pilot; wrapper phải nhận diện container stack, không kill; QA/Dev nhả lock trước bàn giao. |
| R3 | `tsc` cold ~6 GB RAM | Không chạy `check-types` song song với stack QA; dùng `check-types:cold` khi máy yếu. |
| R4 | SOUL còn hardcode `reports/tms` → bot ghi sai thư mục | Phase 3 trước pilot. |
| R5 | CB-3→CB-9 chưa assignee/sprint → không thỏa gate READY TO DEVELOP | Phase 0 do PO triage. |
| R6 | CB-5 (AI trả lời trong nhóm) có thể đổi từ config sang code | BA chốt trong spec + đánh dấu lại estimate. |

## Câu hỏi mở

- D1: dùng chung 4 bot (sửa SOUL) hay tạo crew mới cho ChatbotX?
- D2: pilot CB-1 hay CB-3?
- CB-1 đang assign `Hồ Văn Toàn` (`it.vantoan@gmail.com`) — có phải anh Toàn? Nếu đúng, ai là Dev thực thi?
- Có cần sprint/board riêng cho ChatbotX không (board 3 hiện chưa có sprint)?
