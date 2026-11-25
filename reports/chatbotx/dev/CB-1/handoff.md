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

---

# PR 2 — mã hoá `auth` mọi AI provider + backfill (worker `ctx_6798cba05d22`)

| Repo | Branch → PR | Commit |
|---|---|---|
| ChatbotX (`/home/vif/orca/workspaces/ChatbotX/chatbotx-cb-1-pr2-encrypted-auth`) | `feat/cb-1-pr2-encrypted-auth` → https://github.com/hvantoan/ChatbotX/pull/7 (stacked, base `feat/cb-1-openai-compatible-api-ssrf`) | `56b5f7b8fb913ae5611a0de6e9bd987862589a4f` (2 commit: `c477d3cbf` + `56b5f7b8f`) |

CI run tại `56b5f7b8f`: Lint, Types (apps/packages), Tests 1–8/8, Devin — all SUCCESS. Không merge/đóng.

## Thay đổi

- **Schema + migration:** cột `encryptedAuth jsonb` nullable thêm vào 7 bảng AI provider (`IntegrationOpenai`, `Claude`, `Gemini`, `Deepseek`, `Muse`, `Openrouter`, `OpenaiCompatible`) theo type `CredentialEncrypted` của partial credential (giống woocommerce/shopify/meta-catalog). Migration `drizzle/20261123080744_add_encrypted_auth_to_ai_providers/` = 7 `ALTER TABLE ADD COLUMN`, đã commit SQL + snapshot. **Chưa apply lên bất kỳ DB — chờ PO duyệt.**
- **Store binding (`store-bindings.ts`, `store-bindings-channels.ts`):** flag `encryptAuth: true` cho đúng 7 provider. `insertRow`/`saveAuthByForeignKey` ghi `auth: {}` + ciphertext vào `encryptedAuth` (AAD `ai-provider:<provider>:<workspaceId>`); `loadAuthByForeignKey` chọn cả 2 cột, dual-read qua `resolveAiProviderAuth` (ưu tiên `encryptedAuth`, fallback plaintext `auth`).
- **Decrypt ở tầng business/repository:** `service.ts` openai-compatible (finder `withDecryptedAuth`; `connect`/`update` ghi `auth: {}` + `encryptedAuth`) và `packages/ai/src/server/factory.ts` (`withDecryptedAuth` trong `getAIIntegrationInDB`, `getOpenaiCompatible{AutoReply,}IntegrationInDB`; `embedding-model.ts` chuyển sang dùng `getAIIntegrationInDB`; `reply-model.ts`). Consumer cũ (`openai-compatible.ts`, `muse-transcribe.ts`, `segment-image.ts`, `update.action.ts`) không cần sửa vì nhận `auth` đã giải mã qua `aiIntegrationService.findBy`/`service.finders`.
- **Backfill `packages/database/scripts/backfill-ai-provider-auth/`:** `--dry-run` mặc định, idempotent (skip row đã có `encryptedAuth` hoặc `auth` đã là ciphertext), log số row theo bảng, có unit test logic thuần. **Không chạy apply trong PR này.**

## Điểm lệch spec / ngoài allow-list (đã chấp nhận có lý do)

1. **`packages/business/package.json` + file mới `connection/ai-provider-auth.ts` + re-export tại `store-bindings.ts`:** CI đầu báo lỗi import barrel `ai -> business/connection` phá mock schema ở `apps/worker`; fix bằng leaf subpath export `@chatbotx.io/business/connection/ai-provider-auth`. Đây là file duy nhất ngoài allow-list — cần thiết để không kéo toàn bộ business vào `packages/ai`.
2. **`store-bindings.ts` re-export `aiProviderAuthAad`/`encryptAiProviderAuth`/`resolveAiProviderAuth`** để `service.ts` dùng cùng helper (giữ AAD đồng nhất).
3. **`auth` mới ghi là `{}` (không `null`)** với các bảng `auth` NOT NULL (`IntegrationOpenai`) — giữ invariant DB; response public vẫn chỉ `hasApiKey` (`Boolean({}) = true`).
4. **Chưa chạy backfill `--dry-run` thật:** worktree không có `.env` DB và cột `encryptedAuth` chưa tồn tại trên DB local (migration chưa apply). Có unit test thuần (`__tests__/backfill-ai-provider-auth.test.ts`) cho logic idempotent; QA/PO cần chạy dry-run sau khi duyệt migration trên môi trường có DB.

## Chờ PO duyệt / migration đã apply local

- ~~SQL migration `packages/database/drizzle/20261123080744_add_encrypted_auth_to_ai_providers/migration.sql` (generate-only).~~ **ĐÃ APPLY lên DB dev local `localhost:25432/chatbotx` (docker `chatbotx-postgres-1`)** — PO duyệt trong item #4. Log: `Applied migration: 20261123080744_add_encrypted_auth_to_ai_providers`. Verify: `information_schema` có `encryptedAuth` trên đủ 7 bảng AI + `drizzle.__drizzle_migrations` đã ghi.
- **Backfill `--dry-run` trên DB dev local: 0 row thật** (`scanned=0` cả 7 bảng — DB dev local không có AI provider nào). Đã seed probe row plaintext `IntegrationOpenaiCompatible` để kiểm chứng path encrypt: `scanned=1, would-encrypt=1, no writes` (`auth` vẫn plaintext, `encryptedAuth` NULL sau dry-run); probe đã DELETE sạch.
- **Lưu ý env:** `.env` repo trỏ remote dev DB `db.hvantoan.io.vn:5432` — mọi lệnh trên chạy bằng `DATABASE_URL` override tường minh `postgresql://chatbotx:secretkey@localhost:25432/chatbotx?schema=public` (theo `apps/builder/.env` + `projects/chatbotx.json`). KHÔNG đụng DB remote/dùng chung.
- Còn chờ: `--apply` backfill lên môi trường có dữ liệu thật + PO duyệt merge (PR chờ).
- **Log dry-run:** `reports/chatbotx/dev/CB-1/backfill-dryrun-2026-11-23.log` — chạy 2 lần cùng output `scanned=0` cả 7 bảng (idempotent bề mặt; row `encryptedAuth` đã set sẽ bị `WHERE encryptedAuth IS NULL` loại khỏi batch nên apply-thật lặp lại cũng không ghi đè).
- **Lưu ý idempotent với dữ liệu thật:** không apply được trên DB rỗng nên chưa chứng minh apply→re-run=0 trên data thật; kiểm chứng bằng probe row (`scanned=1, would-encrypt=1, no writes`). Khi chạy `--apply` trên môi trường có data, chạy lại cùng script → `scanned=0` mới là chứng minh idempotent đầy đủ.
- **PO chốt (2026-11-23): KHÔNG làm PR reverse-script `encryptedAuth→auth` ở thời điểm này** (DB dev rỗng, rủi ro chỉ phát sinh khi `--apply` lên prod). Ghi nhận yêu cầu: **trước `--apply` trên môi trường có data phải chuẩn bị phương án rollback** (script reverse hoặc thủ công restore `auth` từ `encryptedAuth`).

## Rủi ro / lưu ý cho PO

- **Rollback sau khi backfill:** `auth = {}` + `encryptedAuth` ciphertext; rollback code cũ đọc plaintext `auth` sẽ fail. Cần script reverse-rollback (decrypt `encryptedAuth` → `auth`) nếu rollback sau backfill — chưa có (ngoài scope PR).
- **Write path plaintext còn sót:** `connectAiProviderIntegration` / `integrationOpenrouterService.connect` vẫn ghi plaintext; reader dual-format nên không gãy, nhưng row mới qua path này sẽ ở plaintext tới khi backfill sau.
- **Khoá mã hoá:** dùng `encryptUtils` (env `ENCRYPTION_KEY` đã có trong `.env.example`); AAD buộc decrypt đúng `provider` + `workspaceId` — copy ciphertext sang workspace khác sẽ fail.
- **Overlap với contract-fix (`fix/cb-1-pr1-contract`):** cùng đụng `service.ts`/`update.action.ts` nhẹ — PR2 cần rebase sau khi contract-fix vào base (xem lane riêng).

---

# PR1 contract fix — connect `ssrfBlocked` + UI `providerUnreachable` (worker `ctx_61124dc4e813`)

| Repo | Branch → PR | Commit |
|---|---|---|
| ChatbotX (`/home/vif/orca/workspaces/ChatbotX/chatbotx-cb-1-pr1-contract`) | `fix/cb-1-pr1-contract` → https://github.com/hvantoan/ChatbotX/pull/8 (base `feat/cb-1-openai-compatible-api-ssrf`) | `3408687934589e70e26ee9328dd2781d44a6b73d` (2 commit: `13fdca4d4` + `340868793`) |

CI tại `340868793`: Lint, Types (apps/packages), Tests 1–8/8 — SUCCESS; Devin issue đã fix + replied. Không merge/đóng.

## Thay đổi (PO đã chốt)

- `packages/connections/src/credentials.ts`: unwrap `ChatbotXException code="ssrfBlocked"` **chỉ cho `openaiCompatible`** trong `fromCredentials` catch → `POST /v1/connections` trả `400 ssrfBlocked` thay `connectionCredentialsRejected`; `stripInternalErrorCode` bỏ hậu tố `(code …)` khỏi public message. Legacy providers giữ nguyên mapping.
- UI `connect.action.ts`/`update.action.ts`: `unreachable` → i18n `openaiCompatible.validation.providerUnreachable` (21 locale), `unsafe_base_url`/`invalidBaseUrl` giữ `invalidBaseURL`. Public API PATCH vẫn `invalidBaseUrl` (theo spec AC5).
- `orpc-error-helper.ts`: khai báo `ssrfBlocked` trong `possibleErrorsOnCreatingConnection` + contract assertion (từ review Devin).
- Docs `docs/openai-compatible.md` cập nhật hành vi mã lỗi.

## Test đã chạy (worker)

- `pnpm lint`; `pnpm --filter @chatbotx.io/business test` (10,077); `pnpm --filter @chatbotx.io/connections test` (136); builder `openai-compatible-actions`, `integrations-public-api`, `openai-compatible-provider-verify`, `public-spec-operations`, `connections-public-api`, `connections-public-spec-flat` — pass. Không chạy `pnpm check-types` local theo PO.

## Lưu ý
- Connect private `127.0.0.1`/`169.254.169.254` → `400 ssrfBlocked` trên cả connect lẫn PATCH update — khớp chữ AC5.
- **PR2 `feat/cb-1-pr2-encrypted-auth` (PR #7) cần rebase lên base mới sau khi PR #8 merge** vào `feat/cb-1-openai-compatible-api-ssrf` (cùng đụng `service.ts`/`update.action.ts`).
