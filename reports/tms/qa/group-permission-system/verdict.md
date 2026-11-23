# QA Verdict — group-permission-system

- **Ticket/Key:** nhóm `group-permission-system` (ITMS-382, 384, 385, 408, 409, 410, 411)
- **Stack:** local `scripts/stack.sh` — Postgres 17 (tms-postgres:5436), Redis 7 (tms-redis:6380, DB 1), BE :50051 (http :8081), FE :4700 dev mode, tenant `tuanvudev`, seed `tests/tms/seed/001-tenant-and-users.sql`
- **Ngày chạy:** 2026-11-23 (01:06–01:35 +07)
- **Nguồn sự thật:** `docs/tms/analysis/permission-matrix-2026-11-23.json` (v3) · spec `reports/tms/ba/group-permission-system/spec.md` · handoff `reports/tms/dev/group-permission-system/handoff.md`

| Repo | Branch/commit |
|---|---|
| tms_application (BE) | `fix/group-permission-system@db69aee` |
| tms-web (FE) | `fix/group-permission-system@0a448dd` |

## Verdict: FAIL

Lý do: **AC12 nửa FE không đạt** — sau flush session, trình duyệt còn cookie cũ nhận **HTTP 500 "Application error"** thay vì được đưa về trang login. Toàn bộ AC còn lại PASS (AC11 nửa UI bị BLOCKED vì seed local không có dữ liệu công nợ NCC — không phải lỗi code).

## Tài khoản test

Role/user seed bằng `evidence/seed-qa-roles.py` (quyền **thô** đúng như khai báo, sau đó chuẩn hoá bằng migration thật):

| Vai trò | User | Quyền trên endpoint |
|---|---|---|
| Có `cusdeb_hx` | `qa-cusdeb-hx` | `cusdeb_hx`, `cus_r` |
| Chỉ `rec_r` / `rec_cu` | `qa-rec-r` / `qa-rec-cu` | `rec_r`+`cus_r` / `rec_cu`+`cus_r`+`pytmtd_r`+`rec_r` |
| `rec_debt_balance` (chuẩn hoá) | `qa-rec-debt-balance` | `rec_debt_balance`, `rec_r`, `cus_r`, `cusdeb_hx` |
| Chỉ `prd_r` | `qa-prd-r` | `prd_r` |
| `do_cu` (chuẩn hoá) | `qa-do-cu` | `do_cu`, `cus_r`, `do_r`, … |
| `supdeb_rc` / `supdeb_open` / chỉ `supdeb_hx` thô | `qa-supdeb-rc` / `qa-supdeb-open` / `qa-supdeb-hx-raw` | theo seed |
| `usr_cu`, `usr_cu`+`role_cu` | `qa-usr-cu`, `qa-usr-cu-role-cu` | theo seed |
| `vehr_cu` | `qa-vehr-cu` | `vehr_cu`, `vehr_r` |

## Done-conditions

| # | Điều kiện | Kết quả | Evidence |
|---|---|---|---|
| AC1 | 118/118 endpoint, đúng 1 quyền module sở hữu, đúng 5 ngoại lệ E2/E3 có `exception`, không `allOf` nhiều phần tử, `needs_decision` rỗng | **PASS** | `evidence/ac1-ac2-ac3-static.json` (mục `ac1`), script `evidence/check-matrix.py` |
| AC2 | `permission_matrix.json` trong BE = `endpoints`/`allOf`/`allowAnyOf` của matrix v3 | **PASS** — 118/118, 0 thiếu, 0 thừa, 0 lệch field, BE cũng đúng 5 endpoint `allowAnyOf>1` | `evidence/ac1-ac2-ac3-static.json` (mục `ac2`) |
| AC3 | Registry 90 cạnh; UI tick nguồn tự tick đích | **PASS** — máy: 90/90 cạnh khớp, 0 thiếu/0 thừa; API `GetModules` trả `check` đúng: `pmt_cu→[pmt_r,cus_r,pytmtd_r]`, `usr_cu→[usr_r,role_r]`, `audit_r→[usr_r]`; UI thật: tick `cus_cu` (module Đối tác) tự tick `cus_r` và `vehr_r` (module Tuyến xe) | `evidence/ac1-ac2-ac3-static.json` (`ac3_registry`), `evidence/roles-modules-raw.json`, `evidence/ui-ac3-result.json`, `evidence/ac3-tick-cus_cu.png`, `evidence/ac3-cross-module-vehr_r.png` |
| AC4 | Migration đệ quy: role chỉ `rec_debt_balance` → `rec_r`+`cus_r`+`cusdeb_hx`; role chỉ `diso_d` → `diso_r`+`do_r`+`cus_r` (bắc cầu 2 bước); chạy lần 2 = `UPDATE 0`; down chạy được | **PASS** — run1 `UPDATE 18`, run2 `UPDATE 0`, down `UPDATE 6` | `evidence/ac4-run1.log`, `ac4-run2.log`, `ac4-down.log`, `ac4-before.txt`, `ac4-after-run1.txt`, `ac4-after-run2.txt`, `ac4-after-down.txt` |
| AC5 | `TestFormPermissionClosure` + `TestWriteImpliesViewWithinModule` PASS sau khi siết, không sửa test | **PASS** — 14/14 màn trong closure test PASS; `go test ./internal/...` exit 0 | `evidence/gotest/go-test-matrix-tests.log`, `evidence/gotest/go-test-internal.log` |
| AC6 | `prd_r` → `ListPartner` 403; `do_cu` → 200 (nhờ `do_cu→cus_r`) | **PASS** — 403 / 200 | `evidence/api-probe-post-migration.json` (`ac6.1`, `ac6.2`) |
| AC7 | 5 case `CustomerDebtService/Get` | **PASS** — `rec_r` 403, `rec_cu` 403, `cusdeb_hx` 404 (=qua interceptor, không có dữ liệu KH), role thô `rec_debt_balance` (trước migration) 403, role đã chuẩn hoá (sau migration, `permissions` có `cusdeb_hx`) 404 | `evidence/api-probe-pre-migration-2.json` (`ac7.4` = 403), `evidence/api-probe-post-migration.json` (`ac7.*`), `evidence/roles-after-normalize.txt` |
| AC8 | `ListAdUnit` = authenticated | **PASS** — có token 200, không token 401 | `evidence/api-probe-post-migration.json` (`ac8.1`, `ac8.2`) |
| AC9 | Chốt cũ: `supdeb_rc`/`supdeb_open`, `SaveUser`+`roleId` cần `role_cu` (cả tạo mới), `DeleteImage`, 2 method DI, `GetModules` | **PASS** — ReCalculate: có `supdeb_rc` → 500 nghiệp vụ (`supplier_notfound`, qua quyền), không có → 403; opening balance NCC: có `supdeb_open` → 500 nghiệp vụ, không có → 403; SaveUser+roleId: `usr_cu` đơn → `user.save.role_permission_required`, `usr_cu`+`role_cu` → 200; DI `GetDeliveryInstruction`: `do_di`/`diso_cu`/`diso_r` → qua quyền, `prd_r` → 403; `GetModules`: `role_r`/`role_cu`/`usr_cu` 200, `prd_r` 403; `DeleteImage` authenticated → 200 | `evidence/api-probe-post-migration.json` (`ac9.1`–`ac9.15`) |
| AC10 | Catalog chỉ còn 10602 `vehr_cu`; 10304 vắng; role `vehr_cu` vào được màn Tuyến xe | **PASS** — `GET /api/v1/roles/modules` 200, không có `10304`, có `{"actionId":10602,"key":"vehr_cu"}`; UI `/vehicle-routes` 200, 20 dòng dữ liệu, không bị đẩy về login | `evidence/roles-modules-raw.json`, `evidence/api-probe-post-migration.json` (`ac10.catalog`), `evidence/ui-ac10-result.json`, `evidence/ac10-vehr-cu-vehicle-routes.png` |
| AC11 | FE: nút "Tính lại công nợ NCC" bọc `ProtectedElement` `supdeb_rc`, ẩn khi thiếu quyền | **BLOCKED (nửa UI)** — code đúng (`ProtectedElement permission={EActionType.SupplierDebtRecalculate}`, key `supdeb_rc` trong `action-type.ts`), nhưng seed local **không có dòng công nợ NCC nào** nên dialog chi tiết (nơi chứa nút) không mở được: màn NCC trả "Không tìm thấy kết quả" với mọi bộ lọc. Không kết luận FAIL vì thiếu dữ liệu, không phải thiếu code | `evidence/ui-ac11-result.json`, `evidence/debug-dialog-1795371810936.png`, `evidence/debug-supplier-debt.cjs`, `modules/supplier-debt/components/debt-detail-dialog/supplier-debt-detail-dialog.tsx:90` |
| AC12 | Flush toàn bộ session, chỉ trong prefix `auth:token:*`; token cũ → 401; FE về login; key ngoài namespace còn | **FAIL (nửa FE)** — BE/Redis đạt: `deleted=20`, `remaining=0`, `dbsize 24→4` (giảm đúng 20), 3 key ngoài namespace (`tms:lock:*`, `ratelimit:counter:*`, `cache:*`) còn nguyên, token cũ 2 user → **401**, login lại 200 với `permissions` khớp DB. Nhưng FE: trình duyệt còn cookie cũ vào `/supplier-debt`, `/roles`, `/dashboard` đều **HTTP 500 "Application error: a server-side exception"** (FE log: `TRPCError [unauthenticated] phiên đăng nhập không hợp lệ` từ `shared/utilities/grpc-tranport.ts:18` qua `modules/settings/setting.api.ts:9`), **không** điều hướng về `/login`; context sạch thì redirect `/tms/login?callbackUrl=...` đúng | `evidence/ac12-result.json`, `evidence/ac12-flush.log`, `evidence/ac12-keys-before.txt`, `evidence/ac12-keys-after.txt`, `evidence/ui-ac12-check-result.json`, `evidence/debug-ac12-check.cjs`, `evidence/debug-ac12-roles.png`, `evidence/ac12-after-flush-redirect.png` |

## Đối chiếu

- Matrix v3 ↔ BE `permission_matrix.json`: 118/118 endpoint, 0 lệch `module`/`allowAnyOf`/`allOf`.
- Matrix v3 `dependencies` (90) ↔ `getActionRelations()` parse từ `registry.go`: 0 thiếu / 0 thừa. Ghi nhận 2 cạnh bị bỏ so với bản matrix cũ (`diso_cu→do_di`, `diso_d→do_r`) — hành vi điều xe không đổi: `diso_d` vẫn nhận `do_r` qua bắc cầu (`diso_d→diso_r→do_r`), đã kiểm bằng migration (`qa-diso-d` sau closure có `do_r`).
- Registry ↔ API thật: `GetModules.actions[].check` khớp đúng các cạnh đã khai (`pmt_cu`, `usr_cu`, `audit_r`, `cus_cu`, `rec_debt_balance`).
- Catalog ↔ code: `Action_RouteEdit=10602` còn, `Action_CustomerAddRoute` (10304) không còn trong `internal/domain/enum/permission.go`.

## Regression đã kiểm

- 401: `ListAdUnit` không token → 401; token cũ sau flush → 401 (2 user); `DeleteImage` với token hợp lệ → 200 (authenticated).
- 403: `prd_r` trên `ListPartner`, `GetModules`, `GetDeliveryInstruction`, `Recalculate`, opening balance NCC; `rec_r`/`rec_cu` trên `CustomerDebtService/Get`.
- Endpoint liền kề: `GetModules` (E2) đủ 3 quyền đúng; 4 method DI (E3) đúng 3 quyền; `SupplierDebtService/Recalculate` + opening balance NCC giữ chốt `supdeb_rc`/`supdeb_open`.
- `go test -count=1 ./internal/...` exit 0 (permission, interceptor, service, audit, model, wrapper).

## Phát hiện ngoài phạm vi

1. **FE không xử lý 401 server-side (AC12, chặn PASS):** mọi route authenticated trả HTTP 500 khi session đã bị flush thay vì redirect `/login`. Đề nghị Dev bắt `unauthenticated` trong `shared/utilities/grpc-tranport.ts`/server components và `redirect('/login')`.
2. **Seed local thiếu dữ liệu công nợ NCC** (0 dòng ở mọi bộ lọc), nên AC11 không kiểm được bằng UI. Đề nghị bổ sung fixture (payment voucher NCC hoặc opening balance) vào `tests/tms/seed/` để lần sau kiểm được.
3. **`GetSupplierPayableAmount`/`SavePartnerSupplierOpeningBalance` trả lỗi nghiệp vụ khi thiếu dữ liệu** (`partner.opening_balance.balance_type_invalid` với `balanceType: "DEBT"` đúng theo enum BE) — cần Dev xác nhận đây là hành vi mong đợi hay lỗi map enum; không chặn AC nào ở trên nhưng đáng kiểm.

## Ghi chú

- Lệch so với brief Dev đã biết, **không** tính là lỗi mới: 2 cạnh dư bị bỏ, 4 cạnh BA nghi chưa có caller vẫn giữ, `scripts/check-no-comments.sh` fail sẵn từ `460db00`.
- Toàn bộ case chạy trên stack dựng từ đúng 2 commit trong handoff (FE `0a448dd` chạy từ worktree chính `/home/vif/tuan-vu/tms-web` vì Turbopack từ chối symlink `node_modules` của worktree tạm; `git rev-parse HEAD` = `0a448dd`, cây làm việc sạch ngoài `.pi/`).
- Redis host không có `redis-cli`; `evidence/bin/redis-cli` là shim gọi `docker exec tms-redis redis-cli` (cùng binary, cùng DB 1) để chạy `scripts/flush-sessions.sh` nguyên bản.
- Script tái tạo: `evidence/check-matrix.py`, `evidence/seed-qa-roles.py`, `evidence/api-probe.mjs`, `evidence/ac12-flush.sh`, `evidence/qa-ui-permission.cjs` (chạy qua `evidence/qa-env.sh` để nạp credential local, không in ra).
- Dữ liệu test để lại trong DB local: 20 role/user `qa-*` + 3 key Redis ngoài namespace; stack đã `down` sau khi chạy.
