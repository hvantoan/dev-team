# SRS — Tích hợp OpenAI-Compatible AI Provider (`integration-openai-compatible`)

- **Project:** `chatbotx` (`/home/vif/workspace/ChatbotX`)
- **Ticket nguồn:** `CB-1` — https://vtxsolution.atlassian.net/browse/CB-1
- **PR đã merge vào `main`:** `#6` (`0f88afe86`), `#7` (`6f0e00f55` / `a352b331d`), `#8` (`ecd9f9127`)
- **ADR liên quan:** [0001-encrypted-auth-ai-providers.md](../adr/0001-encrypted-auth-ai-providers.md)

## Lịch sử thay đổi

| Phiên bản | Ngày | Người thực hiện | Nội dung thay đổi |
|---|---|---|---|
| v1.0 | 2026-11-25 | BA | Khởi tạo SRS cho module `integration-openai-compatible` theo `CB-1` (Public API `/api/v1/integrations/ai`, satellite ID vs parent ID, SSRF guard + opt-out, UI `providerUnreachable`, disconnect risk, `encryptedAuth`). |

---

## 1. Giới thiệu & Phạm vi

Tài liệu đặc tả hành vi chức năng và hợp đồng API/bảo mật cho tích hợp **OpenAI-compatible AI providers** (LM Studio, Ollama, NVIDIA NIM, Clarifai, NEAR AI, Heroku, hoặc endpoint `custom`) trong ChatbotX.

- Mỗi workspace có thể kết nối **nhiều** cấu hình `openaiCompatible` cùng lúc:
  - Các preset chuẩn (`preset !== "custom"`) bị giới hạn duy nhất theo `(workspaceId, preset)` qua partial unique index `IntegrationOpenaiCompatible_workspaceId_preset_key`.
  - Preset `"custom"` cho phép tạo nhiều kết nối trong cùng workspace (mỗi kết nối phân biệt theo `baseURL`, đồng thời là `Connection.sourceId`).

---

## 2. Public API (`/api/v1/integrations/ai` & `/api/v1/connections`)

### 2.1. Prefix, Auth & Phân quyền

- Đường dẫn công khai trên Next.js app là **`/api/v1/...`** (môi trường prod có Caddy rewrite `/v1/...` → `/api/v1/...`; gọi thẳng `/v1/...` vào Next sẽ nhận `307` về `/auth/sign-in`).
- Nhóm `/api/v1/connections` và `/api/v1/integrations/ai/{provider}` dùng `workspaceTokenAuthAPIForScope("integrations")`.
- Lưu ý trong luồng E2E đầy đủ: `/api/v1/ai-agents` yêu cầu scope `"automation"`, `/api/v1/webchats` yêu cầu scope `"channels"`. Token chỉ có scope `"integrations"` sẽ nhận `403` khi gọi `/api/v1/ai-agents`.
- **Bảo vệ token `read_only`:** Chặn ở HTTP method guard chung (`GET` / `HEAD` only trong `authorize-workspace-access.ts`); mọi request `POST`, `PATCH`, `DELETE` bằng token `read_only` bị từ chối `403 FORBIDDEN` trước khi vào handler. Hệ thống **không** dùng convention `_confirm`.
- **Không lộ secret:** Response của `GET` / `PATCH` / `connections` chỉ trả `hasApiKey: boolean` (không bao giờ trả `apiKey`, `auth` thô hay `encryptedAuth`).

### 2.2. Vòng đời endpoint

1. **Connect:** `POST /api/v1/connections` (`connections.create`)
   - Truyền `provider: "openaiCompatible"` và `config: { baseURL, apiKey, name?, preset?, defaultModel?, autoReply?, enabled? }`.
   - Không có procedure riêng `integrations.openaiCompatible.connect`; mặc định khi tạo mới: `autoReply = false`, `enabled = true`.
   - Agent/flow chỉ tự động trả lời khi instance đồng thời có **`enabled = true` và `autoReply = true`**.
2. **Resolve Satellite ID:** `GET /api/v1/integrations/ai/openaiCompatible` (`integrations.getAiProvider`)
   - Optional query `?integrationId=<id>`.
   - Luôn trả dạng danh sách `{ data: [...] }` (kể cả khi truyền `integrationId` sẽ trả mảng 1 phần tử).
   - Mỗi phần tử gồm: `id`, `integrationId`, `name`, `preset`, `baseURL`, `defaultModel`, `enabled`, `autoReply`, `hasApiKey`.
   - Nếu truyền `integrationId` không tồn tại hoặc thuộc workspace khác → `404`.
3. **Update cấu hình / bật `autoReply`:** `PATCH /api/v1/integrations/ai/openaiCompatible` (`integrations.updateAiProvider`)
   - **Bắt buộc** truyền `integrationId` (thiếu → lỗi validation `422 invalidRequestData`).
   - Hỗ trợ cập nhật partial các trường: `autoReply`, `enabled`, `name`, `preset`, `defaultModel`, `baseURL`, `apiKey`.
   - Dùng chung service `integrationOpenaiCompatibleService.updateWithVerification` với Builder UI (`updateOpenaiCompatibleAction`).
   - Quy tắc cập nhật `baseURL` & `apiKey`:
     - Khi truyền `baseURL`, hệ thống chuẩn hoá URL (`http`/`https`, tối đa 2048 ký tự, cấm `user:pass@`) và chạy lại **SSRF guard**.
     - Đổi `baseURL` sang **origin khác** bắt buộc phải truyền kèm `apiKey` mới (tránh gửi secret đã lưu sang host chưa được xác thực).
     - Đổi `baseURL` **cùng origin** hoặc chỉ gửi `apiKey` mới sẽ verify endpoint `/models` (dùng key mới nếu có, hoặc giải mã key đang lưu). Khi không đổi `baseURL` và không đổi `apiKey`, không cần verify lại endpoint.
     - Khi `baseURL` hoặc `name` thay đổi, service đồng bộ cập nhật `Connection.sourceId` và `Connection.displayName` trong cùng transaction.
   - Hỗ trợ `expectedBaseURL` (optimistic check nội bộ) và trả `409 conflict` nếu có cập nhật đồng thời.
4. **Disconnect:** `DELETE /api/v1/connections/{id}` (`connections.disconnect`)
   - Không tạo procedure disconnect riêng.
5. **Legacy endpoints:** `PUT /api/v1/integrations/ai/{provider}` và `DELETE /api/v1/integrations/ai/{provider}` (deprecated) chỉ áp dụng cho 5 provider legacy (`claude`, `deepseek`, `gemini`, `muse`, `openai`), không nhận `openaiCompatible`.

### 2.3. Quy tắc Satellite ID vs Parent ID

| Trường | Bảng nguồn | Ý nghĩa & nơi sử dụng |
|---|---|---|
| `data[].id` (**Satellite ID**) | `IntegrationOpenaiCompatible.id` | **Bắt buộc dùng** khi truyền `models[].integrationId` cho `aiAgents.create` / `aiAgents.update` (worker `apps/worker/src/lib/ai/reply-model.ts` tra cứu theo `findByWorkspaceIdAndId`). |
| `data[].integrationId` (**Parent ID**) | `Integration.id` | Trùng với `connection.integrationId` (cùng giá trị `integrations.list` trả về). |

- `GET` và `PATCH` `/api/v1/integrations/ai/openaiCompatible` chấp nhận **cả satellite `id` lẫn parent `integrationId`** (tra cứu superset qua `findByWorkspaceIdAndAnyId`, lọc theo `workspaceId`).
- Tuy nhiên, client/agent **tuyệt đối không dùng parent `Integration.id`** (từ `integrations.list`) cho `aiAgents.create`: worker sẽ không tìm thấy bản ghi satellite và im lặng không phản hồi tin nhắn.

---

## 3. SSRF Guard, Opt-Out Self-Hosted & Mã lỗi

### 3.1. Cơ chế SSRF Guard mặc định

- `validateOpenaiCompatibleBaseUrlForEnvironment` (`assertPublicUrl`) bật **mặc định trên mọi edition** (`cloud`, `enterprise`, `community`).
- Chặn mọi địa chỉ private/loopback/link-local (như `127.0.0.1`, `::1`, `10.0.0.0/8`, `169.254.169.254`...).
- Đồng thời:
  - Reject URL chứa `username`/`password` (`user:pass@`) hoặc protocol khác `http`/`https` với `400 invalidBaseUrl`.
  - Khi probe `/models`, sử dụng `redirect: "manual"` (timeout 10s, `retry: 0`) để chặn redirect `3xx` sang địa chỉ nội bộ (`unsafe_base_url`).

### 3.2. Mã lỗi công khai thống nhất (`400 ssrfBlocked`)

- Khi SSRF guard chặn URL trên **cả hai đường connect và update**:
  - `POST /api/v1/connections` (`packages/connections/src/credentials.ts` unwrap `ChatbotXException` với `code === "ssrfBlocked"` riêng cho `provider === "openaiCompatible"`): trả **`400 ssrfBlocked`**, message sạch `"OpenAI-compatible base URL is not allowed."`.
  - `PATCH /api/v1/integrations/ai/openaiCompatible` (`updateWithVerification` / `validateOpenaiCompatibleBaseUrlForEnvironment`): trả **`400 ssrfBlocked`**, message sạch `"OpenAI-compatible base URL is not allowed."`.
- **Không lộ mã lỗi nội bộ `(code ...)`:** `stripInternalErrorCode` loại bỏ hậu tố `(code ...)` cho nhánh `openaiCompatible` + `ssrfBlocked` khi connect; nhánh `OpenaiCompatibleProviderUnreachableError` trên update không gắn `data` nên không phát sinh hậu tố `(reason=...)`.
  - *Ghi chú phạm vi:* 5 legacy AI providers vẫn giữ hành vi cũ (`connectionCredentialsRejected`) và ngoài phạm vi thay đổi của `CB-1`.

### 3.3. Biến môi trường `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS`

- Cấu hình opt-out cho self-hosted (`packages/business/src/keys.ts`, `.env.example`):
  ```env
  OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true
  ```
- **Quy tắc edition:**
  - Khi `NEXT_PUBLIC_EDITION=cloud` (`isCloud() === true`): biến này **luôn bị bỏ qua hoàn toàn**.
  - Khi `!isCloud()` (self-hosted `community` / `enterprise`) và `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true`: **tắt hẳn SSRF guard** khi verify endpoint — **bao gồm cả dải link-local/metadata `169.254.0.0/16` (`169.254.169.254`)** (quyết định scope có chủ đích của PO ngày 2026-11-23, commit `a33b6c9` trong `projects/chatbotx.json`).
- **Upgrade note (Self-hosted):** Hệ thống self-hosted đang kết nối endpoint local/LAN (như preset `lmstudio` mặc định `http://127.0.0.1:1234/v1` hoặc Ollama) cần bật `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true` trước hoặc ngay sau khi nâng cấp; nếu không, health check và các thao tác edit/`PATCH` `baseURL` sẽ bị chặn `ssrfBlocked`.

### 3.4. Tách `providerUnreachable` trên UI Connect / Update

- `verifyOpenaiCompatibleProvider` thực hiện fail-closed (không còn chế độ "lưu kèm cảnh báo").
- Trên Builder UI (`connect.action.ts` và `update.action.ts`):
  - `reason === "unreachable"` (timeout, lỗi mạng, hoặc non-auth HTTP status từ `/models`) trả lỗi riêng theo key i18n **`openaiCompatible.validation.providerUnreachable`** (đủ 21 locale).
  - `reason === "unsafe_base_url"` hoặc lỗi `invalidBaseUrl` / `ssrfBlocked` trả **`openaiCompatible.validation.invalidBaseURL`**.
  - `reason === "unauthorized"` (HTTP `401` / `403`) trả `validation.invalidApiKey`.
- Trên Public API `PATCH /api/v1/integrations/ai/openaiCompatible`, trường hợp endpoint unreachable giữ code `400 invalidBaseUrl` (`OpenaiCompatibleProviderUnreachableError`, message `"OpenAI-compatible base URL could not be verified."`).

---

## 4. Lưu ý khi Disconnect

- Thao tác disconnect (`DELETE /api/v1/connections/{id}` hoặc qua UI) xoá bản ghi parent `Integration` và cascade xoá satellite `IntegrationOpenaiCompatible` cùng `Connection`.
- Hệ thống **chưa có reference-guard** kiểm tra hoặc chặn disconnect khi vẫn còn AI agent hoặc flow step tham chiếu tới satellite `id` đó.
- **Hệ quả vận hành:** Các AI agent / flow step còn trỏ tới satellite `id` đã ngắt kết nối sẽ lỗi lúc runtime khi chạy cho tới khi được cập nhật sang integration/model đang hoạt động khác.

---

## 5. Bảo mật dữ liệu & Mã hoá `encryptedAuth`

- API key của `openaiCompatible` (cùng 6 AI provider khác) không còn lưu plaintext ở cột `auth`.
- Khi connect/update (`store-bindings.ts` với `encryptAuth: true`, và `integrationOpenaiCompatibleService.connect/update`), dữ liệu xác thực được mã hoá bằng `@chatbotx.io/encryption` lưu vào cột **`encryptedAuth`** (`jsonb` nullable, type `CredentialEncrypted`) với AAD `ai-provider:openaiCompatible:<workspaceId>`, còn cột `auth` được đặt về `{}` để giữ invariant schema.
- Tầng đọc (`loadAuthByForeignKey`, `integrationOpenaiCompatibleService.withDecryptedAuth`, `packages/ai/src/server/factory.ts`) dùng `resolveAiProviderAuth` hỗ trợ **dual-read** (đọc được cả plaintext cũ lẫn `encryptedAuth` ciphertext) và giải mã ở tầng business/repository trước khi truyền xuống SDK AI.
- Chi tiết kiến trúc mã hoá, backfill và đánh đổi vận hành xem tại ADR [0001-encrypted-auth-ai-providers.md](../adr/0001-encrypted-auth-ai-providers.md).
