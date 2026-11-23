# ChatbotX — onboarding vào pipeline team

**Trạng thái:** ⏳ chờ PO chốt D1/D2 · **Ngày:** 2026-11-23 · **Project:** `chatbotx` · **Jira:** CB

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
| D1 | Dàn bot | **Dùng chung** Orchestrator/ba-tms/dev-tms/qa-tms, generalize SOUL thành đa project | chờ PO |
| D2 | Pilot | **CB-1** (đang In Progress, scope rõ, có sẵn phân tích) | chờ PO |
| D3 | Jira | MCP `jira-vtx`; không chặn vì `orca jira` thiếu site | đã chốt |
| D4 | Nơi lưu | Code ở repo ChatbotX; artifact ở `dev-team/reports/chatbotx/...` | đã chốt |

## Phases

### Phase 0 — Access & triage (PO + Orchestrator)

- [ ] PO gán assignee, sprint/due date, bỏ label `idea` cho ticket được clear; chốt thứ tự CB-3 → CB-5 → CB-8 (theo phân tích) và CB-1 song song.
- [ ] Với ≥2 ticket READY TO DEVELOP: gom nhóm theo phạm vi, link trên Jira, comment nhóm + lý do (quy tắc PO 2026-11-20).
- [ ] Chốt câu hỏi mâu thuẫn trong phân tích CB: cách đếm clip, `groupReplyConfig`, gateway trong repo, provider AI.
- **Done:** mỗi ticket có assignee + trạng thái READY TO DEVELOP / IN DEVELOP; board 3 phản ánh đúng.

### Phase 1 — Registry & workspace ✅

- [x] `projects/chatbotx.json` (jira, repos, stack, notes).
- [x] Cây `reports/chatbotx/{orchestrator,ba,dev,qa}`, `docs/chatbotx/{srs,adr,research}`, `tests/chatbotx`.
- **Done:** `jq` validate pass; registry đủ 6 mục theo `AGENTS.md` §1.

### Phase 2 — Runtime gates

- [ ] `scripts/stack-chatbotx.sh` bọc `dev-up.sh`: `up <bot> <KEY>` / `down` / `status`; lock `~/.local/state/chatbotx-stack/lock.json`; từ chối khi lock sống hoặc port bận; **không đổi port**.
- [ ] QA harness `tests/chatbotx`: Playwright Chromium + probe API; `.env.example` (`APP_URL=http://localhost:3123`, `DEMO_EMAIL`, `DEMO_PASSWORD`); smoke: sign-in, tạo flow, gửi tin webchat.
- [ ] `stack-chatbotx.sh down` dọn process tree + nhả lock; kiểm không còn orphan `next dev`/`turbo dev`.
- **Done:** `up` → builder 200 + login OK → `status` ghi đúng bot giữ lock → `down` sạch; chạy lại lần 2 không kẹt port.

### Phase 3 — Bot adaptation (cần PO duyệt sửa SOUL)

- [ ] Generalize SOUL 4 bot: `reports/tms/...` → `reports/<proj>/...` lấy từ brief/registry; TMS chỉ là default khi brief không nêu project.
- [ ] Skill `orca-dispatch`: thêm repo `ChatbotX` cho worker; nhánh `feat|fix/CB-<n>-<slug>`; gate `pnpm lint && pnpm check-types && pnpm test`; PR chỉ sau verdict PASS.
- [ ] Skill QA: đường verify ChatbotX (builder UI + API + DB local), evidence path, login demo.
- [ ] `team-config/team.md`: bulletin mô tả 2 project (`tms`, `chatbotx`) nếu còn dùng department này.
- **Done:** brief ChatbotX → bot ghi đúng `reports/chatbotx/...`, không tạo file trong `reports/tms/...`.

### Phase 4 — Pilot CB-1

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
| R2 | Chỉ một builder `:3123` — hai bot cùng bật sẽ giẫm stack | Phase 2 bắt buộc xong trước pilot; QA/Dev nhả lock trước bàn giao. |
| R3 | `tsc` cold ~6 GB RAM | Không chạy `check-types` song song với stack QA; dùng `check-types:cold` khi máy yếu. |
| R4 | SOUL còn hardcode `reports/tms` → bot ghi sai thư mục | Phase 3 trước pilot. |
| R5 | CB-3→CB-9 chưa assignee/sprint → không thỏa gate READY TO DEVELOP | Phase 0 do PO triage. |
| R6 | CB-5 (AI trả lời trong nhóm) có thể đổi từ config sang code | BA chốt trong spec + đánh dấu lại estimate. |

## Câu hỏi mở

- D1: dùng chung 4 bot (sửa SOUL) hay tạo crew mới cho ChatbotX?
- D2: pilot CB-1 hay CB-3?
- CB-1 đang assign `Hồ Văn Toàn` (`it.vantoan@gmail.com`) — có phải anh Toàn? Nếu đúng, ai là Dev thực thi?
- Có cần sprint/board riêng cho ChatbotX không (board 3 hiện chưa có sprint)?
