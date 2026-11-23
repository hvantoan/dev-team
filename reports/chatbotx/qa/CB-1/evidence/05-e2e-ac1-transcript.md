# AC1 E2E transcript — isolated stack, PR head 2782fe418

Isolated stack (KHÔNG chạm stack owner):
- compose project `qa-cb1` (`/tmp/qa-cb1/compose.yml`): postgres `25433`, redis `26380`, rustfs `29004/29005`
- builder `next dev` từ worktree PR: `http://localhost:3124` (env `/tmp/qa-cb1/qa.env`)
- worker `tsx src/core.ts` từ worktree PR (cùng env)
- mock OpenAI-compatible server `http://127.0.0.1:1235/v1` (models + chat/completions, hỗ trợ stream)
- DB: `postgresql://chatbotx:secretkey@localhost:25433/chatbotx` — migrate + seed mới, workspace DEMO `11793649221967279`
- `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true` (self-hosted opt-out, đúng nhánh AC5 cho phép)

Token tạo trực tiếp trong DB test (sha256 hash, không in plaintext): `full` (scopes NULL), `read_only`, `integrations` (scopes {integrations}).

## Step 1 — connections.create(openaiCompatible) — 201

```bash
POST /api/v1/connections   (Authorization: Bearer <token scope integrations>)
{"provider":"openaiCompatible","config":{"baseURL":"http://127.0.0.1:1235/v1","apiKey":"sk-qa-123","name":"QA Mock Provider","preset":"custom","defaultModel":"qa-mock-model"}}
```
```json
{"connection":{"id":"11793656876950135","kind":"integration","provider":"openaiCompatible","status":"connected","sourceId":"http://127.0.0.1:1235/v1","displayName":"OpenAI-compatible","integrationId":"11793656876671244","strategy":"api_key"},"session":null,"secret":null}
```
Mock log: `GET /v1/models auth=true` (verify lúc connect, dùng key người gọi gửi).

## Step 2 — getAiProvider(openaiCompatible) — 200, satellite id

```bash
GET /api/v1/integrations/ai/openaiCompatible
```
```json
{"data":[{"id":"11793656876884266","integrationId":"11793656876671244","name":"QA Mock Provider","preset":"custom","baseURL":"http://127.0.0.1:1235/v1","defaultModel":"qa-mock-model","enabled":true,"autoReply":false,"hasApiKey":true}]}
```
`id` (satellite `IntegrationOpenaiCompatible.id`) ≠ `integrationId` (parent `Integration.id` = `connection.integrationId`).
Không có `apiKey`, `auth`, `workspaceId` trong payload.

## Step 3 — updateAiProvider(autoReply=true) — 200

```bash
PATCH /api/v1/integrations/ai/openaiCompatible
{"integrationId":"11793656876884266","autoReply":true}
```
```json
{"id":"11793656876884266","integrationId":"11793656876671244","name":"QA Mock Provider","preset":"custom","baseURL":"http://127.0.0.1:1235/v1","defaultModel":"qa-mock-model","enabled":true,"autoReply":true,"hasApiKey":true}
```
DB: `IntegrationOpenaiCompatible.autoReply = t`, `enabled = t`.

## Step 4 — aiAgents.create(kind openaiCompatible, satellite id) — 201

```bash
POST /api/v1/ai-agents   (Bearer token scope automation/full)
{"name":"QA CB1 Agent","prompt":"Bạn là trợ lý QA. Trả lời ngắn gọn.","messages":[],"models":[{"kind":"openaiCompatible","integrationId":"11793656876884266","model":"qa-mock-model"}],"temperature":0.2,"maxOutputTokens":256,"tools":[],"isDefault":true}
```
```json
{"id":"11793658194977097","isDefault":true,"models":[{"kind":"openaiCompatible","model":"qa-mock-model","integrationId":"11793656876884266"}]}
```
DB `AIAgent.models` lưu đúng satellite id `11793656876884266`.

## Step 5 — agent trả lời tin nhắn thử — PASS

Webchat channel tạo qua API (`POST /api/v1/webchats` → id `11793660285034680`, inboxId cùng id), access token webchat mint theo `webchat-access-token.ts` (HMAC `BETTER_AUTH_SECRET`, `originHost=localhost`), rồi gửi tin inbound qua route guest thật:

```bash
POST /api/guest/messages   (Origin: http://localhost:3124, Bearer <webchat access token>)
{"text":"Xin chào QA, hãy trả lời tin nhắn thử","workspaceId":"11793649221967279","webchatId":"11793660285034680","guestConversationId":"11793649221967279:<uuid>","parentOrigin":"http://localhost:3124"}
```
Kết quả DB `Message` (conversation `11793661106495825`):

| id | messageType | senderType | text | createdAt |
|---|---|---|---|---|
| 11793661108151059 | incoming | contact | Xin chào QA, hãy trả lời tin nhắn thử | 08:12:28.491Z |
| 11793661163871726 | outgoing | bot | **QA-PONG: xin chào, đây là trả lời từ mock OpenAI-compatible provider.** | 08:12:31.892Z |

Worker log:
```json
{"jobId":"automated-response-11793661108151059","type":"processAutomatedResponse","msg":"Worker received job"}
{"conversationId":"11793661106495825","agentId":"11793658194977097","provider":"openaiCompatible","providerIndex":0,"providerCount":1,"durationMs":612,"responded":true,"msg":"[automated-response] fallback chain provider attempt"}
```
Mock log: `POST /v1/chat/completions auth=true` (2 lần: 08:12:31.203 / 08:12:31.639).

## Step 6 — connections.delete — 200, cascade

```bash
DELETE /api/v1/connections/11793656876950135
```
```json
{"id":"11793656876950135","status":"disconnected","statusReason":"manual","integrationId":"11793656876671244"}
```
Sau delete: `GET /api/v1/integrations/ai/openaiCompatible` chỉ còn instance #2; DB `IntegrationOpenaiCompatible` + `Integration` của instance #1 đã xoá (cascade), `Connection` của instance #1 không còn.

## Phụ — AC2/AC3 (cùng instance 3124, opt-out ON)

| Case | Kỳ vọng | Kết quả |
|---|---|---|
| PATCH thiếu `integrationId` | 422 validation | `422 {"code":"invalidRequestData","path":["integrationId"],"message":"integrationId is required when provider is openaiCompatible"}` |
| PATCH id không tồn tại | 404 | `404 {"code":"notFound","message":"openaiCompatible integration not found"}` |
| PATCH `baseURL` khác origin, không `apiKey` | 4xx chặn | `422 {"code":"validation","message":"Provide an API key when changing baseURL to a different origin."}` |
| PATCH `baseURL` khác origin, có `apiKey` | 200 | 200, DB baseURL cập nhật |
| PATCH `baseURL` cùng origin, không `apiKey` | 200, verify bằng key đang lưu | 200; mock log `GET /other/v1/models auth=true` |
| token `read_only` POST /v1/connections | 403 | `403 FORBIDDEN "Read-only token cannot perform this operation"` |
| token `read_only` PATCH /v1/integrations/ai/openaiCompatible | 403 | `403 FORBIDDEN` (chặn ở middleware theo method, chưa vào handler) |
| token `read_only` GET /v1/integrations/ai/openaiCompatible | 200 | 200 |
| token scope `integrations` POST /v1/ai-agents | 403 scope | `403 "Token is not authorized for the 'automation' scope"` |
| token sai | 401 | `401 INVALID_CHATBOT_TOKEN` |

Ghi chú môi trường: redis `qa-cb1` là `redis:7-alpine` không có module Bloom → listener analytics log `ERR unknown command 'BF.RESERVE'` (MacTrackingService dedup). Không ảnh hưởng luồng AI/automated-response; chỉ là khác biệt image so với compose của project (redis image của repo cũng không bật bloomfilter trong compose).

## Phụ — `getAiProvider` filter bằng 2 loại id (sau step 6, instance #2)

| Query | Kết quả |
|---|---|
| `?integrationId=11793662632387519` (satellite id) | `200 {"data":[1 phần tử]}` |
| `?integrationId=11793662632157819` (parent `integrationId`, superset được docs mô tả) | `200 {"data":[1 phần tử]}` |
| `?integrationId=123123123123123123` (không tồn tại) | `404 {"code":"notFound","message":"openaiCompatible integration not found"}` |
