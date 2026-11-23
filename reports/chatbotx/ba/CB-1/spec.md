# Spec — CB-1

- **Ticket:** CB-1 — https://vtxsolution.atlassian.net/browse/CB-1
- **Project:** `chatbotx` (`/home/vif/workspace/ChatbotX`)
- **Trạng thái:** PR 1 đã **QA PASS** tại head `2782fe418` (`reports/chatbotx/qa/CB-1/verdict.md`), **merge PR 1 chờ PR 2 (quyết định PO)**; đã cập nhật 2 quyết định PO chốt (`ssrfBlocked` không lộ `(code ...)` khi connect + tách `providerUnreachable` khỏi `invalidBaseURL`); CB-1 tổng thể chờ PR 2 (`encryptedAuth` + backfill) & nghiệm thu bổ sung 2 điểm PO chốt.
- **Ngày cập nhật:** 2026-11-23
- **Nguồn:**
  - `reports/chatbotx/orchestrator/2026-11-23-cb2-refine-cb1/jira-context.md` (description + comment PO `2026-11-23T00:45:40.018+0700` — **comment ưu tiên hơn description khi mâu thuẫn**)
  - `reports/chatbotx/qa/CB-1/verdict.md` (kết quả verify PR #6 / PR 1 ngày 2026-11-23)
  - Quyết định PO (2026-11-23): map `400 ssrfBlocked`, tách `providerUnreachable`, và **item 11** (`OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true` tắt hẳn SSRF guard)
  - Kiểm tra code trực tiếp tại `/home/vif/workspace/ChatbotX`

---

## Mục tiêu nghiệp vụ

Hoàn thiện tích hợp **OpenAI-compatible** và bảo mật khoá API cho toàn bộ AI provider trong ChatbotX theo 2 PR nối tiếp:
1. **PR 1 — Public API, Satellite ID & SSRF guard:**
   - Dùng lại `connections.create` / `connections.delete` cho connect/disconnect (không tạo procedure connect/disconnect riêng), và mở rộng `/v1/integrations/ai` (`getAiProvider`, `updateAiProvider`) cho `openaiCompatible` (scope token `"integrations"`).
   - Sửa lỗi âm thầm ở `ai_agents_create`: `integrations.list` trả parent `Integration.id`, còn worker tìm theo **satellite ID** `IntegrationOpenaiCompatible.id` (`apps/worker/src/lib/ai/reply-model.ts:43`).
   - Bật SSRF guard (`assertPublicUrl`) mặc định trên mọi edition, kèm env opt-out cho self-hosted (`OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS`, bị bỏ qua khi `isCloud()`) để phục vụ preset `lmstudio` mặc định `http://127.0.0.1:1234/v1` khi self-hosted chủ động cho phép.
2. **PR 2 — Mã hoá `auth` mọi AI provider & Backfill:**
   - Mã hoá `auth` cho **mọi AI provider** (`openai`, `claude`, `gemini`, `deepseek`, `muse`, `openrouter`, `openaiCompatible`) tại tầng store binding chung theo convention cột `encryptedAuth`, reader đọc được cả ciphertext lẫn plaintext trong giai đoạn chuyển tiếp, kèm script backfill TypeScript có `--dry-run` (chờ PO duyệt SQL migration và dry-run trước khi apply).

---

## Phạm vi (Scope Allow / Deny)

### Trong scope (Allow — đường dẫn tuyệt đối trong `/home/vif/workspace/ChatbotX`)

**PR 1 — Public API, Satellite ID & SSRF guard:**
- `/home/vif/workspace/ChatbotX/apps/builder/src/features/integrations/schema/ai-provider.ts` — mở rộng `aiProviderPathParam` thêm `"openaiCompatible"`; `getAiProviderRequest` thêm optional `integrationId`; `updateAiProviderRequest` thêm `integrationId` (bắt buộc khi `provider === "openaiCompatible"`), `autoReply`, `enabled`, `name`, `preset` (`openaiCompatibleProviderPresets` ∪ `"custom"`), `defaultModel`, `baseURL`, `apiKey`.
- `/home/vif/workspace/ChatbotX/apps/builder/src/features/integrations/api/public/ai.ts` — route dùng `workspaceTokenAuthAPI` scope `"integrations"`, bảo vệ các route mutating bằng method guard từ chối token `read_only` (không có convention `_confirm`); `getAiProvider(openaiCompatible)` trả `{ data: [...] }` với `id` = satellite `IntegrationOpenaiCompatible.id`, `integrationId` = parent `Integration.id`, và `hasApiKey: boolean` (tuyệt đối không trả `apiKey` hay ciphertext); `get`/`update` nhận cả satellite `id` lẫn parent `integrationId` (qua `findByWorkspaceIdAndAnyId` lọc `workspaceId`), `updateAiProvider(openaiCompatible)` bắt buộc truyền `integrationId` và gọi chung service `updateWithVerification` với UI.
- `/home/vif/workspace/ChatbotX/apps/builder/src/features/integration-openai-compatible/actions/update.action.ts` & `/home/vif/workspace/ChatbotX/packages/business/src/integration-openai-compatible/service.ts` — đồng nhất service method dùng chung giữa UI action và Public API.
- `/home/vif/workspace/ChatbotX/apps/builder/src/features/ai-agents/schema/action.ts` — sửa description trường `integrationId` (dòng 129) sang lấy **satellite ID** từ `integrations.getAiProvider(provider="openaiCompatible")` (trường `data[].id`, không dùng `integrations.list` vốn trả parent `Integration.id`).
- `/home/vif/workspace/ChatbotX/packages/business/src/integration-openai-compatible/validate-base-url.ts` & `/home/vif/workspace/ChatbotX/.env.example` — bật `assertPublicUrl` trên mọi edition; chỉ opt-out khi `!isCloud()` và bật `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS` (luôn bỏ qua env này khi `isCloud()`).
- `/home/vif/workspace/ChatbotX/packages/connections/src/credentials.ts` & `/home/vif/workspace/ChatbotX/apps/builder/src/features/integration-openai-compatible/actions/connect.action.ts` (kèm i18n messages) — map `400 ssrfBlocked` khi connect URL private qua `POST /api/v1/connections` (không trả `connectionCredentialsRejected`, message không lộ `(code ...)`), và tách lỗi/thông điệp `providerUnreachable` khỏi `invalidBaseURL` khi UI connect không liên lạc được endpoint.
- `/home/vif/workspace/ChatbotX/apps/builder/__tests__/api-parity-manifest.json` — chuyển 4 entry `integration-openai-compatible/*` (dòng 261–264) từ `private:` sang `covered:connections` / `covered:integrations`.
- `/home/vif/workspace/ChatbotX/apps/builder/__tests__/integrations-public-api.test.ts`, snapshot OpenAPI/spec, `/home/vif/workspace/ChatbotX/apps/cli/README.md`, `/home/vif/workspace/ChatbotX/apps/mcp-server/`, `/home/vif/workspace/ChatbotX/docs/openai-compatible.md`.

**PR 2 — Mã hoá `auth` mọi AI provider & Backfill:**
- `/home/vif/workspace/ChatbotX/packages/database/src/schema/integration-{openai,claude,gemini,deepseek,muse,openrouter,openai-compatible}.ts` & `/home/vif/workspace/ChatbotX/packages/database/drizzle/` — thêm cột `encryptedAuth` (theo convention `woocommerce`/`shopify`/`meta-catalog`); **chỉ generate & inspect SQL migration, chờ PO duyệt trước khi apply**.
- `/home/vif/workspace/ChatbotX/packages/business/src/connection/store-bindings.ts` & `/home/vif/workspace/ChatbotX/packages/business/src/connection/store-bindings-channels.ts` — mã hoá khi ghi (`insertRow`, `saveAuthByForeignKey`), giải mã khi đọc (`loadAuthByForeignKey`) hỗ trợ cả ciphertext và plaintext cũ trong giai đoạn chuyển tiếp.
- Giải mã ở tầng business/app trước khi truyền key vào `packages/ai`:
  - `/home/vif/workspace/ChatbotX/packages/business/src/integration-openai-compatible/service.ts`
  - `/home/vif/workspace/ChatbotX/apps/builder/src/features/integration-openai-compatible/actions/update.action.ts`
  - `/home/vif/workspace/ChatbotX/packages/ai/src/server/factory.ts`
  - `/home/vif/workspace/ChatbotX/packages/ai/src/server/openai-compatible.ts`
  - `/home/vif/workspace/ChatbotX/packages/ai/src/server/embedding-model.ts`
  - `/home/vif/workspace/ChatbotX/packages/ai/src/server/muse-transcribe.ts`
  - `/home/vif/workspace/ChatbotX/apps/worker/src/heavy/handlers/segment-image.ts`
  - `/home/vif/workspace/ChatbotX/apps/worker/src/lib/ai/reply-model.ts`
- `/home/vif/workspace/ChatbotX/packages/database/scripts/` — script backfill TypeScript (mẫu `backfill-connections`) có `--dry-run`; **chỉ chạy dry-run kiểm tra, chờ PO duyệt mới apply**.

### Ngoài scope / Non-goals (Deny)
- Không tạo procedure mới `integrations.openaiCompatible.connect` / `disconnect` (dùng lại `connections.create` / `connections.delete`).
- Không thêm reference-guard chặn disconnect khi AI agent đang tham chiếu integration (chỉ ghi chú rủi ro runtime trong docs).
- Không để `packages/ai` import `@chatbotx.io/encryption` (giải mã ở tầng business/repository rồi truyền `apiKey` vào, giữ `createOpenaiCompatibleModelInstance` sync).
- Không ghi ciphertext trực tiếp vào cột `auth` jsonb có type `AuthValue`.
- Không mã hoá credential của integration không phải AI.
- Không sửa schema `ai_agents_create` (chỉ sửa description `integrationId`); không mở PR upstream.
- **Cấm tuyệt đối:** không tự chạy `db:migrate` hoặc chạy script backfill chế độ apply lên DB dùng chung khi chưa có PO duyệt.

---

## Acceptance Criteria

| # | AC | Vai trò/user | Cách kiểm |
|---|---|---|---|
| AC1 | Chạy được qua MCP/Public API end-to-end đủ 6 bước với đúng token scope từng nhóm endpoint (`connections.*` và `integrations.*` dùng scope `"integrations"`; `/api/v1/ai-agents` dùng scope `"automation"`; `/api/v1/webchats` dùng scope `"channels"` — luồng E2E đầy đủ dùng token unrestricted hoặc đủ 3 scope; lưu ý path thực tế trên Next là `/api/v1/...`, gọi thẳng `/v1/...` không qua caddy rewrite sẽ bị `307` về `/auth/sign-in`): `connections_create(openaiCompatible)` → `integrations_get_ai_provider(provider="openaiCompatible")` trả về **satellite ID** (`data[].id` = `IntegrationOpenaiCompatible.id`, kèm `integrationId` = parent) → `integrations_update_ai_provider(provider="openaiCompatible", integrationId=<satelliteId>, autoReply=true)` → `ai_agents_create` (`kind: "openaiCompatible"`, `integrationId: <satelliteId>`) → agent trả lời tin nhắn thử → `connections_delete`. Description của `ai_agents_create` trỏ đúng `integrations.getAiProvider` (satellite ID), không trỏ `integrations.list` | Agent / API client | MCP/API E2E test 6 bước qua `/api/v1/...` (token đủ scope); kiểm tra token chỉ có `{integrations}` bị 403 ở `/api/v1/ai-agents`; kiểm tra schema `ai_agents_create` |
| AC2 | Token `read_only` bị từ chối ở mọi procedure mutating qua HTTP method guard (`GET`/`HEAD` only trong `workspaceTokenAuthMidddleware` — không dùng `_confirm`); response của `getAiProvider` / `updateAiProvider` / `connections` không bao giờ chứa `apiKey` hay ciphertext, chỉ trả `hasApiKey: boolean` | Security / API client | Test token `read_only` bị `403 FORBIDDEN` (kể cả `POST`, `PATCH`, `DELETE`); assert payload response chỉ có `hasApiKey`, không có `auth`/`apiKey` |
| AC3 | `updateAiProvider` với `provider="openaiCompatible"` thiếu `integrationId` trả lỗi validation; có `integrationId` (satellite hoặc parent) cập nhật đúng instance (`autoReply`, `enabled`, `name`, `preset` validate theo `openaiCompatibleProviderPresets` ∪ `"custom"`, `defaultModel`, `baseURL` chạy lại SSRF, `apiKey`) qua cùng service `updateWithVerification` với UI action | Agent / API client | Test trong `integrations-public-api.test.ts` với case thiếu/có `integrationId` |
| AC4 | Sau migration `encryptedAuth` và backfill (được PO duyệt), mọi row ở cả 7 bảng AI provider (`openai`, `claude`, `gemini`, `deepseek`, `muse`, `openrouter`, `openaiCompatible`) không còn `auth` plaintext (`secretTextAuthSchema.safeParse` trên giá trị thô thất bại); trong giai đoạn chuyển tiếp trước backfill, reader đọc được cả ciphertext lẫn plaintext và luồng AI vẫn gọi được provider | Security / Runtime | Kiểm tra SQL migration + dry-run backfill + query DB sau apply + test dual-format reader & AI runtime |
| AC5 | SSRF guard (`assertPublicUrl`) bật mặc định trên mọi edition: chặn `http://127.0.0.1:11434/v1` và `http://127.0.0.1:1234/v1` (preset `lmstudio`) cả trên self-hosted lẫn cloud khi chưa opt-out — cả `POST /api/v1/connections` lẫn `PATCH /api/v1/integrations/ai/openaiCompatible` đều trả **`400 ssrfBlocked`** (không giữ `connectionCredentialsRejected`) và **message không lộ mã nội bộ `(code ...)`**; đặt `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true` trên self-hosted sẽ tắt hẳn SSRF guard — **kể cả link-local `169.254.169.254`** (intentional opt-out scope decision của PO ở item 11, đúng như docs mô tả, không thêm chặn riêng), nhưng env này bị bỏ qua hoàn toàn khi `isCloud()`. Trên UI connect, khi endpoint không truy cập được (fail-closed) trả lỗi/thông điệp riêng `providerUnreachable`, tách khỏi `invalidBaseURL` | Security / Self-hosted ops / UI | Unit/API test cho cả 3 case (cloud, self-hosted mặc định, self-hosted có env); assert `POST /api/v1/connections` & `PATCH` trả `400 ssrfBlocked` và message không chứa `(code ...)`; test UI `connect.action.ts` tách `providerUnreachable` vs `invalidBaseURL`; `.env.example` và docs khớp tên env và mã lỗi |
| AC6 | `api-parity-manifest.json` không còn entry `private:` cho `integration-openai-compatible/*`; `pnpm lint`, `pnpm check-types` (hoặc `check-types:cold`), test builder (gồm `integrations-public-api.test.ts`), snapshot spec đã regenerate và `cli-mcp-docs` pass | Developer / QA | Chạy lệnh kiểm tra tại `/home/vif/workspace/ChatbotX` và kiểm tra diff manifest/snapshot |

---

## Rule nghiệp vụ

1. **Scope & Auth (không có `_confirm`):**
   - Public API `/api/v1/integrations/ai` và `/api/v1/connections` dùng `workspaceTokenAuthAPI` với scope `"integrations"`; các nhóm endpoint khác trong luồng E2E giữ đúng scope của mình (`/api/v1/ai-agents` dùng `"automation"`, `/api/v1/webchats` dùng `"channels"`). Lưu ý prefix công khai thực tế của app Next là `/api/v1/...` (prod có caddy rewrite `/v1/...` → `/api/v1/...`; gọi thẳng `/v1/...` vào Next bị `307` về `/auth/sign-in`).
   - Bảo vệ mutating route bằng HTTP method guard của token `read_only` (`READ_ONLY_TOKEN_ALLOWED_METHODS = { GET, HEAD }` tại `authorize-workspace-access.ts:38`); **không có convention `_confirm` trong repo**.
   - Response không bao giờ trả `apiKey` hoặc ciphertext — chỉ trả `hasApiKey: boolean`.
2. **Parent `Integration.id` vs Satellite `IntegrationOpenaiCompatible.id`:**
   - `integrations.list` trả `Integration.id` (bảng cha), còn worker (`apps/worker/src/lib/ai/reply-model.ts:43`) tìm **bắt buộc theo satellite ID** (`IntegrationOpenaiCompatible.id`).
   - `getAiProvider` / `updateAiProvider` chấp nhận cả satellite `id` lẫn parent `integrationId` (superset qua `findByWorkspaceIdAndAnyId`, lọc `workspaceId`), nhưng trả về rõ `id` = satellite `IntegrationOpenaiCompatible.id` và `integrationId` = parent `Integration.id`. Client/agent **bắt buộc dùng `data[].id` (satellite ID)** khi gọi `aiAgents.create`.
   - `connections.create` tạo instance với `autoReply = false`; agent chỉ trả lời khi `enabled && autoReply`, nên cần `updateAiProvider(..., autoReply: true)`.
3. **Validation & Preset:**
   - `preset` validate theo `openaiCompatibleProviderPresets` ∪ `"custom"`; với `preset !== "custom"`, giữ partial unique index `IntegrationOpenaiCompatible_workspaceId_preset_key`.
   - `updateAiProvider` khi đổi `baseURL` phải chạy lại SSRF guard; khi đổi `baseURL` sang origin khác phải gửi `apiKey` mới; khi không truyền `apiKey` (cùng origin), giữ nguyên key hiện có.
4. **SSRF, Opt-out & Mã lỗi đã chốt (theo quyết định PO):**
   - Bỏ gate `isCloud()` ở `validateOpenaiCompatibleBaseUrlForEnvironment`; chỉ cho phép bỏ qua `assertPublicUrl` khi `!isCloud()` và `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true` được bật.
   - **Intentional opt-out scope (PO item 11):** Khi `!isCloud()` và `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true`, SSRF guard được tắt hẳn — **kể cả địa chỉ link-local `169.254.169.254`**, giữ nguyên hành vi hiện tại đúng như `docs/openai-compatible.md` mô tả; **không thêm lớp chặn riêng** khi opt-out đang bật (đây là quyết định scope có chủ đích của PO, không phải gap/lỗi). Trên `isCloud()`, env này luôn bị bỏ qua.
   - **Connect private trả `400 ssrfBlocked`:** Cả `POST /api/v1/connections` (`packages/connections/src/credentials.ts`) lẫn `PATCH /api/v1/integrations/ai/openaiCompatible` khi bị SSRF guard chặn đều phải trả `400 ssrfBlocked` (không giữ `connectionCredentialsRejected`), và **message công khai không được lộ mã nội bộ `(code ...)`**.
   - **UI connect fail-closed (`connect.action.ts`):** Tách `providerUnreachable` khỏi `invalidBaseURL` với message riêng khi endpoint không truy cập được/timeout/5xx (phân biệt với URL sai hoặc bị chặn SSRF).
5. **Migration & Rollout PR 2:**
   - Thêm cột `encryptedAuth` thay vì ghi ciphertext vào cột `auth` jsonb; reader hỗ trợ đọc dual-format trong giai đoạn chuyển tiếp.
   - SQL migration và script backfill TypeScript (`--dry-run`) phải trình PO duyệt trước khi apply.

---

## Steps / luồng chính

1. **PR 1 — Public API + SSRF (đã code xong tại PR #6, đang bổ sung test gap + E2E):**
   - Bật `assertPublicUrl` mọi edition + opt-out `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS` (chỉ `!isCloud()`), cập nhật `.env.example` & `docs/openai-compatible.md`.
   - Dùng chung `integrationOpenaiCompatibleService.updateWithVerification` giữa UI `update.action.ts` và Public API `updateAiProvider`.
   - Mở rộng `aiProviderPathParam`, `getAiProvider` (`{ data: [...] }`), `updateAiProvider` (bắt buộc `integrationId`) tại `/v1/integrations/ai`.
   - Sửa description `integrationId` của `ai_agents_create`.
   - Cập nhật `api-parity-manifest.json`, regenerate snapshot spec, chạy `cli-mcp-docs`, bổ sung test `integrations-public-api.test.ts` + test SSRF.
2. **PR 2 — Mã hoá mọi AI provider + Backfill:**
   - Sinh schema migration cột `encryptedAuth` cho 7 bảng AI provider (trình PO duyệt SQL trước khi apply).
   - Cập nhật `store-bindings.ts` (`insertRow`, `saveAuthByForeignKey`, `loadAuthByForeignKey`) mã hoá khi ghi vào `encryptedAuth`, đọc dual-format (ciphertext + plaintext cũ); cập nhật các reader (`factory.ts`, `openai-compatible.ts`, `embedding-model.ts`, `muse-transcribe.ts`, `segment-image.ts`, `update.action.ts`) nhận `apiKey` đã giải mã từ tầng business/repository.
   - Viết & chạy `--dry-run` script backfill TypeScript, trình PO duyệt trước khi apply thật.

---

## Gap test cần bổ sung & Phát hiện QA (PR 1 @ `2782fe418` — Verdict PASS PR 1, merge PR 1 chờ PR 2)

1. **Bổ sung theo quyết định PO #1 — Map `400 ssrfBlocked` & lọc message trên `POST /api/v1/connections`:** Ở head `2782fe418`, connect URL private đang trả `400 connectionCredentialsRejected` kèm chuỗi lộ mã nội bộ `"(code connectionProviderRejected)"`. Cần sửa để trả `400 ssrfBlocked`, bỏ `(code ...)` trong message công khai, cập nhật `docs/openai-compatible.md` và bổ sung test API tương ứng.
2. **Bổ sung theo quyết định PO #2 — Tách `providerUnreachable` trên UI connect:** Ở head `2782fe418`, `connect.action.ts` gộp trường hợp endpoint không truy cập được vào `invalidBaseURL`. Cần tách lỗi/message `providerUnreachable` riêng (kèm i18n & test `openai-compatible-actions.test.ts`).
3. **Gap bằng chứng — Test tự động `PATCH /api/v1/integrations/ai/{provider}` với token `read_only`:** Đã kiểm chứng chạy thật trong E2E (trả `403` trước handler theo allow-list `GET|HEAD`), nhưng test tự động hiện có mới phủ `POST` và `DELETE` (`/api/v1/connections`) — cần bổ sung test cho `PATCH /api/v1/integrations/ai/openaiCompatible` với token `read_only`.
4. **PR 2 (AC4) chưa triển khai:** 0/7 bảng AI provider có `encryptedAuth`, chưa có backfill script — **CB-1 tổng thể chưa thể đóng/merge hoàn tất cho tới khi PR 2 xong và PO duyệt SQL/backfill** (merge PR 1 đang chờ PR 2).
5. **Ghi nhận hiệu năng UI connect (mức thấp):** Connect qua UI hiện probe `/models` hai lần (`verifyOpenaiCompatibleProvider` rồi `fromCredentials`); giữ ghi nhận tối ưu sau nếu cần.
6. **Đã chốt hành vi `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true` (PO item 11 — đóng mọi nghi vấn/pending):** PO xác nhận giữ nguyên hành vi tắt hẳn SSRF guard khi bật opt-out trên self-hosted, kể cả `169.254.169.254` (đúng như `docs/openai-compatible.md`); không phát sinh việc sửa code chặn link-local.

---

## Trường hợp biên & ngoại lệ

- `PATCH /v1/integrations/ai/openaiCompatible` thiếu `integrationId` → lỗi validation; truyền ID của workspace khác → `404` (`findByWorkspaceIdAndAnyId` lọc `workspaceId`).
- Client dùng nhầm parent `Integration.id` cho `aiAgents.create` (dù `get`/`update` vẫn nhận) → worker không tìm thấy satellite `IntegrationOpenaiCompatible.id` và im lặng không trả lời.
- Update `baseURL` không gửi kèm `apiKey` mới → cùng origin thì giải mã key đang lưu để verify; khác origin bắt buộc gửi `apiKey` mới.
- Disconnect integration đang gắn với AI agent → cho phép xoá, agent fail lúc runtime (ghi rõ trong `docs/openai-compatible.md`).
- Deploy code PR 2 trước khi chạy xong backfill → reader đọc dual-format đảm bảo mọi AI provider không bị gián đoạn.

---

## Rủi ro

- **Migration SQL & Backfill (chặn cứng):** Chạm 7 bảng AI provider (`openai`, `claude`, `gemini`, `deepseek`, `muse`, `openrouter`, `openaiCompatible`); bắt buộc chờ PO duyệt SQL migration và log `--dry-run` backfill.
- **Sót reader `secretTextAuthSchema`:** Đã xác định thêm `embedding-model.ts`, `muse-transcribe.ts`, `segment-image.ts` ngoài `factory.ts` và `openai-compatible.ts` — cần đảm bảo sửa đủ khi chuyển sang `encryptedAuth`.
- **Public manifest & snapshot:** Mở 4 entry `integration-openai-compatible/*` sang `covered:` yêu cầu regenerate snapshot OpenAPI/MCP đồng bộ.
- **SSRF & `lmstudio` / opt-out self-hosted:** Preset `lmstudio` mặc định `http://127.0.0.1:1234/v1` sẽ bị chặn trên self-hosted nếu không bật `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true`; ngược lại khi bật opt-out trên self-hosted, toàn bộ SSRF guard (gồm `169.254.169.254`) được tắt hẳn theo intentional scope decision của PO (item 11) — tự mở SSRF trên self-hosted là đánh đổi có chủ đích đã ghi rõ trong docs.
- **Satellite ID mismatch:** `get`/`update` nhận cả parent `Integration.id` có thể làm client tưởng parent ID dùng được ở mọi nơi rồi truyền nhầm vào `aiAgents.create`.

---

## Done when (Điều kiện hoàn thành)

- PR 1 & PR 2 pass `pnpm lint`, `pnpm check-types` (hoặc `check-types:cold`), `integrations-public-api.test.ts` (đã bổ sung test `PATCH` với `read_only` token) và bộ test liên quan.
- Kịch bản MCP E2E 6 bước (AC1) chạy pass trên stack kiểm thử từ worktree PR.
- `api-parity-manifest.json` không còn `private:` cho `integration-openai-compatible/*`; snapshot spec & `cli-mcp-docs` đã cập nhật.
- SQL migration `encryptedAuth` + backfill `--dry-run` được PO duyệt, apply xong và kiểm tra 0 row AI provider còn `auth` plaintext.
- QA `reports/chatbotx/qa/CB-1/verdict.md` đạt **PASS**.

---

## Cập nhật docs sau khi DONE

- [ ] SRS: `docs/chatbotx/srs/integration-openai-compatible.md` — ghi nhận API `/api/v1/integrations/ai` (satellite ID vs parent ID), SSRF guard (`400 ssrfBlocked` thống nhất cho connect & update, không lộ `(code ...)`) + `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS`, tách `providerUnreachable` trên UI connect, lưu ý disconnect, và mã hoá `encryptedAuth`.
- [ ] ADR: quyết định dùng `encryptedAuth` tại `store-bindings.ts` cho toàn bộ AI providers.

---

## Open Questions (chỉ giữ điểm thật sự chưa chốt)

*(Đã đóng OQ1 về mã lỗi SSRF trên `POST /api/v1/connections` → PO chốt map `400 ssrfBlocked` không lộ `(code ...)`; đã đóng OQ2 về UI connect fail-closed → PO chốt tách `providerUnreachable` khỏi `invalidBaseURL`.)*

1. **Env mã hoá ở self-hosted (PR 2):** Ngoài `ENCRYPTION_KEY` (`.env.example:87`), `@chatbotx.io/encryption` có yêu cầu biến môi trường nào khác trên bản self-hosted cần ghi vào `.env.example` không?
