# Jira text (chỉ đọc, không sửa) — project CB, vtxsolution, lấy 2026-11-23

## CB-1
- summary: [Integrations] Expose OpenAI-compatible qua public API/MCP kèm mã hoá apiKey và SSRF guard
- type: Task
- status: In Progress
- assignee: Hồ Văn Toàn <it.vantoan@gmail.com>
- labels: ai, api, integrations, security
- url: https://vtxsolution.atlassian.net/browse/CB-1

### Description

## Mục tiêu
Expose integration OpenAI-compatible (connect/update/disconnect/list  autoReply) qua public API và MCP để agent tự quản lý instance, đồng thời đóng hai lỗ hổng nền: `apiKey` đang lưu plaintext trong DB và SSRF guard chỉ chạy ở edition cloud.
## Bối cảnh
- `apps/builder/__tests__/api-parity-manifest.json:261-264` đang pin 4 action `integration-openai-compatible/*` là `private: no public surface yet (UI-only, not yet audited)` — vi phạm invariant 23 (agent-first) của AGENTS.md.
- `packages/business/src/integration-openai-compatible/service.ts` — `createAuth()` trả raw `SecretTextAuthValue` và ghi thẳng vào cột `auth` (jsonb), không qua `encryptUtils`. Sibling service (`integration-active-campaign/service.ts`) dùng `encryptUtils.encryptObject`, và `packages/ai/src/server/openai-compatible.ts` đọc `auth` bằng `secretTextAuthSchema.parse` — tức cả hai đầu đều plaintext.
- `packages/business/src/integration-openai-compatible/validate-base-url.ts` — `assertPublicUrl` chỉ chạy khi `isCloud()`; fork self-hosted không có guard.
- Phía consumer đã sẵn sàng: `ai_agents_create` nhận entry `{ kind: "openaiCompatible", integrationId, model `} (`features/ai-agents/schema/action.ts`), nhưng chưa có cách lấy `integrationId` hay connect instance qua API.
## Phạm vi
- Trong phạm vi: public procedures connect/update/disconnect/list cho OpenAI-compatible; mở rộng `integrations.getAiProvider` / `updateAiProvider` xử lý instance OpenAI-compatible; mã hoá `auth` khi ghi  giải mã khi đọc; migration backfill các row plaintext; bật `assertPublicUrl` không điều kiện.
- Ngoài phạm vi: guard chặn disconnect khi có AI agent đang tham chiếu integration; PR upstream; thay đổi schema `ai_agents_create`; procedure list riêng nếu `integrations_list` đã trả đủ row.
## Yêu cầu
- Procedures mới dùng `workspaceTokenAuthAPI`, scope `integrations`, từ chối token read-only; mutating op giữ guard `_confirm` theo convention hiện có.
- Response không bao giờ trả `apiKey` hay ciphertext — chỉ `hasApiKey: boolean`.
- `preset` validate theo `openaiCompatibleProviderPresets` ∪ `"custom"`.
- `getAiProvider` / `updateAiProvider`: thêm value `"openaiCompatible"` cho `provider` và param `integrationId`, bắt buộc khi provider là openaiCompatible (multi-instance, không map được vào single-row path).
- `createAuth` mã hoá bằng `encryptUtils.encryptObject`; reader trong `packages/ai/src/server/openai-compatible.ts` giải mã.
- Migration backfill: quét row `IntegrationOpenaiCompatible` có `auth` plaintext và encrypt in-place; \*\*chỉ generate  inspect SQL, chờ duyệt trước khi apply\*\* (quy tắc repo).
- Bỏ gate `isCloud()` trong `validateOpenaiCompatibleBaseUrlForEnvironment`.
- Cập nhật `api-parity-manifest.json`, regenerate snapshot spec, chạy skill `cli-mcp-docs`.
## Tiêu chí nghiệm thu
- [AC-01](https://vtxsolution.atlassian.net/browse/AC-01): MCP `search_tools`/`tools/list` (sau reload) trả các tool connect/update/disconnect/list OpenAI-compatible; gọi connect → list → disconnect end-to-end thành công với token có scope `integrations`.
- [AC-02](https://vtxsolution.atlassian.net/browse/AC-02): Token read-only bị từ chối ở mọi procedure mutating; response connect/list không chứa `apiKey` hay ciphertext, chỉ `hasApiKey`.
- [AC-03](https://vtxsolution.atlassian.net/browse/AC-03): `updateAiProvider` với `provider=openaiCompatible` thiếu `integrationId` trả lỗi validation; có `integrationId` bật/tắt đúng instance.
- [AC-04](https://vtxsolution.atlassian.net/browse/AC-04): Sau migration, mọi row `IntegrationOpenaiCompatible.auth` là ciphertext; `secretTextAuthSchema.parse` trực tiếp trên giá trị thô thất bại, và luồng AI vẫn đọc được key để gọi provider.
- [AC-05](https://vtxsolution.atlassian.net/browse/AC-05): Connect với `baseURL` không phải public (kể cả self-hosted) bị chặn bởi `assertPublicUrl`.
- [AC-06](https://vtxsolution.atlassian.net/browse/AC-06): `pnpm lint`, `pnpm check-types`, test builder pass, gồm `integrations-public-api.test.ts` và snapshot spec đã regenerate có chủ đích.
## Cách kiểm chứng
- Reload MCP server, chạy connect → list → `ai_agents_create` với `kind:"openaiCompatible"`  `integrationId` → gửi thử message tới agent → disconnect.
- Query `select auth from "IntegrationOpenaiCompatible"` sau migration và kiểm tra không parse được bằng `secretTextAuthSchema`.
- Connect thử `http://127.0.0.1:11434/v1` (Ollama LAN) và xác nhận bị từ chối.
## Cần làm rõ
- `integrations_list` hiện có trả row `integrationType: "openaiCompatible"` kèm `integrationId` chưa? Nếu chưa thì phải bổ sung field vào output thay vì tạo procedure list riêng.
- Cơ chế data migration của `packages/database` (drizzle migration sinh SQL hay script runner riêng) cần xác nhận khi triển khai.
- Disconnect không có reference-guard: agent đang dùng `models[].integrationId` sẽ fail lúc runtime nếu integration bị xoá — chấp nhận có ý thức, ghi chú trong docs.
## Phụ thuộc và tài liệu
- AGENTS.md invariant 23 (agent-first: mọi feature ship public API).
- `docs/developer/workspace-api-tokens.md` (scope, read-only token).
- `packages/business/src/integration-ai-provider/connect.ts` (mẫu audit/scope cho AI provider).

### Comments (1)

#### Hồ Văn Toàn — 2026-11-23T00:45:40.018+0700

# Tư vấn [CB-1](https://vtxsolution.atlassian.net/browse/CB-1): scope đã chốt

## Quyết định đã chốt

1. **API shape:** dùng lại `connections.create` / `connections.delete` cho connect/disconnect, không tạo procedure connect/disconnect riêng.
1. **List và update:** mở rộng `/v1/integrations/ai`. `getAiProvider(provider=openaiCompatible)` không có `integrationId` thì trả danh sách instance, có `integrationId` thì trả một instance. `updateAiProvider(provider=openaiCompatible)` bắt buộc `integrationId` và nhận `autoReply`, `enabled`, `name`, `preset`, `defaultModel`, `baseURL`, `apiKey`.
1. **SSRF:** guard bật ở mọi edition. Self-hosted có env opt-out (tên dự kiến `ALLOW_PRIVATE_AI_BASE_URLS`), env này bị bỏ qua khi `isCloud()`. Lý do: preset `lmstudio` mặc định dùng `http://127.0.0.1:1234/v1`.
1. **Mã hoá:** mã hoá `auth` cho mọi AI provider (openai, claude, gemini, deepseek, muse, openrouter, openaiCompatible) ngay trong [CB-1](https://vtxsolution.atlassian.net/browse/CB-1), tại tầng store binding chung.

## Phát hiện từ code

- `connections.create` đã connect được `openaiCompatible`, có SSRF guard và verify `/models` (`packages/business/src/connection/credential-providers.ts:102`).
- Bug âm thầm: `ai_agents_create` ghi là lấy `integrationId` từ `integrations.list`, nhưng list đó trả `Integration.id` (bảng cha), còn worker tìm theo `IntegrationOpenaiCompatible.id` (`apps/worker/src/lib/ai/reply-model.ts:42`). Agent tạo qua API sẽ không bao giờ trả lời.
- Agent chỉ trả lời khi `enabled && autoReply`, mà connect qua connections để `autoReply=false` mặc định.
- Mọi AI provider đều lưu API key plaintext qua connection engine (`store-bindings.ts`, `packages/ai/src/server/factory.ts:117`).

## Done means

- Chạy được qua MCP: `connections_create(openaiCompatible)` → `integrations_get_ai_provider` (lấy satellite id) → `integrations_update_ai_provider(autoReply=true)` → `ai_agents_create` → agent trả lời tin nhắn thử → `connections_delete`.
- Route mutating từ chối token read-only; không response nào chứa `apiKey` hay ciphertext, chỉ `hasApiKey`.
- Sau backfill, `auth` của mọi bảng AI provider không còn plaintext, `secretTextAuthSchema.safeParse` trên giá trị thô thất bại, luồng AI vẫn gọi được provider.
- Chưa set env thì `http://127.0.0.1:11434/v1` bị chặn cả trên self-hosted; set env trên self-hosted thì connect được; trên cloud env bị bỏ qua.
- Manifest không còn entry `private:` cho `integration-openai-compatible/*`; `pnpm lint`, `pnpm check-types`, test builder pass.

**Non-goals:** reference-guard khi disconnect (ghi chú trong docs), PR upstream, đổi schema `ai_agents_create`, procedure connect/disconnect riêng, mã hoá credential của integration không phải AI.

## Verdict

Ticket ban đầu giả định connect/list/disconnect cần procedure riêng, nhưng `connections.*` đã làm được connect và disconnect. Cái agent còn thiếu là satellite id đúng cho `ai_agents_create` và cách bật `autoReply`. Sửa hai chỗ này trước là có giá trị nhất. Phần mã hoá cho mọi AI provider là phần nặng và rủi ro nhất, nên ship thành PR riêng trong cùng ticket.

## Nên làm

1. **PR 1, public API và SSRF:** mở rộng `aiProviderPathParam` thêm `openaiCompatible`; `getAiProvider` và `updateAiProvider` gọi chung service method với server action của UI; sửa description của `ai_agents_create`; SSRF default-on kèm env opt-out, thêm env vào `.env.example`; cập nhật manifest, snapshot spec, chạy `cli-mcp-docs`.
1. **PR 2, mã hoá:** làm tại `store-bindings.ts`, cả lúc ghi (`insertRow`, `saveAuthByForeignKey`) lẫn lúc đọc (`loadAuth`). Đổi reader trong `packages/ai` (`factory.ts`, `openai-compatible.ts`) sang nhận `apiKey` đã giải mã.
1. **Đọc được cả hai dạng trong giai đoạn chuyển tiếp:** reader đọc cả ciphertext lẫn plaintext cho tới khi backfill xong, nếu không thì deploy trước backfill sẽ làm mọi AI provider ngừng chạy.
1. **Backfill là script TypeScript** (theo kiểu `packages/database/scripts/backfill-connections/`), không phải SQL của drizzle, vì khoá mã hoá nằm trong env của app. Chạy dry-run trước, chờ duyệt mới apply.

## Không nên làm

- Không tạo `integrations.openaiCompatible.connect/disconnect`: sẽ có hai đường connect công khai cho cùng một resource, phải giữ SSRF, verify và unique-preset luôn khớp nhau.
- Không để `packages/ai` import `@chatbotx.io/encryption`: giải mã ở tầng business/repository rồi truyền key vào, để `createOpenaiCompatibleModelInstance` giữ nguyên sync.
- Không nhét ciphertext vào cột `auth` jsonb đang có type `AuthValue`: type sẽ sai và `asAuthValue` sẽ throw trong lúc rollout.

## Có thể tốt hơn

1. Theo convention `encryptedAuth` sẵn có (woocommerce, shopify, meta-catalog): thêm cột `encryptedAuth` cho các bảng AI, backfill sang đó, rồi null `auth`. Rollout an toàn và rollback được; cần migration schema (generate, chờ duyệt).
1. Nếu output union gây khó, cho `getAiProvider(openaiCompatible)` luôn trả `{ data: [...] `}.

## Trade-offs

- Mã hoá mọi provider làm ticket to gấp khoảng 2–3 lần, migration chạm khoảng 7 bảng.
- Output union làm schema OpenAPI/MCP khó đọc hơn.
- Env opt-out nghĩa là self-hosted vẫn có thể tự mở SSRF, đây là lựa chọn có chủ đích.
- Không có reference-guard: agent dùng integration đã bị xoá sẽ fail lúc runtime.

## Chưa kiểm chứng

- Danh sách đầy đủ reader của `auth` AI ngoài `factory.ts`, `openai-compatible.ts`, `store-bindings.ts` (`grep -rn "secretTextAuthSchema" packages apps`).
- Openrouter có đi qua cùng store binding không (`CONNECTION_STORE_BINDINGS`).
- Convention `_confirm` có áp dụng cho PATCH `updateAiProvider` không (`integrations-public-api.test.ts`).
- `encryptUtils` cần env khoá nào và `.env.example` self-hosted đã có chưa.

## Checklist

- `aiProviderPathParam` thêm `openaiCompatible`, `integrationId` bắt buộc trên PATCH
- Get/list trả satellite `id`, `integrationId`, `name`, `preset`, `baseURL`, `defaultModel`, `enabled`, `autoReply`, `hasApiKey`
- Update gồm `autoReply`, `enabled`, `name`, `preset`, `defaultModel`, `baseURL` (chạy lại SSRF), `apiKey`; server action UI gọi cùng service
- Sửa description `integrationId` trong `ai_agents_create`
- SSRF default-on và env opt-out, thêm env vào `.env.example`, test cho cloud, self-hosted và self-hosted có env
- Manifest chuyển `covered:`, regenerate snapshot, chạy `cli-mcp-docs`
- Migration cột `encryptedAuth` (generate, chờ duyệt)
- Store binding mã hoá khi ghi, đọc được cả hai dạng; reader `packages/ai` nhận key đã giải mã
- Script backfill có dry-run (chờ duyệt)
- Docs: env opt-out, rủi ro disconnect
- `pnpm lint`, `pnpm check-types`, test builder

## Success metrics

- Kịch bản MCP E2E pass hết 6 bước.
- 0 row trong mọi bảng AI provider có `auth` parse được bằng `secretTextAuthSchema`.
- 0 entry `private:` cho `integration-openai-compatible/*` trong manifest.
- Connect `127.0.0.1` trả 400 `ssrfBlocked` khi chưa set env.


## CB-2
- summary: Hệ thống chat Zalo Personal: nhắc lịch nhóm, tư vấn khoá học, báo cáo
- type: Epic
- status: To Do
- assignee: Hồ Văn Toàn <it.vantoan@gmail.com>
- labels: idea
- url: https://vtxsolution.atlassian.net/browse/CB-2

### Description

## Mục tiêu
Trên một workspace ChatbotX và một nick Zalo cá nhân (kênh zalo-personal):
1. AI tư vấn và chốt 3 khoá học qua tin nhắn riêng: K1 Đồng hành làm chủ thương hiệu Viral, K2 Video quay sẵn Xác định Thương Hiệu tạo chuyển đổi, K3 Đồng hành 1:1 3-6 tháng VIP. Ngoài khả năng thì chuyển cho tư vấn viên.
1. Nhắc lịch định kỳ (zoom, bài tập, lịch học) vào các nhóm khoá, dùng chung cho K3, K4 và khoá mới K5, K6, K7.
1. Master agent cùng workspace: trợ lý chat trực tiếp trên trang ChatbotX, gửi tóm tắt sau buổi zoom để agent tạo/sửa nhắc lịch và mẫu tin.
1. Tin số clip hằng tuần (một tin gộp mỗi nhóm, mỗi học viên có mục tiêu riêng) và báo cáo ngày/tuần vào nhóm Tổng, số liệu từ Google Sheet do trợ giảng điền tay.
## Đợt triển khai
- \*\*Tuần tới:\*\* [CB-3](https://vtxsolution.atlassian.net/browse/CB-3) hạ tầng, [CB-5](https://vtxsolution.atlassian.net/browse/CB-5) AI tư vấn  chuyển người thật, nhắc lịch định kỳ K3/K4, [CB-4](https://vtxsolution.atlassian.net/browse/CB-4) master agent (bắt buộc có UI), [CB-8](https://vtxsolution.atlassian.net/browse/CB-8) vận hành, [CB-1](https://vtxsolution.atlassian.net/browse/CB-1) làm song song (provider OpenAI-compatible).
- \*\*Ngay sau:\*\* [CB-6](https://vtxsolution.atlassian.net/browse/CB-6) Sheet  đối chiếu tên Zalo, tin số clip gộp, [CB-7](https://vtxsolution.atlassian.net/browse/CB-7) báo cáo nhóm Tổng.
## Quyết định đã chốt
- Provider AI: OpenAI-compatible; AI tư vấn là agent mặc định của workspace.
- Tư vấn viên trả lời trong inbox ChatbotX (web/mobile), không trả lời trên app Zalo điện thoại.
- `groupReplyConfig=disabled`: hệ thống không xử lý tin trong nhóm, nên AI không trả lời trong nhóm. Contact nhóm có được nhờ Sync lịch sử.
- Số clip do người điền tay vào Sheet, không đếm link trong nhóm.
- Tin số clip gửi một tin gộp vào nhóm, không DM riêng.
- Master agent nằm cùng workspace, có trang chat chỉ dành cho thành viên, không qua Zalo/Telegram.
## Ngoài phạm vi
- AI đọc hoặc đếm tin trong nhóm; DM riêng số clip; trả lời khách trên app Zalo; master agent qua Zalo/Telegram hoặc workspace riêng; phương án tạm CLI/MCP cho master agent.
## Ràng buộc
- Agent-first: mọi thao tác có public API trước UI (AGENTS.md invariant 23).
- Không tự chạy `db:migrate`; SQL migration phải được duyệt.
- Kênh unofficial: rủi ro khoá nick, giới hạn tần suất gửi.
## Rủi ro chính
- Master agent là tính năng mới, rủi ro trễ cao (đã chấp nhận).
- Chưa xác minh broadcast gửi được vào contact nhóm `group:` — test ngày 1 trong [CB-3](https://vtxsolution.atlassian.net/browse/CB-3).
## Tài liệu
- Phân tích ticket: `plans/tasks/cb-2-he-thong-chat-zalo-personal-tu-van-ai.md`
- Tư vấn đã chốt: `plans/reports/advise-261122-2344-zalo-personal-ai-chatbot.md`

### Comments

(không có comment)
