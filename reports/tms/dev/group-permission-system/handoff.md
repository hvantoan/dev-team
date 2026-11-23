# Handoff — group-permission-system (BE #138 + FE #193)

Nguồn sự thật: `docs/tms/analysis/permission-matrix-2026-11-23.json` (v3). Spec: `reports/tms/ba/group-permission-system/spec.md`.

## FE — tms-web (PR #193)

- **Branch:** `fix/group-permission-system` — https://github.com/FMS-Software-Team/tms-web/pull/193
- **Commit mới nhất:** `0a448dd` — `fix(permission): hide supplier debt recalculate without supdeb_rc, add supdeb_open key (ITMS-411)`
- **File đã sửa:**
  - `modules/role/enums/action-type.ts`: thêm `SupplierDebtRecalculate` (`supdeb_rc` = 20402) và `SupplierDebtOpening` (`supdeb_open` = 20403). Mã số đối chiếu BE `internal/domain/enum/permission.go`: `Action_SupplierDebtRecalculate = 20402`, `Action_SupplierDebtOpening = 20403`.
  - `modules/supplier-debt/components/debt-detail-dialog/supplier-debt-detail-dialog.tsx`: bọc nút "Tính lại công nợ NCC" (icon `CalculateRounded` mở `SupplierDebtRecalculateDialog`) bằng `<ProtectedElement permission={EActionType.SupplierDebtRecalculate}>` — role thiếu `supdeb_rc` thì nút không render (AC11).
    - **Lưu ý lệch tên file trong brief:** brief ghi `supplier-debt-recalculate-dialog.tsx`, nhưng nút nằm ở `supplier-debt-detail-dialog.tsx` (dialog recalculate chỉ có nút Gửi/Đóng). Đã bọc ở file chứa nút thật — cùng pattern `cusdeb_rc` của customer-debt.
- **Giữ nguyên từ commit `eb945bb`:** `ProtectedViewServer` cho các page, ẩn nút theo quyền, `handleApiError` rethrow 403/401, middleware path-permission.
- **Verify:**
  - `pnpm build` — PASS (exit 0; lần đầu bị OOM-kill exit 137 khi chạy song song với tsc, chạy lại một mình với `--max-old-space-size=8192` thì qua).
  - `npx tsc --noEmit -p tsconfig.json` — PASS (exit 0, không diagnostic).
  - `npx biome format` + `npx oxlint` trên 2 file sửa — sạch; pre-commit lint-staged (biome → tsc → oxlint) PASS.
  - `pnpm lint` (`next lint`) không chạy được: repo không có ESLint config nên next lint hỏi tương tác — tình trạng có sẵn, không phải do PR.
- **Follow-up:** chưa đụng `modules/dashboard/**` — chờ quyết định PO về quyền dashboard.

## BE — tms_application (PR #138)

- **Branch:** `fix/group-permission-system` — https://github.com/FMS-Software-Team/tms_application/pull/138
- **Commit mới nhất:** `db69aee` — `fix(permission): tighten endpoints to one owner per matrix v3, add 26 registry edges, recursive closure migration + session flush`

### Đã làm

1. **`internal/application/permission/data/permission_matrix.json`** — copy verbatim `endpoints` (kèm `allOf`/`allowAnyOf`/`exception`) của matrix v3. 118 endpoint, mỗi cái đúng 1 quyền module sở hữu; đúng 5 endpoint có `allowAnyOf > 1` (E2 `RoleService/GetModules` + 4 method DI theo E3). `CustomerDebtService/Get` siết còn `cusdeb_hx` (bãi bỏ E1). `ResourceService/ListAdUnit` = `(authenticated)`.
2. **`internal/application/permission/registry.go`** — thêm đủ **26 cạnh** missing vào `getActionRelations()` (tổng đúng **90 cạnh**, đối chiếu máy với matrix = 0 thiếu / 0 thừa). Đồng thời bỏ 2 cạnh dư so với matrix: `diso_cu→do_di` (E3 đã cho `diso_cu` vào thẳng DI endpoint) và `diso_d→do_r` (bắc cầu qua `diso_d→diso_r→do_r`). `NormalizePermissions` chuyển sang **closure đệ quy** (fixpoint) để đường lưu role và migration ra cùng một tập quyền.
3. **`migrations/000024_itms408_backfill_permission_closure.up.sql`** — viết lại thành **một statement `WITH RECURSIVE`**: 90 cạnh matrix + 3 cạnh seed (`supdeb_hx→supdeb_rc`, `cus_cu→supdeb_open`, `supdeb_hx→supdeb_open`). Gộp seed vào closure để idempotent tuyệt đối — bản cũ seed trước/closure sau khiến role nhận `supdeb_hx` ở vòng closure phải đợi lần chạy 2 mới có `supdeb_rc`. Bỏ qua `is_deleted = true`; chỉ UPDATE role có quyền mới.
4. **`scripts/flush-sessions.sh` + `make flush-sessions`** — bước flush session thật (BR-PQ-014): `SCAN --pattern 'auth:token:*'` rồi `DEL` theo batch 500, in `dbsize` trước/sau + `remaining session keys`. Không `FLUSHALL`/`FLUSHDB`. Chạy **sau** migration. Env: `REDIS_ADDR`/`REDIS_PASSWORD`/`REDIS_DB` (fallback `APP_REDIS_*` như Viper; `make flush-sessions` tự nạp `.env`).
5. **Test cập nhật theo spec mới** (không đụng `TestFormPermissionClosure`/`TestWriteImpliesViewWithinModule`): `TestCustomerDebtGetRequiresDebtHistoryPermission` (đổi tên từ `...AllowsReceiptOrDebtPermission`) = 7 case theo AC7 — `rec_debt_balance` thô → 403, `NormalizePermissions([rec_debt_balance])` → 200. `TestCustomerReceiptDebtBalancePermission` cập nhật check list = `rec_r + cus_r + cusdeb_hx`. `ListAdUnit` ra khỏi `matrixAllowlist` (đã có rule trong matrix).

### 26 cạnh đã thêm

`audit_r→usr_r`, `cus_cu→vehr_r`, `diso_cu→costs_r`, `diso_cu→cus_r`, `diso_r→cus_r`, `diso_r→do_r`, `do_cu→costs_r`, `do_cu→subcon_r`, `do_cu→wh_r`, `do_di→cus_r`, `fadj_cu→fissue_r`, `fadj_cu→frcp_r`, `fadj_cu→wh_r`, `fissue_cu→wh_r`, `frcp_cu→wh_r`, `pmt_cu→pytmtd_r`, `pmt_r→cus_r`, `rec_cu→cus_r`, `rec_cu→pytmtd_r`, `rec_debt_balance→cus_r`, `rec_debt_balance→cusdeb_hx`, `rec_r→cus_r`, `subcon_cu→cus_r`, `subcon_cu→do_r`, `usr_cu→role_r`, `usr_r→role_r`.

**Giữ theo matrix dù BA nghi chưa có caller** (câu hỏi mở #1 — cần BA/PO xác nhận): `do_cu→subcon_r`, `cus_cu→vehr_r`, `fadj_cu→wh_r`, `fissue_cu→wh_r`.

### Verify

- `go build ./...` — sạch (exit 0).
- `go test ./internal/...` — PASS hết (`permission`, `interceptor`, `service`, `audit`, `model`, `wrapper`); gồm `TestPermissionMatrixCoversEveryMethod`, `TestFormPermissionClosure` (14 màn), `TestWriteImpliesViewWithinModule`, `TestCustomerDebtGetRequiresDebtHistoryPermission` (7 case AC7).
- Đối chiếu máy `getActionRelations()` vs `dependencies` matrix: **90/90 cạnh khớp**.
- **Migration trên DB local** (`tms_itms408`, clone bảng `role` từ `tms_staging` + 6 role seed): run 1 `UPDATE 12`, run 2 **`UPDATE 0`**; down `UPDATE 6` (chỉ thu `supdeb_rc`/`supdeb_open`). Bằng chứng bắc cầu:
  - role chỉ `rec_debt_balance` → `+rec_r, +cus_r, +cusdeb_hx` (chuỗi `rec_debt_balance→rec_r→cus_r` + cạnh `→cusdeb_hx`).
  - role chỉ `diso_d` → `+diso_r, +do_r, +cus_r` (chuỗi `diso_d→diso_r→do_r→cus_r`).
  - role `is_deleted=true` giữ nguyên; role `permissions=[]` giữ nguyên.
- **Flush session trên `tms-local-redis`**: seed `auth:token:u1..u3` + `tms:lock:cron:test` + `ratelimit:counter` → `deleted=3`, `remaining=0`, `dbsize` 5→2 — chỉ mất đúng key session.

### Thứ tự deploy

1. Deploy BE (matrix + registry mới).
2. `migrate -path migrations -database "$APP_DATABASE_POSTGRES_DNS" up` (áp `000024`).
3. `bash scripts/flush-sessions.sh` (hoặc `make flush-sessions`) — xoá `auth:token:*` → mọi user đăng nhập lại 1 lần.

### Điểm QA cần chú ý

- **AC7 = 5 request**: `rec_r`/`rec_cu` đơn → 403; `cusdeb_hx` đơn → 200; role gán `rec_debt_balance` **rồi lưu role/chạy migration** (đã có `cusdeb_hx`) → 200; role thô chưa chuẩn hoá → 403. Kiểm `permissions` của role tại thời điểm gọi — không test bằng mảng quyền thô.
- **AC12**: cần **2 user khác role** đang login; trước deploy chụp mẫu key + `DBSIZE` (`SCAN` toàn bộ hoặc `--scan --pattern '*'`): sau flush chỉ `auth:token:*` mất, key ngoài namespace (`tms:lock:*`, counter) phải còn nguyên; request token cũ → 401.
- **AC3**: mở màn Phân quyền tick `pmt_cu` → phải tự tick `cus_r` + `pytmtd_r`; `usr_cu` → `role_r`; `audit_r` → `usr_r`.
- Lệch brief nhỏ: `diso_d→do_r` không có trong matrix (đã bỏ khỏi registry) — `diso_d` vẫn nhận `do_r` bắc cầu qua `diso_r` nên hành vi giữ nguyên.
- `scripts/check-no-comments.sh` trên nhánh đã FAIL từ commit `460db00` (comments trong file mới của PR trước) — commit `db69aee` không thêm comment line nào trong `*.go`.

## Dev-tms kiểm chứng (độc lập, 2026-11-23)

Chạy lại trên máy, không chỉ đọc báo cáo worker:

- `git fetch` + `git log origin/fix/group-permission-system`: BE `db69aee`, FE `0a448dd` — đã có trên remote.
- BE `go build ./...` exit 0; `go test -count=1 ./internal/application/permission/... ./internal/interceptor/...` PASS, chạy verbose xác nhận đủ 4 test tên trong brief (`TestPermissionMatrixCoversEveryMethod`, `TestFormPermissionClosure` 14 màn, `TestWriteImpliesViewWithinModule`, `TestCustomerDebtGetRequiresDebtHistoryPermission` 7 case).
- `permission_matrix.json` vs matrix v3: so từng endpoint theo `endpoint` key — 118/118 cùng tập, **0 lệch** trên `module`/`allowAnyOf`/`allOf`; đúng 5 endpoint `allowAnyOf > 1`.
- Registry: parse `getActionRelations()` → map enum→key, thu **90 cạnh**, so với `dependencies` của matrix: **0 thiếu / 0 thừa**.
- `000024*.up.sql` có `WITH RECURSIVE`, gộp 3 cạnh seed; `down` chỉ thu `supdeb_rc`/`supdeb_open`.
- `scripts/flush-sessions.sh`: `SCAN --pattern auth:token:*` + `DEL` theo lô, in `dbsize` trước/sau, không có `FLUSHALL`/`FLUSHDB`, fail nếu còn key.
- FE: diff `0a448dd` đúng 2 file, `ProtectedElement` prop `permission` khớp signature thật; key dùng dạng chuỗi `supdeb_rc`/`supdeb_open` (đúng convention file, không dùng mã số).
- **Chưa chạy lại migration trên DB của mình** (không đọc `.env` để lấy credential trong phiên này) — bằng chứng `run 2 = UPDATE 0` trong mục Verify ở trên là của worker; QA phải chạy lại trên stack local.

→ Đủ điều kiện Điều phối giao qa-tms dựng stack.

## Follow-up

- Dashboard FE chưa đụng (chờ PO).
- 4 cạnh nghi chưa có caller (`do_cu→subcon_r`, `cus_cu→vehr_r`, `fadj_cu→wh_r`, `fissue_cu→wh_r`) — giữ theo matrix, BA xác nhận bỏ/giữ.
- `make lint` vẫn blocked: `.golangci.yml` v1 vs binary v2 (tình trạng có sẵn); `gofmt -l` còn 7 file cũ trên nhánh (không phải file PR này sửa).
