# QA Verdict — CB-1 (PR 1: Public API OpenAI-compatible + satellite ID + SSRF)

- **Ticket/Key:** CB-1 — https://vtxsolution.atlassian.net/browse/CB-1
- **Phạm vi verdict:** **chỉ PR 1** (public API + satellite ID + SSRF), theo PR #6. PR 2 (mã hoá `encryptedAuth` 7 bảng AI provider + backfill) chưa có → **CB-1 tổng thể CHƯA DONE**.
- **Stack:** **stack cô lập dựng từ worktree PR** (quyết định của SM, port riêng — không đụng stack owner):
  - compose project `qa-cb1`: postgres 18.6 `25433`, redis `26380`, rustfs `29004/29005`
  - builder `next dev` (Next 16.4.6 Turbopack) `http://localhost:3124`, worker `tsx src/core.ts` — cùng worktree PR
  - mock OpenAI-compatible server `http://127.0.0.1:1235/v1` (self-hosted + `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true` cho lượt chạy 6 bước; lượt AC5 chạy lại builder với env = `false`)
  - DB test migrate + seed mới (`postgresql://chatbotx:secretkey@localhost:25433/chatbotx`)
- **Ngày chạy:** 2026-11-23 (14:30–15:2x +07:00). Stack test đã **teardown**; worktree sạch trước/sau.

| Repo | Branch/commit |
|---|---|
| ChatbotX (`/home/vif/workspace/worktrees/ChatbotX-cb-1-openai-compatible-api-ssrf`) | `feat/cb-1-openai-compatible-api-ssrf` @ `2782fe41815cebbe13544c68e59465fe4789252e` |
| PR #6 | OPEN, `MERGEABLE`, head `2782fe418`, CI [45126421011](https://github.com/hvantoan/ChatbotX/actions/runs/45126421011) all green |

## Verdict: PASS (PR 1)

AC1–AC6 của PR 1 đều có bằng chứng chạy thật hoặc bằng chứng code+test tại đúng head. **Không PASS toàn CB-1**: AC4 (mã hoá `auth` mọi AI provider) chưa có trong nhánh — xem AC4 và Ghi chú.

## Tài khoản test

| Vai trò | Token (test DB riêng) | Kết quả trên endpoint |
|---|---|---|
| Full | `scopes = NULL` | 200 mọi route; dùng cho `aiAgents.create` + webchat |
| Scope integrations | `scopes = {integrations}` | 200 `/v1/connections`, `/v1/integrations/ai/*`; 403 `/v1/ai-agents` (scope `automation`) |
| Read-only | `permission = read_only`, `scopes = NULL` | 403 mọi mutating (POST/PATCH/DELETE); 200 GET |
| Không có/Token sai | — | 401 `INVALID_CHATBOT_TOKEN` |

Token mint trực tiếp trong DB test bằng `sha256` (cùng `hashToken()`), không đụng DB của owner.

## Done-conditions

| # | Điều kiện | Kết quả | Evidence |
|---|---|---|---|
| AC1 | E2E 6 bước với `connections.create` → `getAiProvider` trả satellite ID → `updateAiProvider(autoReply=true)` → `aiAgents.create` → agent trả lời tin thử → `connections.delete`; description `ai_agents_create` trỏ `getAiProvider` | **PASS** — chạy đủ 6 bước trên stack cô lập; `data[].id` = satellite `IntegrationOpenaiCompatible.id` (`11793656876884266`) ≠ parent `integrationId` (`11793656876671244`); agent trả lời đúng text của mock provider; delete xoá cascade satellite + parent, GET còn 0 instance | evidence/05-e2e-ac1-transcript.md |
| AC2 | `read_only` bị từ chối ở mọi procedure mutating; response không chứa `apiKey`/ciphertext, chỉ `hasApiKey` | **PASS** — `POST /v1/connections` 403, `PATCH /v1/integrations/ai/openaiCompatible` 403 (chặn ở middleware theo method, trước handler), `GET` 200; payload chỉ có `id/integrationId/name/preset/baseURL/defaultModel/enabled/autoReply/hasApiKey`; không có `auth`, `apiKey`, `workspaceId` | evidence/05 (bảng AC2), `authorize-workspace-access.ts:38` |
| AC3 | `updateAiProvider(openaiCompatible)` thiếu/sai `integrationId` bị chặn; có thì update đúng instance qua cùng service với UI | **PASS** — thiếu `integrationId` → 422 `invalidRequestData`; id không tồn tại → 404; đổi origin khác không kèm `apiKey` → 422 `validation`; có `apiKey` → 200; `autoReply` persist (`t`) | evidence/05 (bảng AC3) |
| AC4 | 7 bảng AI provider không còn `auth` plaintext sau migration + backfill | **FAIL — ngoài PR 1 (PR 2 chưa có):** 0/7 schema có `encryptedAuth`, không có script backfill AI, `store-bindings` vẫn ghi `auth` plaintext; `apiKey` trong DB test vẫn là `{"authType":"secretText","secretText":...}` | evidence/04-static-code-evidence.txt |
| AC5 | SSRF bật mặc định mọi edition; private/loopback bị chặn; env opt-out chỉ self-hosted, bỏ qua khi cloud | **PASS** — builder **không** set env: connect `127.0.0.1`, `169.254.169.254`, `10.0.0.5` → 400 (không probe endpoint — log mock không có request); `PATCH baseURL` private → 400 `ssrfBlocked`; builder set env `true`: connect `127.0.0.1:1235/v1` → 201 (đủ cho luồng AC1). Case cloud chỉ có bằng chứng unit test (máy này edition community) | evidence/06-ac5-ssrf-no-optout.txt; `validate-base-url.ts:38` |
| AC6 | Manifest 0 entry `private:`; lint/check-types/test/snapshot/cli-mcp-docs pass | **PASS** — 0 entry `private:` (4 entry → `covered:connections`/`covered:integrations`); `pnpm lint` exit 0; `pnpm check-types` exit 0 + **ép `--force` chạy tươi 69/69 task 16m52s**; test 48 + 128 + 60 pass; snapshot operations không đổi (không thêm/đổi operationId) | evidence/01, 02, 03, 04 |

## Cách dựng & chạy E2E (tái tạo)

```bash
# 1. infra cô lập (port riêng, project riêng)
docker compose -f /tmp/qa-cb1/compose.yml -p qa-cb1 up -d      # pg 25433, redis 26380, rustfs 29004/29005
# 2. migrate + seed vào DB test
DATABASE_URL='postgresql://chatbotx:secretkey@localhost:25433/chatbotx?schema=public' \
  pnpm --filter @chatbotx.io/database db:migrate && ... db:seed
# 3. mock provider
node /tmp/qa-cb1/mock-openai.mjs                                # 127.0.0.1:1235/v1 (models + chat/completions, có stream)
# 4. builder + worker từ worktree PR, env ghi đè (/tmp/qa-cb1/qa.env)
pnpm --filter builder exec dotenv -e /tmp/qa-cb1/qa.env -e ../../.env -- next dev -p 3124
pnpm --filter worker  exec dotenv -e /tmp/qa-cb1/qa.env -e ../../.env -- tsx src/core.ts
# 5. 6 bước AC1 bằng curl vào http://localhost:3124/api/v1/... (xem evidence/05)
```

Lưu ý cho lần sau: public API trong app Next nằm ở **`/api/v1/...`** (handler `app/api/[[...rest]]`, prefix `/api`); gọi `/v1/...` trực tiếp vào Next sẽ bị middleware redirect 307 về `/auth/sign-in` (prod có caddy rewrite). AC1 cần 3 scope khác nhau (`integrations`, `automation`, `channels`) — xem Phát hiện 1.

## Lệnh static checks (độc lập, tại worktree, head `2782fe418`)

```bash
pnpm lint                 # exit 0 (ultracite 11445 files, no fixes; schema drift in sync)
pnpm check-types          # exit 0 — 69 tasks (cache)
pnpm exec turbo run check-types --force --concurrency=2   # exit 0 — 69/69, 16m52s
pnpm --filter @chatbotx.io/business test integration-openai-compatible credential-providers.test.ts  # 48 passed
pnpm --filter builder exec vitest run <7 file AC liên quan>                                          # 128 passed
pnpm --filter chatbotx test                                                                          # 60 passed
```

CI run 45126421011 tại đúng head: Lint, Types, Types (apps), Types (packages), Tests (1/8…8/8) đều pass — khớp local.

## Đối chiếu

- **Satellite ID:** API trả `data[].id` = `IntegrationOpenaiCompatible.id`; `aiAgents.create` lưu đúng giá trị đó; worker (`reply-model.ts:43`) tra `findByWorkspaceIdAndId` (satellite) và yêu cầu `enabled && autoReply` — khớp hợp đồng, không còn lỗi "agent không bao giờ trả lời".
- **autoReply:** `connections.create` đặt `autoReply=false` (schema default), `enabled=true`; PATCH bật `autoReply=true` có hiệu lực ngay (worker đọc DB trực tiếp, không qua cache của `aiIntegrationService`).
- **Bảo mật payload:** cả `get`/`update` chỉ map field an toàn, `auth` chỉ thành `Boolean()`; không có `apiKey`/ciphertext/`workspaceId`.
- **Đa tenant:** filter theo `workspaceId` ở cả nhánh satellite id và parent id; id lạ → 404.
- **Manifest/snapshot/docs:** 0 `private:`; snapshot pin `(operationId, method, path)` nên không đổi là đúng; `docs/openai-compatible.md` mới (lifecycle, upgrade note self-hosted, rủi ro disconnect) + `apps/cli/README.md`.
- **DB:** sau step 6, `IntegrationOpenaiCompatible` + `Integration` của instance 1 đã xoá cascade; `Connection` không còn — kiểm bằng psql trên DB test.

## Regression đã kiểm

- 401/403: thiếu/sai token 401; `read_only` 403 trước handler; scope sai 403 (`automation`); 5 provider legacy không đổi hành vi (test + snapshot operations không đổi).
- Endpoint liền kề: `GET /v1/connections` (dùng để lấy connection id cho step 6) trả `integrationId` để đối chiếu; `PATCH` cùng origin không kèm key vẫn verify bằng key đang lưu (mock nhận `GET /other/v1/models`).
- Schema drift: `check-schema-drift.mjs` trong `pnpm lint` → "Schema is in sync".

## Phát hiện

1. **AC1 ghi "token scope `integrations`" cho cả 6 bước — không đúng với mô hình scope hiện tại (cần sửa spec, không phải sửa code).** `/v1/ai-agents` cần scope `automation`, `/v1/webchats` cần `channels` (đã chứng minh: token `{integrations}` gọi `POST /v1/ai-agents` → `403 "Token is not authorized for the 'automation' scope"`). Luồng E2E phải dùng token unrestricted hoặc token nhiều scope.
2. **Mã lỗi SSRF trên đường connect vẫn là `connectionCredentialsRejected`, không phải `ssrfBlocked`** (AC5/success-metric Jira ghi `ssrfBlocked`). Xác nhận bằng chạy thật: `400 {"code":"connectionCredentialsRejected","message":"OpenAI-compatible base URL is not allowed. (code connectionProviderRejected)"}`. Guard chặn đúng và không probe; chỉ hợp đồng lỗi lệch. **Phụ:** message công khai lộ mã nội bộ `(code connectionProviderRejected)` — nên lọc bỏ.
3. **UI connect fail-closed khi endpoint không truy cập được (trung bình).** `verifyOpenaiCompatibleProvider` chuyển sang `packages/business` và bỏ nhánh "lưu kèm cảnh báo" (`ok: true, warning: could_not_verify`); `unreachable` bị map thành `openaiCompatible.validation.invalidBaseURL` → người dùng không phân biệt "URL sai/bị chặn" với "server đang tắt". Có test cho hành vi mới nhưng là thay đổi người dùng thấy được ngoài danh sách AC → PO cần xác nhận; nên tách message `providerUnreachable`.
4. **Tên env khác spec:** `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS` (spec `ALLOW_PRIVATE_AI_BASE_URLS`, ghi "tên dự kiến") — `.env.example` + docs theo tên thực tế; chỉ cần đồng bộ spec/Jira.
5. **`integrationId` nhận cả parent `Integration.id`** (superset) ở `get`/`update` — tiện cho client nhưng nếu agent dùng parent id thì vẫn "đúng API, sai runtime"; docs + description đã cảnh báo rõ.
6. **Thiếu test riêng khẳng định `PATCH /v1/integrations/ai` bị chặn với token `read_only`** (đã kiểm bằng chạy thật; test hiện chỉ phủ POST/DELETE + middleware).
7. **Gia cố ngoài spec (chấp nhận):** chặn `user:pass@`; `redirect: "manual"` khi verify; đổi origin bắt buộc `apiKey` mới; đồng bộ `Connection.sourceId/displayName`; map lỗi `conflict`/`presetAlreadyConnected`/`connectionAlreadyConnected`.
8. **Probe `/models` hai lần khi connect qua UI** (verify trong action + `fromCredentials`) — lộ trình E2E qua API chỉ thấy 1 probe; ảnh hưởng độ trễ, không ảnh hưởng nghiệp vụ.

## Ghi chú

- **PR 2 (AC4) chưa có:** 0/7 bảng AI provider có `encryptedAuth`, không có script backfill AI, `apiKey` vẫn plaintext. **Không merge/đóng CB-1 như đã xong bảo mật.**
- **Stack owner không bị chạm:** 12 container `chatbotx-*` vẫn `Up` với uptime cũ (builder/caddy 19h, worker 23h…); không restart/down/đổi port mặc định. Stack test `qa-cb1` đã `down -v`, port 3124/25433/26380/29004/29005/1235 đã nhả, không còn process `next dev`/`tsx` của phiên QA.
- Worktree PR: `git status` sạch trước và sau (`apps/builder/.next` do dev server sinh ra đã xoá); head vẫn `2782fe418`.
- Khác biệt môi trường test (không phải lỗi PR): redis test là `redis:7-alpine` không có module Bloom → worker log `ERR unknown command 'BF.RESERVE'` ở listener analytics (MacTrackingService dedup); không ảnh hưởng luồng AI/automated-response.
- Chưa kiểm được tại chỗ: nhánh `isCloud()` bỏ qua env opt-out (cần build cloud) và DNS-rebinding qua DoH (cần internet) — đã có unit test tương ứng.
- Evidence trong `reports/chatbotx/qa/CB-1/evidence/` (01 lint/types, 02 test, 03 CI, 04 static code, 05 E2E AC1 + AC2/AC3, 06 AC5); log thô `/tmp/qa-cb1-*` đã xoá cùng stack.
- Policy PO 2026-11-23 (sau lượt này): ChatbotX **không chạy `check-types`/`check-types:cold` local** nữa — CI Types jobs là cổng type. Verdict này có chạy type check trước khi policy ban hành; các lần verify sau chỉ lint + targeted tests + E2E kèm dẫn chứng CI Types cùng head.

---

# QA Verdict — CB-1 / PR #8 (follow-up: review fixes cho PR #6)

- **PR:** [#8](https://github.com/hvantoan/ChatbotX/pull/8) — `feat/cb-1-openai-compatible-review-fixes`, OPEN, `MERGEABLE`
- **Head verified:** `ecd9f9127d08cb286add2470a38fea357a5113b1`
  - SM báo head `340868793`. QA chạy phần lớn E2E ở `340868793`; **giữa lượt head chuyển sang `ecd9f9127`** (`refactor(openai-compatible): mark unreachable with a dedicated error class`, 4 file, +34/−24). Toàn bộ case bị ảnh hưởng (PATCH unreachable/SSRF/legacy) đã **chạy lại ở head mới**; phần connect-path không bị commit mới chạm tới (diff chỉ 4 file ở update-path).
- **Stack:** compose project `qa-cb1` dựng lại lần 2 (postgres `25433`, redis `26380`, rustfs `29004/29005`), builder `next dev` `3124` chạy từ **worktree tạm của QA** `/tmp/qa-cb1-pr8` (checkout `refs/pull/8/head`) — không dùng/không sửa worktree PR của Dev, không đụng stack owner (12 container `chatbotx-*` vẫn `Up` uptime cũ). Mock provider `127.0.0.1:1235/v1`; token mint thẳng vào DB test.
- **Ngày chạy:** 2026-11-23 (16:2x–18:0x +07:00). Stack đã teardown.

| Repo | Branch/commit |
|---|---|
| ChatbotX | `feat/cb-1-openai-compatible-review-fixes` @ `ecd9f9127` (CI [45158885996](https://github.com/hvantoan/ChatbotX/actions/runs/45158885996)) — trước đó `340868793` (CI [45154490205](https://github.com/hvantoan/ChatbotX/actions/runs/45154490205)) |

## Verdict: PASS (PR #8)

| # | Yêu cầu review | Kết quả | Evidence |
|---|---|---|---|
| 1 | connect endpoint private/loopback → `ssrfBlocked` (không phải `connectionCredentialsRejected`), message không lộ `(code ...)` | **PASS** — `POST /v1/connections` `127.0.0.1` / `169.254.169.254` → `400 {"code":"ssrfBlocked","message":"OpenAI-compatible base URL is not allowed."}` — sạch, không suffix | 07 (B1/B2/D3) |
| 2 | UI connect unreachable → `providerUnreachable`; unsafe/invalid → `invalidBaseUrl`; public PATCH giữ `invalidBaseUrl` | **PASS ở API**, **unit-only ở UI** — PATCH public host/port đóng → `400 invalidBaseUrl "OpenAI-compatible base URL could not be verified."`; PATCH `user:pass@` → `invalidBaseUrl "… is invalid."`; PATCH private → `ssrfBlocked`. Server action không gọi được qua HTTP → dựa vào 3 test mới trong `openai-compatible-actions.test.ts` + đọc code | 07 (D1c/D2/D6), 08 |
| 3 | provider legacy vẫn `connectionCredentialsRejected` | **PASS** — `claude` key sai → `400 connectionCredentialsRejected`; `stripInternalErrorCode` chỉ áp nhánh `openaiCompatible`+`ssrfBlocked` (đúng phạm vi) | 07 (B4/D4) |
| 4 | i18n 21 locale, không lẫn tiếng Anh (trừ zh) | **PASS** — `openaiCompatible.validation.providerUnreachable` có ở **21/21** locale, giá trị dịch thật (ja/ar/vi/de/zh-CN/zh-TW kiểm mẫu); key cũ `invalidBaseURL` giữ nguyên tên, không file nào còn key bị xoá | 08, `apps/builder/messages/*.json` |
| 5 | test PR xanh, lint/check-types sạch, CI xanh | **PASS** — builder 84+39+8, business 49, connections 97 (file service) / 136 (package, env sạch); `pnpm lint` exit 0; `ultracite check` "11445 files, No fixes applied"; CI `ecd9f9127`: Types, Types (apps/packages), Lint, Tests 1–8 đều success | 08 |

## Phát hiện

1. **[ĐÃ SỬA ở `ecd9f9127`, đóng]** Tại `340868793`, PATCH unreachable trả `"… could not be verified. (reason=unreachable)"` — rò marker nội bộ ra message công khai qua `toDisplayMessage()` (`ChatbotXException.data` → `(k=v)`), đúng lớp lỗi PR này định dẹp. Commit `ecd9f9127` thay bằng `OpenaiCompatibleProviderUnreachableError` (không `data`) → message sạch, đã chạy lại xác nhận.
2. **[Còn, ngoài phạm vi PR #8, đã ghi từ PR #1]** Legacy provider vẫn trả `"Invalid Claude API key (code connectionProviderRejected)"`: `stripInternalErrorCode` chỉ chạy trong nhánh `openaiCompatible`+`ssrfBlocked`, nên suffix nội bộ vẫn lộ ở mọi provider khác. Nếu success-metric "không lộ mã nội bộ" áp cho toàn bộ public API thì cần issue riêng.
3. `isOpenaiCompatibleProviderUnreachableError` có fallback `error.name === "…"` cho trường hợp `instanceof` mất qua ranh giới module — hiện không cần (server action catch cùng process) nhưng vô hại. Ghi nhận, không phải lỗi.
4. Nhánh UI (server action) **không kiểm được end-to-end** trên HTTP: test đơn vị phủ 3 nhánh message; muốn chắc phải drive form Next — ngoài khả năng curl, đã nêu rõ thay vì tính PASS tuyệt đối.

## Ghi chú

- **CB-1 tổng thể vẫn CHƯA DONE**: PR 2 (mã hoá `encryptedAuth` 7 bảng + backfill) chưa có. PR #6 PASS + PR #8 PASS chỉ có nghĩa phần public API/SSRF/contract đã đạt.
- **Không chạy `check-types` local** theo policy PO 2026-11-23 → cổng type là CI Types (`ecd9f9127`: success).
- Lần chạy `pnpm --filter @chatbotx.io/connections test` đầu tiên fail 11 test timeout **do shell QA còn export `DATABASE_URL`** trỏ Postgres test khiến 2 suite integration (vốn `describe.skipIf(!databaseUrl)`) chạy thật; chạy lại với env sạch → 136 passed / 27 skipped, exit 0. Không phải lỗi PR.
- Turbo cache lint dùng chung giữa các worktree → `pnpm lint` chỉ replay; đã bù bằng `pnpm exec ultracite check` chạy tươi (exit 0, 11445 file) + `check-invariants` 8107 file.
- Teardown: builder/mock đã stop, `docker compose -p qa-cb1 down -v`, port 3124/25433/26380/29004/29005/1235 nhả; worktree tạm `/tmp/qa-cb1-pr8` và ref tạm `qa-pr8-tmp*` trong repo owner đã xoá.
- **Gate đổi sau lượt này** (Chef, dev-team `2f2db4e6c2`; `projects/chatbotx.json` → `stack.gate`): local chỉ `pnpm lint` + `pnpm check-types`; **không chạy `pnpm test` local**, kể cả trước PR — test suite do CI `.github/workflows/ci.yml`. Mục PR #8 ở trên chạy suite local **trước** khi policy ban hành; các lượt verify sau chỉ ghi link CI run + tự kiểm UI/API/DB.
