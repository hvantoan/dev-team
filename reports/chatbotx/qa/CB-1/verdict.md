# QA Verdict — CB-1 (PR 1: Public API OpenAI-compatible + satellite ID + SSRF)

- **Ticket/Key:** CB-1 — https://vtxsolution.atlassian.net/browse/CB-1
- **Phạm vi verdict:** **chỉ PR 1** (public API + satellite ID + SSRF). PR 2 (mã hoá `encryptedAuth` 7 bảng AI provider + backfill) chưa có trong nhánh → **CB-1 tổng thể CHƯA DONE, không PASS toàn CB-1.**
- **Stack:** không dựng stack riêng — port cố định của project (3123/25432/26379/8025/29000) đang bị stack của owner chiếm (`docker compose` chatbotx-* + `turbo dev` pid 684753 tại `/home/vif/workspace/ChatbotX`, nhánh main). Không restart/down container của owner, không đổi port.
- **Ngày chạy:** 2026-11-23 (14:30–14:40 +07:00)

| Repo | Branch/commit |
|---|---|
| ChatbotX (`/home/vif/workspace/worktrees/ChatbotX-cb-1-openai-compatible-api-ssrf`) | `feat/cb-1-openai-compatible-api-ssrf` @ `2782fe41815cebbe13544c68e59465fe4789252e` (worktree sạch trước và sau khi kiểm) |
| PR #6 | OPEN, `MERGEABLE`, base `main`, head `2782fe418` |

## Verdict: BLOCKED

Lý do: AC1 (E2E 6 bước qua Public API/MCP) **chưa chạy được** vì không có stack riêng an toàn — xem "Ghi chú". AC2/AC3/AC5/AC6 đạt bằng chứng độc lập (code + test + CI tại đúng head). AC4 ngoài phạm vi PR 1.

## Tài khoản test

| Vai trò | User | Quyền trên endpoint |
|---|---|---|
| Có quyền | — (không chạy E2E) | — |
| Không quyền | — (không chạy E2E) | — |

Đường dẫn read-only đã kiểm thay thế: token `read_only` bị chặn ở `workspaceTokenAuthMidddleware` theo HTTP method (chỉ `GET`/`HEAD`), trước khi vào handler.

## Done-conditions

| # | Điều kiện | Kết quả | Evidence |
|---|---|---|---|
| AC1 | E2E 6 bước: `connections.create` → `getAiProvider` trả satellite ID → `updateAiProvider(autoReply=true)` → `aiAgents.create` → agent trả lời → `connections.delete`; description `ai_agents_create` trỏ `integrations.getAiProvider` | **BLOCKED** (E2E chưa chạy) — phần tĩnh PASS: satellite ID được trả (`data[].id` = `IntegrationOpenaiCompatible.id`), worker resolve đúng theo satellite ID, description đã sửa | evidence/04-static-code-evidence.txt; `apps/builder/__tests__/integrations-public-api.test.ts:659,691` (128 test builder pass); `apps/worker/src/lib/ai/reply-model.ts:43` |
| AC2 | Token `read_only` bị từ chối ở mọi procedure mutating; response không chứa `apiKey`/ciphertext, chỉ `hasApiKey` | **PASS** (code + test) — `READ_ONLY_TOKEN_ALLOWED_METHODS = {GET, HEAD}`; `POST`/`DELETE` có test trực tiếp, `PATCH` cùng đường middleware (không có test riêng cho PATCH — xem Ghi chú); response map chỉ chọn field an toàn, `auth` chỉ thành `Boolean()` | evidence/04-static-code-evidence.txt; `authorize-workspace-access.ts:38`; `connections-public-permission.test.ts:172`; `workspace-token-auth-middleware.test.ts:275,297` |
| AC3 | `updateAiProvider(openaiCompatible)` thiếu `integrationId` → lỗi validation; có thì update đúng instance, preset theo enum ∪ `custom`, `baseURL` chạy lại SSRF, dùng chung service với UI | **PASS** — `superRefine` chặn thiếu `integrationId` (và chặn field openaiCompatible cho provider legacy); API và UI cùng gọi `integrationOpenaiCompatibleService.updateWithVerification` | `schema/ai-provider.ts` (updateAiProviderRequest); `api/public/ai.ts` handler; `update.action.ts`; test `integrations-public-api.test.ts:763,776,828,871` |
| AC4 | 7 bảng AI provider không còn `auth` plaintext sau migration + backfill | **FAIL — ngoài PR 1** (PR 2 chưa có): 0/7 schema có cột `encryptedAuth`, không có script backfill AI, `store-bindings` vẫn ghi `auth` plaintext | evidence/04-static-code-evidence.txt (mục AC4) |
| AC5 | SSRF bật mặc định mọi edition; `127.0.0.1:11434/1234` bị chặn; env opt-out chỉ self-hosted, bị bỏ qua khi `isCloud()`; `.env.example` có biến | **PASS (lệch mã lỗi trên đường connect — xem Phát hiện 1)** — `if (!isCloud() && allowPrivateOpenaiCompatibleUrls()) return` rồi `assertPublicUrl`; 3 case (cloud, self-host mặc định, self-host + env) có test; `.env.example` +10 dòng | `validate-base-url.ts:38`; `packages/business/__tests__/integration-openai-compatible-base-url.test.ts:57,75,92`; `credential-providers.test.ts` (SSRF suite); `.env.example` |
| AC6 | Manifest không còn `private:` cho `integration-openai-compatible/*`; lint, check-types, test builder, snapshot, cli-mcp-docs pass | **PASS** — 0 entry `private:`; 4 entry đổi sang `covered:connections`/`covered:integrations`; lint exit 0, check-types exit 0 (69/69 task), test 48 + 128 + 60 pass; snapshot operations không đổi (đúng: không thêm/đổi operationId) | evidence/01-lint-check-types.log; evidence/02-tests-targeted.log; evidence/03-ci-run-45126421011.txt; evidence/04-static-code-evidence.txt |

## Lệnh đã chạy (độc lập, tại worktree, head `2782fe418`)

```bash
pnpm lint                 # exit 0
pnpm check-types          # exit 0 — 69 tasks successful
pnpm --filter @chatbotx.io/business test integration-openai-compatible credential-providers.test.ts
                          # 4 files, 48 passed
pnpm --filter builder exec vitest run __tests__/integrations-public-api.test.ts \
  __tests__/ai-agent-action-schema.test.ts __tests__/openai-compatible-actions.test.ts \
  __tests__/openai-compatible-provider-verify.test.ts __tests__/api-parity-manifest.test.ts \
  __tests__/public-spec-operations.test.ts __tests__/public-spec-mcp.test.ts
                          # 7 files, 128 passed
pnpm --filter chatbotx test
                          # 5 files, 60 passed
```

Đối chiếu CI: run [45126421011](https://github.com/hvantoan/ChatbotX/actions/runs/45126421011) tại đúng head `2782fe418` — Lint, Types, Types (apps), Types (packages), Tests (1/8…8/8), Tests đều `pass`. Khớp với kết quả chạy lại tại chỗ; không phát hiện khác biệt local ↔ CI.

## Đối chiếu

- **Diff ↔ AC1/AC2/AC3/AC5/AC6:** khớp. `aiProviderPathParam` thêm `openaiCompatible`; `getAiProvider` trả `{ data: [...] }` với `id` = satellite, `integrationId` = parent, `hasApiKey`; `updateAiProvider` bắt buộc `integrationId`, nhận 7 field; SSRF default-on + opt-out; manifest + docs cập nhật.
- **Satellite ID ↔ worker:** `apps/worker/src/lib/ai/reply-model.ts:43` tra `integrationOpenaiCompatibleService.findByWorkspaceIdAndId` (satellite `id`) và yêu cầu `enabled && autoReply` — đúng hợp đồng AC1. Worker đọc thẳng DB (không cache) nên `PATCH autoReply=true` có hiệu lực ngay; không cần `invalidateCache` như 5 provider legacy.
- **Output ↔ bí mật:** `toOpenaiCompatibleResource`/`toResource` chỉ map field an toàn, `hasApiKey: Boolean(row.auth)` → không rò `auth`/`apiKey`/`workspaceId`.
- **Đa tenant:** `findByWorkspaceIdAndAnyId` lọc `workspaceId` ở cả 2 nhánh (satellite id và parent integrationId) → id của workspace khác trả 404, không lộ chéo.
- **Manifest/snapshot/docs:** 0 `private:`; snapshot `public-spec-operations` pin `(operationId, method, path)` nên không đổi là đúng (không thêm operation); `docs/openai-compatible.md` mới (lifecycle, cảnh báo nâng cấp self-hosted, rủi ro disconnect) + `apps/cli/README.md`.
- **DB:** không chạy query — không dựng stack (xem Ghi chú).

## Regression đã kiểm

- 401/403: `read_only` bị `FORBIDDEN` theo HTTP method ở middleware chung (test sẵn có cho `POST`/`DELETE` `/v1/connections` + middleware); không thay đổi hành vi auth trong PR.
- Endpoint liền kề: 5 provider legacy giữ nguyên hành vi (`legacyAiProviderPathParam`, `legacyAiProviderRequest` cho `PUT`/`DELETE` deprecated; `Records` siết kiểu để không thêm provider mới mà thiếu updater); snapshot operations không đổi → không đổi operationId/path nào.
- Schema drift: `@chatbotx.io/database` lint `check-schema-drift.mjs` chạy trong `pnpm lint` → exit 0, "Schema is in sync".
- Không có migration/DB ghi trong PR (đúng: PR 1 không chạm schema).

## Phát hiện

1. **Lệch mã lỗi SSRF trên đường `POST /v1/connections` (thấp, không phải lỗ hổng).** AC5 và success-metric Jira ghi connect `127.0.0.1` trả `400 ssrfBlocked`; thực tế `packages/connections/src/credentials.ts:114-127` bọc mọi lỗi provider thành `connectionCredentialsRejected` (400). Guard vẫn chặn (không probe endpoint), nhưng client dựa vào mã `ssrfBlocked` sẽ không thấy. `400 ssrfBlocked` chỉ có trên `PATCH /v1/integrations/ai/openaiCompatible`. Docs đã mô tả đúng thực tế. **Cần PO chốt: sửa spec/docs hợp đồng lỗi, hay map riêng `ssrfBlocked` cho connect.**
2. **Tên env khác spec:** `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS` thay cho `ALLOW_PRIVATE_AI_BASE_URLS` (spec ghi "tên dự kiến"); `.env.example` + docs đã theo tên thực tế. Chấp nhận được, chỉ cần đồng bộ spec/Jira.
3. **`_confirm` không tồn tại trong repo** (grep `apps/builder/src` chỉ ra 3 match không liên quan: `order_confirm…`) → Open Question #2 của spec coi như đóng; mutating vẫn được bảo vệ bằng method guard của token `read_only`.
4. **`integrationId` nhận cả parent `Integration.id`** (superset spec) ở `get`/`update`; `aiAgents.create` vẫn bắt buộc satellite `id` (worker tra theo satellite). Không rủi ro bảo mật, nhưng client có thể "đúng mà sai" khi tạo agent nếu dùng parent id → đã ghi rõ trong description + docs.
5. **Thiếu test khẳng định `PATCH /v1/integrations/ai/{provider}` bị chặn với token `read_only`** (test hiện có chỉ phủ `POST`/`DELETE`). Hành vi đúng theo code (allow-list `GET|HEAD`), nhưng đây là gap bằng chứng, không phải lỗi.
6. **Gia cố ngoài spec (chấp nhận):** chặn `user:pass@` trong base URL; verify `/models` dùng `redirect: "manual"` (chặn 3xx); đổi `baseURL` khác origin bắt buộc gửi `apiKey` mới; đồng bộ `Connection.sourceId/displayName`; map lỗi `conflict`/`presetAlreadyConnected`/`connectionAlreadyConnected`.
7. **Đổi hành vi UI connect: fail-closed khi endpoint không truy cập được (trung bình, cần PO biết).** `verifyOpenaiCompatibleProvider` chuyển từ builder sang `packages/business` và bỏ nhánh "lưu được kèm cảnh báo" (`ok: true, warning: "could_not_verify"`). Trước: endpoint down/timeout/5xx vẫn connect/save được. Sau: `connect.action.ts` coi `unreachable` là lỗi validation và trả thông điệp `openaiCompatible.validation.invalidBaseURL` ("Base URL is invalid or not allowed") — client/người dùng không phân biệt được "URL sai/bị chặn" với "server đang tắt". Luồng `PATCH` được giảm nhẹ (chỉ probe khi đổi key/baseURL), nhưng connect UI thì chặn hẳn. Đây là hướng an toàn và khớp `connections.create`, nhưng là thay đổi người dùng thấy được, ngoài danh sách AC → cần xác nhận + tách thông điệp lỗi riêng (`providerUnreachable`) nếu PO muốn.
8. **Probe `/models` hai lần khi connect qua UI (thấp).** `connect.action.ts` gọi `verifyOpenaiCompatibleProvider` rồi `connectionService.connectFromCredentials` (nhánh `openaiCompatibleConnectionProvider.fromCredentials` cũng probe `/models`) → 2 request, 2 timeout 10s nối tiếp khi endpoint chậm/tắt. Chỉ ảnh hưởng độ trễ UX, không ảnh hưởng đúng/sai nghiệp vụ.

## Ghi chú

- **Điều kiện để chạy AC1 (E2E 6 bước):** cần một stack ChatbotX riêng dựng từ worktree PR (builder + postgres + redis + filesystem + worker) hoặc owner nhả stack hiện tại. Hiện `docker compose` chatbotx-* (caddy 3123, postgres 25432, redis 26379, filesystem 29000, mailhog 8025) và `turbo dev` pid 684753 đang chạy từ `/home/vif/workspace/ChatbotX` (main) — gọi cổng 3123 sẽ kiểm code main, không phải PR, và luật QA không cho đổi port/khởi động `next` trực tiếp khi port bận. Ngoài ra bước "agent trả lời tin nhắn thử" cần một endpoint OpenAI-compatible thật (hoặc mock server HTTP công khai) + worker đang chạy.
- **PR 2 (AC4) chưa có:** 0/7 bảng AI provider có `encryptedAuth`, không có script backfill AI, `apiKey` vẫn plaintext trong DB. **Không merge/đóng CB-1 như đã xong bảo mật.**
- Không chạy `db:migrate`, không chạy backfill, không sửa file nào trong worktree (`git status` sạch trước/sau).
- Evidence nhẹ trong `reports/chatbotx/qa/CB-1/evidence/`; log đầy đủ tại `/tmp/qa-cb1-lint-types.log`, `/tmp/qa-cb1-tests.log`, `/tmp/pr6.diff`.
