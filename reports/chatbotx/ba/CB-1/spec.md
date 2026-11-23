# Spec — CB-1

- **Ticket:** CB-1 — https://vtxsolution.atlassian.net/browse/CB-1
- **Project:** `chatbotx` (`/home/vif/workspace/ChatbotX`)
- **Trạng thái:** DRAFT — chờ PO (anh Văn Toàn) clear `spec.md` (Jira đang `In Progress`, assignee Hồ Văn Toàn; **không tự clear**)
- **Ngày viết:** 2026-11-23
- **Nguồn:**
  - `reports/chatbotx/orchestrator/2026-11-23-cb2-refine-cb1/jira-context.md` (description + comment PO `2026-11-23T00:45:40.018+0700` — **comment ưu tiên hơn description khi mâu thuẫn**)
  - Kiểm tra code trực tiếp tại `/home/vif/workspace/ChatbotX`

---

## Mục tiêu nghiệp vụ

Hoàn thiện tích hợp **OpenAI-compatible** và bảo mật khoá API cho toàn bộ AI provider trong ChatbotX theo 2 PR nối tiếp:
1. **PR 1 — Public API, Satellite ID & SSRF guard:**
   - Dùng lại `connections.create` / `connections.delete` cho connect/disconnect (không tạo procedure connect/disconnect riêng), và mở rộng `/v1/integrations/ai` (`getAiProvider`, `updateAiProvider`) cho `openaiCompatible` (scope token `"integrations"`).
   - Sửa lỗi âm thầm ở `ai_agents_create`: `integrations.list` trả parent `Integration.id`, còn worker tìm theo **satellite ID** `IntegrationOpenaiCompatible.id` (`apps/worker/src/lib/ai/reply-model.ts:42`).
   - Bật SSRF guard (`assertPublicUrl`) mặc định trên mọi edition, kèm env opt-out cho self-hosted (`ALLOW_PRIVATE_AI_BASE_URLS`, bị bỏ qua khi `isCloud()`) để phục vụ preset `lmstudio` mặc định `http://127.0.0.1:1234/v1` khi self-hosted chủ động cho phép.
2. **PR 2 — Mã hoá `auth` mọi AI provider & Backfill:**
   - Mã hoá `auth` cho **mọi AI provider** (`openai`, `claude`, `gemini`, `deepseek`, `muse`, `openrouter`, `openaiCompatible`) tại tầng store binding chung theo convention cột `encryptedAuth`, reader đọc được cả ciphertext lẫn plaintext trong giai đoạn chuyển tiếp, kèm script backfill TypeScript có `--dry-run` (chờ PO duyệt SQL migration và dry-run trước khi apply).

---

## Phạm vi (Scope Allow / Deny)

### Trong scope (Allow — đường dẫn tuyệt đối trong `/home/vif/workspace/ChatbotX`)

**PR 1 — Public API, Satellite ID & SSRF guard:**
- `/home/vif/workspace/ChatbotX/apps/builder/src/features/integrations/schema/ai-provider.ts` — mở rộng `aiProviderPathParam` thêm `"openaiCompatible"`; `getAiProviderRequest` thêm optional `integrationId`; `updateAiProviderRequest` thêm `integrationId` (bắt buộc khi `provider === "openaiCompatible"`), `autoReply`, `enabled`, `name`, `preset` (`openaiCompatibleProviderPresets` ∪ `"custom"`), `defaultModel`, `baseURL`, `apiKey`.
- `/home/vif/workspace/ChatbotX/apps/builder/src/features/integrations/api/public/ai.ts` — route dùng `workspaceTokenAuthAPI` scope `"integrations"`, từ chối token read-only, giữ guard `_confirm` cho thao tác mutating theo convention; `getAiProvider(openaiCompatible)` không truyền `integrationId` trả danh sách instance, có `integrationId` trả 1 instance; `updateAiProvider(openaiCompatible)` bắt buộc `integrationId` và gọi chung service method với UI; response trả satellite `id` (`IntegrationOpenaiCompatible.id`), `integrationId` và `hasApiKey: boolean`, tuyệt đối không trả `apiKey` hay ciphertext.
- `/home/vif/workspace/ChatbotX/apps/builder/src/features/integration-openai-compatible/actions/update.action.ts` & `/home/vif/workspace/ChatbotX/packages/business/src/integration-openai-compatible/service.ts` — đồng nhất service method dùng chung giữa UI action và Public API.
- `/home/vif/workspace/ChatbotX/apps/builder/src/features/ai-agents/schema/action.ts` — sửa description trường `integrationId` (dòng 129) sang lấy **satellite ID** từ `integrations.getAiProvider(provider="openaiCompatible")` (không dùng `integrations.list` vốn trả `Integration.id`).
- `/home/vif/workspace/ChatbotX/packages/business/src/integration-openai-compatible/validate-base-url.ts` & `/home/vif/workspace/ChatbotX/.env.example` — bật `assertPublicUrl` trên mọi edition; chỉ opt-out khi `!isCloud()` và bật `ALLOW_PRIVATE_AI_BASE_URLS` (luôn bỏ qua env này khi `isCloud()`).
- `/home/vif/workspace/ChatbotX/apps/builder/__tests__/api-parity-manifest.json` — chuyển 4 entry `integration-openai-compatible/*` (dòng 261–264) từ `private:` sang `covered:...`.
- `/home/vif/workspace/ChatbotX/apps/builder/__tests__/integrations-public-api.test.ts`, snapshot OpenAPI/spec, `/home/vif/workspace/ChatbotX/apps/cli/`, `/home/vif/workspace/ChatbotX/apps/mcp-server/`, docs (`cli-mcp-docs`, ghi chú `ALLOW_PRIVATE_AI_BASE_URLS` và rủi ro disconnect).

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
| AC1 | Chạy được qua MCP/Public API end-to-end đủ 6 bước với token scope `"integrations"`: `connections_create(openaiCompatible)` → `integrations_get_ai_provider(provider="openaiCompatible")` trả về **satellite ID** (`IntegrationOpenaiCompatible.id`; không `integrationId` trả danh sách, có `integrationId` trả 1 instance) → `integrations_update_ai_provider(provider="openaiCompatible", integrationId=<satelliteId>, autoReply=true)` → `ai_agents_create` (`kind: "openaiCompatible"`, `integrationId: <satelliteId>`) → agent trả lời tin nhắn thử → `connections_delete`. Description của `ai_agents_create` trỏ đúng `integrations.getAiProvider` (satellite ID), không trỏ `integrations.list` | Agent / API client | MCP/API E2E test 6 bước; kiểm tra schema `ai_agents_create` |
| AC2 | Token read-only bị từ chối ở mọi procedure mutating (các thao tác mutating giữ guard `_confirm` theo convention); response của `getAiProvider` / `updateAiProvider` / `connections` không bao giờ chứa `apiKey` hay ciphertext, chỉ trả `hasApiKey: boolean` | Security / API client | Test token read-only bị reject; assert payload response chỉ có `hasApiKey`, không có `auth`/`apiKey` |
| AC3 | `updateAiProvider` với `provider="openaiCompatible"` thiếu `integrationId` trả lỗi validation; có `integrationId` cập nhật đúng instance (`autoReply`, `enabled`, `name`, `preset` validate theo `openaiCompatibleProviderPresets` ∪ `"custom"`, `defaultModel`, `baseURL` chạy lại SSRF, `apiKey`) qua cùng service với UI action | Agent / API client | Test trong `integrations-public-api.test.ts` với case thiếu/có `integrationId` |
| AC4 | Sau migration `encryptedAuth` và backfill (được PO duyệt), mọi row ở cả 7 bảng AI provider (`openai`, `claude`, `gemini`, `deepseek`, `muse`, `openrouter`, `openaiCompatible`) không còn `auth` plaintext (`secretTextAuthSchema.safeParse` trên giá trị thô thất bại); trong giai đoạn chuyển tiếp trước backfill, reader đọc được cả ciphertext lẫn plaintext và luồng AI vẫn gọi được provider | Security / Runtime | Kiểm tra SQL migration + dry-run backfill + query DB sau apply + test dual-format reader & AI runtime |
| AC5 | SSRF guard (`assertPublicUrl`) bật mặc định trên mọi edition: `http://127.0.0.1:11434/v1` và `http://127.0.0.1:1234/v1` (preset `lmstudio`) trả `400 ssrfBlocked` cả trên self-hosted lẫn cloud khi chưa opt-out; đặt `ALLOW_PRIVATE_AI_BASE_URLS` cho phép trên self-hosted nhưng bị bỏ qua khi `isCloud()` | Security / Self-hosted ops | Unit/API test cho cả 3 case (cloud, self-hosted mặc định, self-hosted có env); `.env.example` đã thêm biến |
| AC6 | `api-parity-manifest.json` không còn entry `private:` cho `integration-openai-compatible/*`; `pnpm lint`, `pnpm check-types` (hoặc `check-types:cold`), test builder (gồm `integrations-public-api.test.ts`), snapshot spec đã regenerate và `cli-mcp-docs` pass | Developer / QA | Chạy lệnh kiểm tra tại `/home/vif/workspace/ChatbotX` và kiểm tra diff manifest/snapshot |

---

## Rule nghiệp vụ

1. **Scope & Auth:**
   - Public API `/v1/integrations/ai` dùng `workspaceTokenAuthAPI` với scope `"integrations"`, từ chối token read-only; thao tác mutating giữ guard `_confirm` theo convention hiện có.
   - Response không bao giờ trả `apiKey` hoặc ciphertext — chỉ trả `hasApiKey: boolean`.
2. **Satellite ID & `autoReply`:**
   - `integrations.list` trả `Integration.id` (bảng cha), còn worker (`apps/worker/src/lib/ai/reply-model.ts:42`) tìm theo `IntegrationOpenaiCompatible.id` (satellite ID).
   - `getAiProvider` / `updateAiProvider` cho `openaiCompatible` dùng satellite `id` (`IntegrationOpenaiCompatible.id`) và trả kèm `integrationId` (bảng cha để đối chiếu `connections.delete`).
   - `connections.create` tạo instance với `autoReply = false`; agent chỉ trả lời khi `enabled && autoReply`, nên cần `updateAiProvider(..., autoReply: true)`.
3. **Validation & Preset:**
   - `preset` validate theo `openaiCompatibleProviderPresets` ∪ `"custom"`; với `preset !== "custom"`, giữ partial unique index `IntegrationOpenaiCompatible_workspaceId_preset_key`.
   - `updateAiProvider` khi đổi `baseURL` phải chạy lại SSRF guard; khi không truyền `apiKey`, giữ nguyên key hiện có.
4. **SSRF & Opt-out:**
   - Bỏ gate `isCloud()` ở `validateOpenaiCompatibleBaseUrlForEnvironment`; chỉ cho phép bỏ qua `assertPublicUrl` khi `!isCloud()` và `ALLOW_PRIVATE_AI_BASE_URLS` được bật.
5. **Migration & Rollout PR 2:**
   - Thêm cột `encryptedAuth` thay vì ghi ciphertext vào cột `auth` jsonb; reader hỗ trợ đọc dual-format trong giai đoạn chuyển tiếp.
   - SQL migration và script backfill TypeScript (`--dry-run`) phải trình PO duyệt trước khi apply.

---

## Steps / luồng chính

1. **PR 1 — Public API + SSRF:**
   - Cập nhật `validate-base-url.ts` bật `assertPublicUrl` mọi edition + thêm opt-out `ALLOW_PRIVATE_AI_BASE_URLS` (chỉ `!isCloud()`), thêm vào `.env.example`.
   - Chuẩn hoá method trong `packages/business/src/integration-openai-compatible/service.ts` để UI `update.action.ts` và Public API dùng chung.
   - Mở rộng `aiProviderPathParam`, `getAiProvider` (list/single), `updateAiProvider` (bắt buộc `integrationId`) tại `/v1/integrations/ai`.
   - Sửa description `integrationId` của `ai_agents_create`.
   - Cập nhật `api-parity-manifest.json`, regenerate snapshot spec, chạy `cli-mcp-docs`, bổ sung test `integrations-public-api.test.ts` + test SSRF.
2. **PR 2 — Mã hoá mọi AI provider + Backfill:**
   - Sinh schema migration cột `encryptedAuth` cho 7 bảng AI provider (trình PO duyệt SQL trước khi apply).
   - Cập nhật `store-bindings.ts` (`insertRow`, `saveAuthByForeignKey`, `loadAuthByForeignKey`) mã hoá khi ghi vào `encryptedAuth`, đọc dual-format (ciphertext + plaintext cũ); cập nhật các reader (`factory.ts`, `openai-compatible.ts`, `embedding-model.ts`, `muse-transcribe.ts`, `segment-image.ts`, `update.action.ts`) nhận `apiKey` đã giải mã từ tầng business/repository.
   - Viết & chạy `--dry-run` script backfill TypeScript, trình PO duyệt trước khi apply thật.

---

## Trường hợp biên & ngoại lệ

- `PATCH /v1/integrations/ai/openaiCompatible` thiếu `integrationId` → lỗi validation; truyền nhầm `Integration.id` (parent) thay vì satellite `IntegrationOpenaiCompatible.id` → `404`.
- Update `baseURL` không gửi kèm `apiKey` mới → giải mã key đang lưu để chạy `verifyOpenaiCompatibleProvider`, không gửi ciphertext/object làm Bearer token.
- Disconnect integration đang gắn với AI agent → cho phép xoá, agent fail lúc runtime (ghi rõ trong docs).
- Deploy code PR 2 trước khi chạy xong backfill → reader đọc dual-format đảm bảo mọi AI provider không bị gián đoạn.

---

## Rủi ro

- **Migration SQL & Backfill (chặn cứng):** Chạm 7 bảng AI provider (`openai`, `claude`, `gemini`, `deepseek`, `muse`, `openrouter`, `openaiCompatible`); bắt buộc chờ PO duyệt SQL migration và log `--dry-run` backfill.
- **Sót reader `secretTextAuthSchema`:** Đã xác định thêm `embedding-model.ts`, `muse-transcribe.ts`, `segment-image.ts` ngoài `factory.ts` và `openai-compatible.ts` — cần đảm bảo sửa đủ khi chuyển sang `encryptedAuth`.
- **Public manifest & snapshot:** Mở 4 entry `integration-openai-compatible/*` sang `covered:` yêu cầu regenerate snapshot OpenAPI/MCP đồng bộ.
- **SSRF & `lmstudio`:** Preset `lmstudio` mặc định `http://127.0.0.1:1234/v1` sẽ bị chặn trên self-hosted nếu không bật `ALLOW_PRIVATE_AI_BASE_URLS` — cần ghi rõ trong docs.
- **Satellite ID mismatch:** Mọi test và tài liệu agent phải kiểm tra đúng `IntegrationOpenaiCompatible.id` thay vì `Integration.id`.

---

## Done when (Điều kiện hoàn thành)

- PR 1 & PR 2 pass `pnpm lint`, `pnpm check-types` (hoặc `check-types:cold`), `integrations-public-api.test.ts` và bộ test liên quan.
- Kịch bản MCP E2E 6 bước chạy pass.
- `api-parity-manifest.json` không còn `private:` cho `integration-openai-compatible/*`; snapshot spec & `cli-mcp-docs` đã cập nhật.
- SQL migration `encryptedAuth` + backfill `--dry-run` được PO duyệt, apply xong và kiểm tra 0 row AI provider còn `auth` plaintext.
- QA `reports/chatbotx/qa/CB-1/verdict.md` đạt **PASS**.

---

## Cập nhật docs sau khi DONE

- [ ] SRS: `docs/chatbotx/srs/integration-openai-compatible.md` — API `/v1/integrations/ai` (satellite ID), SSRF guard + `ALLOW_PRIVATE_AI_BASE_URLS`, lưu ý disconnect, và mã hoá `encryptedAuth`.
- [ ] ADR: quyết định dùng `encryptedAuth` tại `store-bindings.ts` cho toàn bộ AI providers.

---

## Open Questions (chỉ giữ điểm thật sự chưa chốt)

1. **Shape output `getAiProvider(openaiCompatible)`:** PO chốt dùng union (1 object khi có `integrationId`, mảng khi không có) hay wrapper `{ data: [...] }` để schema OpenAPI/MCP dễ đọc hơn?
2. **Convention `_confirm` trên `PATCH updateAiProvider`:** Kiểm tra `integrations-public-api.test.ts` để chốt `PATCH updateAiProvider` có cần `_confirm` hay giữ chữ ký hiện tại (grep `apps/builder/src/features/integrations/` hiện chưa thấy `_confirm`).
3. **Env mã hoá ở self-hosted:** Ngoài `ENCRYPTION_KEY` (`.env.example:87`), `@chatbotx.io/encryption` có yêu cầu biến môi trường nào khác trên bản self-hosted cần ghi vào `.env.example` không?
