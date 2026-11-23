# Dev Handoff — CB-1 (PR 1: Public API OpenAI-compatible + SSRF default-on)

- **Ticket/Key:** CB-1 — https://vtxsolution.atlassian.net/browse/CB-1
- **Lần bàn giao:** 1
- **Ngày:** 2026-11-23
- **Spec:** `reports/chatbotx/ba/CB-1/spec.md` (header vẫn ghi DRAFT; SM xác nhận PO đã clear)
- **Phạm vi bàn giao:** **chỉ PR 1** (public API + satellite ID + SSRF). PR 2 (mã hoá `encryptedAuth` + backfill) **chưa có trong nhánh này** — xem mục Lệch spec #1.

| Repo | Branch → PR | Commit |
|---|---|---|
| ChatbotX (`/home/vif/workspace/worktrees/ChatbotX-cb-1-openai-compatible-api-ssrf`) | `feat/cb-1-openai-compatible-api-ssrf` → https://github.com/hvantoan/ChatbotX/pull/6 | `2782fe41815cebbe13544c68e59465fe4789252e` (`fix(integrations): address openai-compatible review feedback`) |

PR #6: `MERGEABLE`, CI run [45126421011](https://github.com/hvantoan/ChatbotX/actions/runs/45126421011) tại đúng head `2782fe418` — Lint, Types (apps), Types (packages), Types, Tests (1/8…8/8), Tests đều `SUCCESS`. Không sửa code trong lượt này; worktree sạch.

## Thay đổi

- `GET /v1/integrations/ai/openaiCompatible`: trả `{ data: [...] }` các instance, mỗi entry có `id` = **satellite `IntegrationOpenaiCompatible.id`**, kèm `integrationId` (parent), `name`, `preset`, `baseURL`, `defaultModel`, `enabled`, `autoReply`, `hasApiKey`. Lọc theo `integrationId` (nhận cả satellite `id` lẫn parent `connection.integrationId`), không thấy → 404.
- `PATCH /v1/integrations/ai/openaiCompatible`: bắt buộc `integrationId`, nhận `autoReply`, `enabled`, `name`, `preset`, `defaultModel`, `baseURL`, `apiKey`. UI (`updateOpenaiCompatibleAction`, `updateOpenaiCompatibleEnabledAction`) và public API dùng chung `integrationOpenaiCompatibleService.updateWithVerification`.
- SSRF guard bật mặc định mọi edition trong `validateOpenaiCompatibleBaseUrlForEnvironment`; opt-out `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true` chỉ có hiệu lực khi `!isCloud()`. Thêm biến vào `.env.example`.
- `aiAgents.create/update` description `models[].integrationId` sửa sang lấy satellite `id` từ `integrations.getAiProvider` (bỏ hướng dẫn `integrations.list`).
- Manifest `integration-openai-compatible/*` chuyển 4 entry `private:` → `covered:connections` / `covered:integrations`; docs `docs/openai-compatible.md` (lifecycle, env opt-out, rủi ro disconnect) + `apps/cli/README.md`.

## API/contract thay đổi

| Endpoint/surface | Trước | Sau | Breaking? |
|---|---|---|---|
| `GET /v1/integrations/ai/{provider}` | 5 provider, output 1 object | thêm `openaiCompatible`, output union: object cũ hoặc `{ data: [...] }`; input nhận `integrationId` optional (chỉ openaiCompatible) | Không cho 5 provider cũ |
| `PATCH /v1/integrations/ai/{provider}` | chỉ `autoReply` | thêm `openaiCompatible` + 7 field; output union; lỗi mới `invalidBaseUrl`/`ssrfBlocked`/`conflict`/`connectionAlreadyConnected`/`presetAlreadyConnected`/`connectionCredentialsRejected` | Không cho 5 provider cũ |
| `PUT`/`DELETE /v1/integrations/ai/{provider}` (deprecated) | 5 provider | vẫn chỉ 5 provider legacy (`legacyAiProviderRequest`) | Không |
| `aiAgents.create/update` | description trỏ `integrations.list` | description trỏ `integrations.getAiProvider` (`data[].id`) | Không (chỉ description) |
| `POST /v1/connections` (không đổi chữ ký) | SSRF chỉ cloud | SSRF mọi edition; lỗi SSRF bề mặt là `400 connectionCredentialsRejected` | Hành vi chặt hơn trên self-hosted |

## Cách chạy/verify tại chỗ

Chạy tại `/home/vif/workspace/worktrees/ChatbotX-cb-1-openai-compatible-api-ssrf`, Node `v24.22.2`, pnpm `10.34.5`:

```bash
pnpm lint                 # exit 0 — turbo 2 tasks; ultracite check 11445 files, no fixes
pnpm check-types          # exit 0 — 69 tasks successful (53 cached)
pnpm --filter @chatbotx.io/business test integration-openai-compatible credential-providers.test.ts
                          # 4 files, 48 tests passed
pnpm --filter builder exec vitest run \
  __tests__/integrations-public-api.test.ts __tests__/ai-agent-action-schema.test.ts \
  __tests__/openai-compatible-actions.test.ts __tests__/openai-compatible-provider-verify.test.ts \
  __tests__/api-parity-manifest.test.ts __tests__/public-spec-operations.test.ts __tests__/public-spec-mcp.test.ts
                          # 7 files, 128 tests passed
pnpm --filter chatbotx test
                          # 5 files, 60 tests passed (CLI command-name collision pin)
```

- `@chatbotx.io/database` lint (`check-schema-drift.mjs`): “Schema is in sync with the migration snapshot chain.” exit 0 — không có drift schema.
- Test unit mock DB/service; **không cần** Postgres/Redis. Không khởi động stack local trong lượt này (không có nhu cầu và không để lại process).
- Không chạy `db:migrate`, không chạy backfill (PR 2 chưa có).

## Điểm lệch spec

1. **PR 2 (AC4) chưa nằm trong PR này.** Nhánh chỉ có public API + SSRF; chưa thêm cột `encryptedAuth` cho 7 bảng AI provider, chưa có backfill `--dry-run`, `auth` vẫn plaintext. PR body ghi rõ “PR 2 … tracked separately”. Vì vậy **CB-1 chưa thể coi là DONE** theo “Done when” của spec; QA chỉ verdict được phạm vi PR 1.
2. **Tên env khác spec:** dùng `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS` (spec/Jira đề xuất `ALLOW_PRIVATE_AI_BASE_URLS`, ghi “tên dự kiến”). Đã cập nhật `.env.example` + `docs/openai-compatible.md` theo tên thực tế.
3. **Shape `getAiProvider(openaiCompatible)`:** luôn `{ data: [...] }`; khi có `integrationId` trả mảng 1 phần tử, không trả object trần. Đây là phương án PO cho phép trong comment (“Nếu output union gây khó, cho … luôn trả `{ data: [...] }`”).
4. **`_confirm`:** repo không có convention `_confirm` nào (grep `apps/builder/src` chỉ ra 0 field). Read-only token bị chặn ở middleware chung theo HTTP method (`PATCH` bị từ chối trước khi vào handler). Open question #2 của spec coi như đã đóng: không thêm `_confirm`.
5. **Mã lỗi SSRF khi connect:** `POST /v1/connections` bọc lỗi provider thành `400 connectionCredentialsRejected`, không phải `ssrfBlocked`; `400 ssrfBlocked` chỉ xuất hiện trên `PATCH /v1/integrations/ai/openaiCompatible`. SSRF vẫn được enforce ở cả hai đường.
6. **Gia cố thêm ngoài spec:** từ chối base URL có `user:pass@`; verify `/models` dùng `redirect: "manual"` (chặn 3xx); đổi `baseURL` khác origin bắt buộc gửi `apiKey` mới; update đồng bộ `Connection.sourceId`/`displayName`; thêm map lỗi `presetAlreadyConnected`, `connectionAlreadyConnected`, `conflict` (optimistic check theo `expectedBaseURL`).
7. **`integrationId` filter là superset:** nhận cả satellite `id` và parent `integrationId` (spec yêu cầu satellite; nhận parent chỉ để đối chiếu `connections.delete`).
8. **Snapshot spec không đổi:** `public-spec-operations` dùng `toMatchSnapshot()` trên `(operationId, method, path)`; PR này không thêm/đổi operationId nên snapshot giữ nguyên và test pass. `cli-mcp-docs`: chỉ `apps/cli/README.md` cần sửa (không đổi visibility MCP, không collision mới — test CLI pass).

## Cách QA verify

1. Dựng stack local theo `projects/chatbotx.json` (`./scripts/dev-up.sh`), dùng DB local `postgresql://chatbotx:secretkey@localhost:25432/chatbotx`; tạo workspace token scope `integrations` và một token `read_only`.
2. **E2E 6 bước (AC1):** `POST /v1/connections` (`provider: "openaiCompatible"`, baseURL public hoặc self-hosted có opt-out) → `GET /v1/integrations/ai/openaiCompatible` lấy `data[].id` → `PATCH` cùng path `{integrationId: data[0].id, autoReply: true}` → `aiAgents.create` với `kind: "openaiCompatible", integrationId: data[0].id` → gửi tin nhắn thử, agent trả lời (cần `enabled && autoReply`) → `DELETE /v1/connections/{id}`.
3. **AC2:** token `read_only` gọi `POST /v1/connections` và `PATCH /v1/integrations/ai/openaiCompatible` → 403 trước khi chạm service; assert mọi response `getAiProvider`/`updateAiProvider` chỉ có `hasApiKey`, không có `auth`/`apiKey`/`workspaceId`/ciphertext.
4. **AC3:** `PATCH` `provider=openaiCompatible` thiếu `integrationId` → lỗi validation; truyền parent `Integration.id` → resolve được (superset), truyền id rác → 404.
5. **AC5:** chưa set env: connect `http://127.0.0.1:11434/v1` và `http://127.0.0.1:1234/v1` → bị chặn (connect: `400 connectionCredentialsRejected`; PATCH baseURL: `400 ssrfBlocked`); self-hosted + `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true` → connect được; cloud + env đó → vẫn bị chặn.
6. **AC6:** `grep '"private:.*integration-openai-compatible' apps/builder/__tests__/api-parity-manifest.json` → 0 dòng; chạy lại 3 lệnh test ở trên.

## Rủi ro

- **Cao:** `apiKey` vẫn plaintext trong DB (PR 2 chưa làm). Không được đóng CB-1/merge coi như xong bảo mật.
- **Cao:** E2E 6 bước chưa chạy thật (cần stack + provider). Bằng chứng hiện tại là unit test + CI; QA phải chạy E2E trên stack local.
- **Trung bình:** self-hosted đang dùng LM Studio/Ollama sẽ bị chặn sau khi deploy nếu không set `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true` (đã ghi upgrade note trong `docs/openai-compatible.md`).
- **Trung bình:** đổi `baseURL` cùng origin mà không gửi `apiKey` sẽ verify bằng key đang lưu; key cũ hỏng → 400, không phân biệt được với endpoint hỏng.
- **Thấp:** disconnect không có reference-guard — agent/flow còn trỏ satellite id sẽ fail runtime (đã chấp nhận, ghi docs).
- **Thấp:** `GET` không truyền `integrationId` trả toàn bộ instance của workspace — client phải tự chọn đúng `data[].id`.

## Môi trường

- Worktree: `/home/vif/workspace/worktrees/ChatbotX-cb-1-openai-compatible-api-ssrf` (sạch, head `2782fe418`).
- Không chạy stack local, không dùng DB/Redis, không cấu hình `.env` mới; test dùng mock.
- CI: run `45126421011` (head `2782fe418`) success toàn bộ matrix.

## Ngoài scope (đã thấy nhưng không làm)

- PR 2: migration cột `encryptedAuth` 7 bảng AI provider, mã hoá `store-bindings.ts`, reader dual-format, script backfill `--dry-run` — cần PO duyệt SQL trước khi apply.
- Reference-guard chặn disconnect khi AI agent/flow còn tham chiếu (spec non-goal).
- Cập nhật SRS `docs/chatbotx/srs/integration-openai-compatible.md` + ADR `encryptedAuth` — chỉ làm khi CB-1 DONE đủ 2 PR.
- `apps/mcp-server/README.md` không đổi (không có thay đổi `visibility` MCP).
