# Port `mausbot-orca` CLI → dev-team (xia --port)

**Mục tiêu:** dev bot (`dev-tms`) và test bot (`qa-tms`) giao việc code cho Orca worker qua CLI watcher-first — submit non-blocking, watcher lo Run/Task/Dispatch/wait/gate/retry và trả milestone card vào room `tms-delivery`.

## Source manifest

| | |
|---|---|
| Source | `/home/vif/tuan-vu/intec-kit` (local repo, package `packages/mausbot-orca@0.1.0`) |
| Commit | `29a60c9 feat(bridge): add watcher-first mausbot Orca bridge` |
| Scope | `packages/mausbot-orca/` (14 file `src/`, 8 file `tests/`, `systemd/`, `package.json`, `tsconfig.json`, `README.md`) + `skills/mausbot-orca/SKILL.md` |
| License | repo không ghi license; cùng owner (vif) — copy được |
| Runtime deps | **zero npm deps** — Node ≥20 + `node:*`; external: `orca` CLI ≥1.4.263 (máy có 1.4.265), `openmausbot` trên PATH |
| Dev deps | typescript ^5.6, @types/node ^22, vitest ^2.1 |

## Source anatomy

```text
cli.ts      arg parser + commands: init|projects|submit|answer|status|watch|help|--version; exit 0/2/3/4
engine.ts   state machine: submit → dispatching → running → gating → done|failed|escalated|paused|orphaned
            coordinator terminal, 1 Run/project, worker-start (+ retry-of), check --wait consuming,
            inbox dedup (seenMessages), gate = check cmd + scope glob, escalation 1)retry 2)dừng, outbox retry
orca.ts     OrcaPort over `orca ... --json` envelopes (deep-find resilient parsing); defaultExec spawn
socket.ts   Unix socket watcher.sock (0600): submit/answer vào engine; chỉ 1 watcher per data dir
state.ts    state.json atomic-write store (0600, dir 0700)
gate.ts     changedFiles (git status + diff base...HEAD) + runCheck → GateResult
glob.ts     git-relative glob (*, **, ?), deny-wins scopeViolations
spec.ts     TaskSpec validate, deriveRequestId sha256(16), mergedScope, slugFor
config.ts   ~/.config/mausbot-orca/config.json validate + sample
chat.ts     openmausbot send --thread --send-id (idempotent)
tests/      907 lines vitest, FakeOrca/FakeChat — unit-level, không cần Orca thật
```

Flow: bot → `submit` (socket) → watcher `tick` → `worker-start` → `check --wait` → worker_done → gate → ✅/⚠️/❓/🔒 card qua `openmausbot send`.

## Local map (integration surface)

- `dev-team` = workspace docs-only, không runtime tooling. `team.md` root có 4 bot; `team-config/` là source of truth của department `tms` (skills phải nằm `team-config/skills/<name>/SKILL.md`, tên khớp `agents[].skills`).
- Orca đã có: runtime ready, `dev-team` repo (`id:05aff9d0-ae…`), `tms-web` (`path:/home/vif/tuan-vu/tms-web`), `tms-test` (`path:/home/vif/tuan-vu/tms-test` — **path cũ**, harness mới là `tests/tms` trong dev-team). Agents: claude, codex, pi (default).
- Đã có sẵn: systemd unit `mausbot-orca.service` **active** trỏ `intec-kit`; `~/.npm-global/bin/mausbot-orca` → intec-kit dist; config `~/.config/mausbot-orca/config.json` với entry `tms` placeholder (`id:repo_123`, `/home/you/work/tms`) và `dev-team` thật.
- Blackboard contract FLOW.md: artifact trong `reports/<proj>/<bot>/<KEY>/`; cards milestone vào room `tms-delivery` qua `openmausbot send` (đã verify CLI có `send --thread|--bot --send-id`).

## Dependency matrix

| Source component | Local equivalent | Status |
|---|---|---|
| `orca` CLI envelope protocol | orca 1.4.265 (≥1.4.263) | EXISTS |
| `openmausbot send` | `~/.npm-global/bin/openmausbot` | EXISTS |
| systemd user watcher | unit đang chạy, trỏ intec-kit | CONFLICT (repoint) |
| `mausbot-orca` trên PATH | npm-global link → intec-kit | CONFLICT (repoint) |
| `~/.config/mausbot-orca/config.json` | có, project `tms` là placeholder | CONFLICT (sửa) |
| skill bot-side `mausbot-orca` | chưa có trong `team-config/skills/` | NEW |
| project `tms-web` cho dev | repo đã đăng ký path selector | NEW config |
| project `tms-qa` cho QA | `tests/tms` không phải git repo riêng — nằm trong `dev-team` (đã đăng ký, `id:05aff9d0`) | NEW config, repo = dev-team |
| coordinator worktree | `dev-team` path trong config | EXISTS |
| vitest cho vendored tests | dev-team chưa có package.json | NEW (dev dep trong tools/) |

## Decision matrix (challenge phase)

| # | Decision | Source's way | Our way | Risk | Choice |
|---|---|---|---|---|---|
| 1 | Code delivery | build tại intec-kit, `npm link` | vendor vào `tools/mausbot-orca/` trong dev-team, commit `src+tests+dist`, repoint link+unit | low | **vendor** — user nói "mang về"; dev-team là nhà duy nhất cần |
| 2 | CLI name/config paths | `mausbot-orca`, `~/.config|state/mausbot-orca` | giữ nguyên | none | giữ — migrate liền mạch, bot skill vẫn hợp lệ |
| 3 | Bot access | skill `mausbot-orca` cho coordinator | port thành `team-config/skills/orca-dispatch/SKILL.md`, gán `dev-tms` + `qa-tms`; giữ nguyên cơ chế submit/answer, thêm quy ước `--thread` = room `tms-delivery` và request-id = `<KEY>-<slug>` | low | adapt, không transplant nguyên văn |
| 4 | Project registry | 1 project `tms` (placeholder) | `tms-dev` (repo `path:/home/vif/tuan-vu/tms-web`, check build) + `tms-qa` (repo `dev-team` vì `tests/tms` nằm trong dev-team, không phải git repo riêng — scope `tests/tms/**`); giữ `dev-team` entry | medium — check command phải thật | thay entry `tms` placeholder |
| 5 | QA gate check | `check` = 1 lệnh | worker QA chạy trong **worktree mới của dev-team**: thiếu `.env` + `node_modules` → `setup: "run"` + check bọc `cd tests/tms && pnpm install --prefer-offline && pnpm test`; `.env` worker tạo từ `.env.example` (secrets lấy từ vault ngoài git) | medium | **dev server :4700 không tự bật — precondition ghi trong skill** |
| 6 | Engine code | unchanged | không đổi 1 dòng | none | port verbatim (src+tests), đổi chỉ package metadata nếu cần |
| 7 | Milestone destination | chat thread người giao | room `tms-delivery` (cả 4 bot + PO đọc) → artifact link vào `reports/...` | low | `--thread` room; skill hướng dẫn |
| 8 | Retry/escalation | card 1)retry 2)dừng → `answer` | giữ; dev-tms/qa-tms tự trả `answer` hoặc PO trả | low | unchanged |

## Universal challenges

- **Necessity:** dev-tms soul đã nói "bằng pi qua Orca" → cần cơ chế dispatch; direct `orca` bị cấm vì watcher sở hữu consumer binding (2 consumer cùng terminal → `consumer_fenced`). Bridge là cách đúng.
- **Simpler alternative:** chạy orca trực tiếp trong 1 lượt bot = blocking + mất retry/gate/outbox. Reject.
- **Existing overlap:** `tests/tms` harness chỉ phục vụ QA thủ công, không overlap dispatch.
- **Maintenance:** dev-team sở hữu vendored copy; cập nhật = re-copy từ intec-kit (ghi provenance commit SHA trong README vendored).
- **Deps mới:** chỉ dev-deps trong `tools/mausbot-orca` (typescript+vitest); runtime zero-dep.

## Risk score: LOW (2 critical-marginal)

1. Entry `tms` placeholder trong config sống → thay bằng `tms-dev`/`tms-qa` thật (P2).
2. `tms-qa` worker chạy trong worktree mới của dev-team → thiếu `.env`/`node_modules` cho playwright; giảm bớt bằng `setup: "run"` + check bọc `pnpm install` (P2). Nếu Orca clone không mang `.env` (git-ignored), QA check sẽ fail — cần đường inject secrets ngoài git (ghi rõ trong skill P3).

## Implementation phases

### P1 — Vendor CLI vào `tools/mausbot-orca/`

- Copy verbatim: `src/`, `tests/`, `systemd/`, `package.json`, `tsconfig.json`, `README.md`.
- `package.json`: giữ `bin mausbot-orca`, thêm `"private": true` đã có; bỏ `main` nếu không cần (giữ — tests import index). Ghi provenance vào README vendored (1 dòng: source path + commit `29a60c9`).
- Build: `npm install` (dev deps) + `npx tsc -p tsconfig.json` → commit cả `dist/` (repo docs không có toolchain; `node dist/cli.js` phải chạy ngay).
- Repoint `~/.npm-global/bin/mausbot-orca` → `dev-team/tools/mausbot-orca/dist/cli.js` (xóa link cũ, `ln -sf`).
- Repoint systemd ExecStart → path mới; `daemon-reload` + `restart` (giữ unit file ngoài repo `systemd/` cập nhật `/path/to` → path thật, comment provenance). **Một watcher duy nhất:** không chạy song song 2 binary — repoint xong restart ngay; `~/.local/state/mausbot-orca/` giữ nguyên (đang rỗng, rebind tự động lần start đầu).
- Smoke sau repoint: `mausbot-orca submit --thread tms-delivery --project dev-team --spec-file - <<< '{"objective":"smoke","scope":{"deny":["**/*"]}}'` phải trả `{"ok":true,...}` exit 0 rồi mới coi migration xong (project `dev-team` đã có trong config).
- **Done when:** `mausbot-orca --version` in 0.1.0, `which mausbot-orca` → dev-team; `systemctl --user status mausbot-orca.service` = active + ExecStart trỏ dev-team; vitest `npm test` pass trong `tools/mausbot-orca`.

### P2 — Config + Orca repo cho dev/test

- Sửa `~/.config/mausbot-orca/config.json` (backup trước: `cp config.json config.json.bak`):
  - `tms-dev`: `repo: "path:/home/vif/tuan-vu/tms-web"`, `path`: cùng, `agent: "pi"` (default installed; dev-tms dùng pi theo soul), `base_branch: "dev"`, `setup: "run"`, `check: "pnpm run build"` (hoặc lệnh build thật của tms-web — verify `package.json` trước khi ghi), `deny: ["**/*.env*", "**/migrations/**"]`.
  - `tms-qa`: `repo: "path:/home/vif/tuanvu/dev-team"` (dev-team là git repo chứa `tests/tms`), `path`: cùng, `agent: "pi"`, `base_branch: "main"`, `setup: "run"`, `check: "cd tests/tms && pnpm install --prefer-offline && pnpm test"`, `allow: ["tests/tms/**"]`, `deny: ["**/.env*", "**/node_modules/**", "tools/mausbot-orca/**"]`.
  - Giữ `dev-team` entry nguyên; **xóa** entry `tms` placeholder.
- `mausbot-orca projects` phải liệt kê đủ 3 (`dev-team`, `tms-dev`, `tms-qa`).
- **Done when:** `mausbot-orca submit --thread tms-delivery --project tms-dev --spec-file - <<< '{"objective":"smoke: do nothing"}'` trả `{"ok":true,...}` exit 0 (spec an toàn, deny-all scope), và `mausbot-orca status` thấy task.

### P3 — Bot skill `orca-dispatch` + department wiring

- `team-config/skills/orca-dispatch/SKILL.md`: adapt từ `skills/mausbot-orca/SKILL.md` —
  - giữ contract submit/answer/exit-codes;
  - `--thread` = room `tms-delivery` (hoặc thread bot hiện tại);
  - spec bắt buộc `context` trỏ artifact: `reports/tms/dev/<KEY>/handoff.md`, `spec.md` — không nhét prose vào objective;
  - dev-tms: project `tms-dev`, done_when = lệnh verify trong brief; qa-tms: project `tms-qa`, spec từ `done_when` của Điều phối;
  - mốc milestone card → bot cập nhật `reports/tms/<bot>/<KEY>/` tương ứng;
  - precondition tms-qa: dev server `tms-web :4700` phải đang chạy (stack.run trong projects/tms.json) trước khi submit check `pnpm test`.
- `team.md`: thêm `orca-dispatch` vào `agents[].skills` của `dev-tms` và `qa-tms` (không gán cho ba-tms/ieu-phoi-tms).
- `AGENTS.md`: thêm 1 dòng vào §6/`team-config` note: `tools/mausbot-orca/` là vendored bridge, nguồn intec-kit@29a60c9; bots giao việc qua `mausbot-orca submit`, không gọi `orca orchestration` trực tiếp.
- **Done when:** folder skill tồn tại đúng tên, `team.md` skills khớp folder, AGENTS.md ghi quy tắc.

### P4 — Smoke end-to-end (optional, do sau khi department re-import)

- dev-tms submit 1 task trivial vào `tms-dev` (đổi 1 file trong scope allow), watcher trả card ✅ vào room; file artifact ghi lại `reports/tms/dev/smoke/handoff.md`.
- **Done when:** card ✅ xuất hiện, `verdict`/`handoff` tham chiếu dispatchId.

## Rollback

- Ghi lại ExecStart cũ trước khi sửa (`systemctl --user cat mausbot-orca.service > /tmp/mausbot-orca.service.bak`): rollback = repoint link + ExecStart về `/home/vif/tuan-vu/intec-kit/packages/mausbot-orca/dist/cli.js`, `daemon-reload`+restart; restore `config.json.bak`; `~/.local/state/mausbot-orca/` giữ nguyên; xóa `tools/mausbot-orca/` + `team-config/skills/orca-dispatch/` + revert `team.md`/`AGENTS.md`.

## Handoff

Plan này là đầu vào cho `/ak-cook`. Không implement trong xia.
