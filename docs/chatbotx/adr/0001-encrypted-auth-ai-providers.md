# ADR-0001: Mã hoá API key AI provider bằng cột `encryptedAuth` tại `store-bindings.ts`

- **Trạng thái:** Accepted (đã merge PR `#7` `6f0e00f55` / `a352b331d` và hardening `ff1d482e9` vào `main`)
- **Ngày:** 2026-11-23 (chuẩn hoá docs 2026-11-25)
- **Ticket:** `CB-1` — https://vtxsolution.atlassian.net/browse/CB-1
- **Phạm vi:** 7 AI providers (`openai`, `claude`, `gemini`, `deepseek`, `muse`, `openrouter`, `openaiCompatible`)

---

## 1. Bối cảnh (Context)

Trước `CB-1`, toàn bộ 7 bảng satellite AI provider trong PostgreSQL (`IntegrationOpenai`, `IntegrationClaude`, `IntegrationGemini`, `IntegrationDeepseek`, `IntegrationMuse`, `IntegrationOpenrouter`, `IntegrationOpenaiCompatible`) đều lưu API key ở dạng **plaintext JSON** trong cột `auth` (`{"authType":"secretText","secretText":"..."}`).

Các yêu cầu và ràng buộc khi khắc phục:
1. Cần mã hoá API key at-rest bằng `@chatbotx.io/encryption` (`ENCRYPTION_KEY`, `ENCRYPTION_KEY_ID`) thống nhất cho cả 7 AI provider, gắn AAD để chống copy ciphertext chéo workspace/provider.
2. Cột `auth` trên schema/code hiện tại được định kiểu `AuthValue` (một số bảng có ràng buộc `NOT NULL`), và quá trình deploy có thể diễn ra kiểu rolling deploy (worker/builder cũ và mới chạy song song trong lúc chuyển tiếp).
3. `packages/ai` core không được import trực tiếp `@chatbotx.io/encryption` để giữ tách lớp phụ thuộc và giữ hàm khởi tạo model đồng bộ.

---

## 2. Quyết định (Decision)

1. **Thêm cột riêng `encryptedAuth jsonb` (nullable) cho 7 bảng AI provider:**
   - Sinh migration `packages/database/drizzle/20261123080744_add_encrypted_auth_to_ai_providers/migration.sql` thêm cột `encryptedAuth jsonb` (`$type<CredentialEncrypted>()`) cho đủ 7 bảng, giữ nguyên cột `auth` không ghi ciphertext đè vào `auth`.
2. **Tập trung logic ghi/đọc mã hoá tại `store-bindings.ts`:**
   - Trong `packages/business/src/connection/store-bindings-channels.ts`, bật cờ `encryptAuth: true` cho đúng 7 workspace-integration bindings AI (`claude`, `deepseek`, `gemini`, `muse`, `openai`, `openaiCompatible`, `openrouter`); các integration không phải AI giữ nguyên.
   - `makeWorkspaceIntegrationBinding` trong `packages/business/src/connection/store-bindings.ts` khi `encryptAuth: true`:
     - **Ghi (`insertRow`, `saveAuthByForeignKey`):** đặt `auth: {}` (giữ invariant `NOT NULL` nơi cần thiết và làm `Boolean(row.auth)` vẫn đúng cho `hasApiKey`) và lưu ciphertext vào `encryptedAuth` qua `encryptAiProviderAuth({ provider, workspaceId }, auth)` với AAD:
       ```text
       ai-provider:<provider>:<workspaceId>
       ```
     - **Đọc (`loadAuthByForeignKey`):** chọn cả `auth` và `encryptedAuth`, giải mã qua `resolveAiProviderAuth`.
   - `IntegrationOpenaiCompatibleService` (`connect`, `update`, `withDecryptedAuth`) tái sử dụng cùng helper `encryptAiProviderAuth` / `resolveAiProviderAuth` re-export từ `store-bindings.ts` để giữ đồng nhất AAD.
3. **Dual-read an toàn cho rolling deploy & tách leaf module:**
   - Helper đặt tại leaf subpath export `@chatbotx.io/business/connection/ai-provider-auth` (`packages/business/src/connection/ai-provider-auth.ts`) để `packages/ai/src/server/factory.ts` (`getAIIntegrationInDB`, `getOpenaiCompatibleAutoReplyIntegrationInDB`, `withDecryptedAuth`) giải mã trước khi tạo model, không kéo vòng phụ thuộc barrel hay ép `packages/ai` core import `@chatbotx.io/encryption`.
   - `resolveAiProviderAuth` đọc **dual-format**: ưu tiên parse `row.auth` theo `authValueSchema` trước; nếu có plaintext hợp lệ (row cũ chưa backfill hoặc writer cũ vừa ghi đè trong lúc rolling deploy) thì trả về plaintext đó để không bị ciphertext cũ che mất key mới; ngược lại mới giải mã `row.encryptedAuth`.
4. **Backfill tách pha (`--dry-run` mặc định → `--apply`) & key rotation:**
   - Script `packages/database/scripts/backfill-ai-provider-auth.ts` (`BATCH_SIZE = 200`, cursor theo `id`), mặc định chạy `--dry-run`, chỉ update khi dùng `--apply` với điều kiện chống race `WHERE id = ... AND "encryptedAuth" IS NULL AND auth = <oldAuth>`, ghi `auth = '{}'::jsonb` + `encryptedAuth`.
   - Cập nhật `packages/database/scripts/rotate-encryption-key.ts` để hỗ trợ xoay `ENCRYPTION_KEY` cho cột `encryptedAuth` của 7 bảng AI provider.
5. **Không tạo script reverse (`encryptedAuth → auth`):**
   - Theo quyết định PO ngày 2026-11-23 (`reports/chatbotx/scrum/impediments.md`, `board.md`), không triển khai PR reverse-script ở thời điểm merge vì DB dev đang rỗng và rủi ro rollback chỉ phát sinh nếu chạy `--apply` trên dữ liệu thật.

---

## 3. Phương án đã cân nhắc (Alternatives Considered)

- **Phương án A — Ghi ciphertext trực tiếp vào cột `auth` hiện có:**
  - *Bị từ chối:* Trộn lẫn plaintext `AuthValue` và `EncryptedData` trên cùng một cột làm mất an toàn kiểu Schema/Drizzle và phức tạp hoá kiểm soát dữ liệu trong lúc rolling deploy.
- **Phương án B — Mã hoá đồng loạt ngay trong SQL migration (bỏ dual-read):**
  - *Bị từ chối:* SQL migration không tiếp cận được `ENCRYPTION_KEY` ở tầng app và sẽ làm gãy ngay các tiến trình `builder`/`worker` phiên bản cũ đang chạy khi chưa kịp rolling deploy xong.

---

## 4. Hệ quả (Consequences)

### Tích cực
- Toàn bộ 7 AI providers được bảo vệ bằng mã hoá at-rest dùng chung cơ chế tại `store-bindings.ts`, có AAD buộc đúng `(provider, workspaceId)` và hỗ trợ key rotation.
- Triển khai không downtime: code mới có thể deploy trước nhờ dual-read; backfill chạy tách biệt theo từng batch và idempotent.
- Public API không bao giờ trả raw secret hay ciphertext (chỉ trả `hasApiKey: boolean`).

### Rủi ro & Đánh đổi đã chấp nhận
- **Rollback production sau `backfill --apply` sẽ mất khả năng đọc `apiKey` ở bản cũ:** Sau khi chạy `--apply`, cột `auth` được xoá rỗng thành `{}`. Vì **không có script reverse (`encryptedAuth → auth`)**, nếu phải rollback code về phiên bản trước `CB-1` sau khi đã `--apply` trên dữ liệu thật, code cũ chỉ đọc `auth` plaintext sẽ không lấy được `apiKey` (gây lỗi runtime AI / trả 500 hoặc mất key) cho tới khi viết script giải mã ngược hoặc thao tác restore thủ công. **PO đã chấp nhận rủi ro này** (2026-11-23, `impediments.md`).
- **Quy trình rollout bắt buộc trước `--apply` trên môi trường có dữ liệu thật:**
  1. Deploy bản dual-read lên toàn bộ `builder` và `worker` trước, drain hết tiến trình cũ.
  2. Chạy `backfill-ai-provider-auth.ts` (mặc định `--dry-run`) và trình PO duyệt số lượng trước khi chạy `--apply`; lặp lại cho tới khi `conflicted = 0`.
  3. Chuẩn bị sẵn phương án reverse/restore trước khi bấm `--apply` trên production nếu cần khả năng hạ cấp code nhanh.
- **Nhất quán `ENCRYPTION_KEY` / `ENCRYPTION_KEY_ID`:** Môi trường dùng lại DB đã mã hoá bắt buộc phải dùng đúng bộ key đã mã hoá dòng dữ liệu (nếu lệch key, giải mã thất bại ở `runAIReply` hoặc trả 500 `Cipher job failed` khi `PATCH`).
- **Write path legacy còn lại:** Các path legacy không đi qua `store-bindings.ts` (như `connectAiProviderIntegration` hoặc `integrationOpenrouterService.connect` nếu còn được gọi) vẫn ghi plaintext vào `auth`; hệ thống vẫn đọc được bình thường nhờ dual-read nhưng các dòng này cần backfill lại nếu phát sinh trước khi loại bỏ hẳn path legacy.
