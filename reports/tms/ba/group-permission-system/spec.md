# Spec — group-permission-system — Matrix quyền v3 (siết allowAnyOf → WithCheck)

- **Ticket:** ITMS-382, ITMS-384, ITMS-385, ITMS-408, ITMS-409, ITMS-410, ITMS-411 (nhóm `group-permission-system`)
- **Run:** `reports/tms/orchestrator/2026-11-23-nhom-phan-quyen/plan.md`
- **Trạng thái:** v3 — PO anh Văn Toàn đã **clear spec** ngày 2026-11-23, kèm 2 điều chỉnh khi clear (siết tuyệt đối `CustomerDebtService/Get`; re-login = flush toàn bộ session). 6 quyết định PO là đầu vào bắt buộc.
- **Ngày viết:** 2026-11-23
- **Nguồn sự thật:** `docs/tms/analysis/permission-matrix-2026-11-23.json` (bản người đọc: `…-2026-11-23.md`), thay bản 2026-11-22.

## Mục tiêu nghiệp vụ

Bản matrix 2026-11-22 để mỗi endpoint tự liệt kê quyền của **mọi** màn gọi nó (`allowAnyOf` mở rộng), nên quyền thật của người dùng bị giấu trong interceptor: role chỉ có `pmt_cu` vẫn đọc được danh mục đối tác, và mỗi màn mới gọi API cũ lại phải sửa matrix + deploy BE. PO chốt chuyển sang mô hình **WithCheck**: endpoint chỉ khai quyền của module sở hữu, còn nhu cầu đọc chéo module trở thành **dependency trong registry** (`pmt_cu → cus_r`). Nhờ đó quyền hiện rõ trên role, UI tự tick, migration backfill được bằng một danh sách cạnh duy nhất, và ma trận chỉ còn một nguồn.

## Phạm vi

**Trong scope:**
- Matrix v3: 118/118 endpoint, mỗi endpoint đúng **1 quyền module sở hữu** (5 endpoint ngoại lệ E2/E3 được PO giữ nhiều quyền — xem §Ngoại lệ).
- Bảng **dependency** (90 cạnh: 50 same-module + 40 cross-module) làm đầu vào trực tiếp cho `getActionRelations()` và migration; chỉ rõ **26 cạnh còn thiếu** và 2 quyền cũ bị bỏ vì không có caller thật.
- Yêu cầu **closure đệ quy** trong migration (một lượt là không đủ) + thứ tự chạy.
- Yêu cầu **buộc đăng nhập lại** sau deploy backfill.
- Hệ quả lên role trên `tms_staging` (5 role hiện có, 2 role được thêm quyền).
- Cập nhật SRS/ADR sau khi QA PASS.

**Ngoài scope:**
- Không sửa code (việc của dev-tms, PR BE #138 / FE #193).
- Không tạo ticket Jira mới ngoài 7 ticket của nhóm.
- Không thiết kế lại UI phân quyền; không đổi tên key hiện có; không rà đa-tenant.

## Acceptance Criteria

| # | AC | Vai trò/user | Cách kiểm |
|---|---|---|---|
| AC1 | 118/118 endpoint có rule trong matrix v3; đúng 1 quyền module sở hữu, trừ 5 endpoint ngoại lệ E2/E3. Không còn `allowAnyOf` nhiều module ngoài danh sách ngoại lệ. | Dev/QA | `jq` trên matrix: đếm endpoint có `allowAnyOf|length > 1` = 5, và 5 dòng đó đều có `exception`. |
| AC2 | `internal/application/permission/data/permission_matrix.json` trong BE bằng đúng `endpoints` + `allOf` + `allowAnyOf` của `docs/tms/analysis/permission-matrix-2026-11-23.json`. | Dev | So sánh 2 file; lệch = FAIL. |
| AC3 | Registry có đủ **90 cạnh** dependency; 26 cạnh `missing` trong matrix đã thêm; UI tick quyền nguồn tự tick quyền đích (ví dụ tick `pmt_cu` → tự tick `cus_r` + `pytmtd_r`; tick `usr_cu` → `role_r`; tick `audit_r` → `usr_r`). | Admin phân quyền | Mở màn Phân quyền, tick từng quyền nguồn trong bảng dependency, xác nhận checkbox đích tự ON; gọi `RoleService/GetModules` đối chiếu mảng `check`. |
| AC4 | Migration backfill **đệ quy**: role chỉ có `rec_debt_balance` sau migration có `rec_r`, `cus_r` **và** `cusdeb_hx`; chạy lại migration = 0 dòng đổi. | Dev/QA | Seed 1 role chỉ `rec_debt_balance` + 1 role chỉ `diso_d`; chạy migration; kiểm `permissions`; chạy lần 2, đếm `UPDATE 0`. |
| AC5 | `TestFormPermissionClosure` PASS **sau khi** matrix đã siết, không sửa test case. Test này chứng minh bộ cạnh dependency đủ cho 14 màn. | Dev | `go test ./internal/application/permission/ -run 'TestFormPermissionClosure\|TestWriteImpliesViewWithinModule' -v`. |
| AC6 | 403 đúng chỗ sau khi siết: role chỉ `prd_r` gọi `PartnerService/ListPartner` → 403; role chỉ `do_cu` gọi `ListPartner` → 200 (nhờ cạnh `do_cu → cus_r`). | QA | HTTP thật trên stack local, 2 role seed. |
| AC7 | `CustomerDebtService/Get` chỉ còn `cusdeb_hx`: chỉ `rec_r` → 403; chỉ `rec_cu` → 403; chỉ `cusdeb_hx` → 200. Với `rec_debt_balance`: phải đo **qua đường chuẩn hoá role** — gán `rec_debt_balance` rồi lưu role (hoặc chạy migration) ⇒ `permissions` có thêm `cusdeb_hx` ⇒ gọi 200; token/role thô chỉ có `rec_debt_balance` mà chưa chuẩn hoá → 403 (endpoint không còn nhận key này). | QA | 5 request: 3 case key đơn, 1 case role đã chuẩn hoá, 1 case role thô chưa chuẩn hoá; mỗi case kiểm `permissions` của role tại thời điểm gọi. |
| AC8 | `ResourceService/ListAdUnit` = `(authenticated)`: user bất kỳ đã đăng nhập gọi 200; không token → 401. | QA | 2 request (có/không token) trên CommuneSelect của form tài xế. |
| AC9 | Giữ nguyên các chốt cũ: `supdeb_rc`/`supdeb_open`; `ReCalculate` NCC = `supdeb_rc`; số dư đầu kỳ NCC = `supdeb_open`; `SaveUser` có `roleId` ⇒ cần `role_cu` (cả nhánh tạo mới); `DeleteImage` = authenticated + kiểm chủ ảnh; 2 method DI giữ `[do_di, diso_cu, diso_r]`; `GetModules` = `[role_r, role_cu, usr_cu]`. | QA | Bộ case hồi quy của 2026-11-22 + case tạo user mới có `roleId`. |
| AC10 | Catalog chỉ còn **10602 `RouteEdit`** map `vehr_cu`; action **10304 `CustomerAddRoute`** không còn trong catalog; role đang có `vehr_cu` không mất quyền và vẫn vào được màn Tuyến xe. | QA | `GET /api/v1/roles/modules` không còn 10304; đăng nhập role có `vehr_cu`, mở `/vehicle-routes` 200. |
| AC11 | FE có 2 key mới `supdeb_rc`, `supdeb_open` trong `modules/role/enums/action-type.ts`; nút "Tính lại công nợ NCC" bọc `ProtectedElement` với `supdeb_rc`; ẩn với role không có quyền. | QA | Đăng nhập role thiếu `supdeb_rc` → nút không render; có quyền → render và bấm được. |
| AC12 | **Flush toàn bộ session** sau migration, **chỉ trong namespace/session prefix** (không `FLUSHALL`): mọi user đang đăng nhập bị đăng xuất đúng một lần; request mang token cũ trả 401 và FE về trang login; key ngoài namespace session (rate-limit counter, cache khác) **không bị mất**; sau khi đăng nhập lại, quyền hiển thị khớp DB (không còn quyền cũ do `staleTime: Infinity`). | QA + PO | Trước deploy: chụp mẫu key + `DBSIZE` (theo DB đang dùng). Mở app bằng 2 user khác role → deploy → thao tác bất kỳ → 401 → login lại cả hai → kiểm menu/nút theo role mới. Sau flush: đối chiếu lại mẫu key ngoài session prefix còn nguyên, và xác nhận lệnh xoá không phải `FLUSHALL`. |

## Rule nghiệp vụ

**Rule mới (đề nghị thêm vào SRS §4.1):**

| Mã | Quy tắc |
|---|---|
| BR-PQ-011 | **Một endpoint — một module sở hữu.** Mỗi RPC method chỉ khai quyền của module sở hữu nó (1 key, hoặc `allOf` khi thật sự cần nhiều điều kiện). Quyền của màn khác gọi API đó **không** được liệt kê trong endpoint. Ngoại lệ phải được PO chốt và ghi trong `exceptions` của matrix (hiện còn E2, E3; E1 đã bãi bỏ ngày 2026-11-23). |
| BR-PQ-012 | **Cross-module = dependency trong registry.** Form/màn có quyền `X` cần đọc dữ liệu module B ⇒ tồn tại cạnh `X → quyền Xem của B` trong `getActionRelations()`. Cạnh là nguồn duy nhất để UI tự tick, để closure khi lưu role, và để migration backfill. Endpoint không được nới quyền thay cho cạnh. |
| BR-PQ-013 | **Closure phải đệ quy.** Backfill/migrate áp lặp toàn bộ cạnh trên tập quyền của từng role tới khi không đổi (hoặc `WITH RECURSIVE`); cấm bản một lượt. Ví dụ bắt buộc: `rec_debt_balance → rec_r → cus_r`; `diso_d → diso_r → do_r → cus_r`. |
| BR-PQ-014 | **Đổi quyền phải buộc đăng nhập lại — bằng flush toàn bộ session.** Sau migration, hệ thống **xoá toàn bộ session người dùng trong session store (Redis) theo đúng namespace/prefix của session** — không `FLUSHALL`, không xoá key khác (rate-limit counter, cache, hàng đợi); không revoke theo role, không tăng token version. Mọi user đang đăng nhập bị đăng xuất một lần, request kế tiếp trả 401, FE điều hướng về login. Lý do: UI cache quyền từ token lúc sign-in (`staleTime: Infinity`) nên chỉ cấp lại quyền trong DB là không đủ. Ghi chú deploy không thay được cơ chế. Hệ quả chấp nhận: gián đoạn phiên làm việc của toàn bộ user một lần cho mỗi lần đổi rule quyền. |

**Rule phải sửa:**

| Mã | Sửa gì |
|---|---|
| BR-PQ-007 | **Thay thế toàn bộ (PO 2026-11-23):** `CustomerDebtService/Get` chỉ chấp nhận **`cusdeb_hx`** — một quyền, một module sở hữu. `rec_debt_balance`/`rec_r`/`rec_cu` **không** còn là điều kiện của endpoint; form phiếu thu đọc số dư nhờ cạnh dependency `rec_debt_balance → cusdeb_hx`. Hệ quả PO đã chấp nhận: role làm phiếu thu nay thấy được màn Công nợ KH; phần "tách key để không mở màn Công nợ" của chốt ITMS-383 bị thay thế bởi quyết định này. `List`/`History` vẫn `cusdeb_hx`. |
| BR-PQ-008 | Thay nguyên tắc "allowAnyOf mở rộng" bằng BR-PQ-011 + BR-PQ-012 (matrix v3). Giữ nguyên tắc "quyền ghi luôn kèm quyền xem cùng module" và "đổi rule phải kèm migration". |
| BR-PQ-009 | Bổ sung: `ResourceService/ListAdUnit` = `(authenticated)` (PO 2026-11-23). Các chốt còn lại giữ nguyên. |
| BR-PQ-010 | Kết luận: action **10304 `CustomerAddRoute` đã bị xoá khỏi catalog**; chỉ còn 10602 `RouteEdit` giữ key `vehr_cu`; dữ liệu role không phải đổi vì key giữ nguyên. |

## Ngoại lệ được PO giữ nhiều quyền trên 1 endpoint

| ID | Endpoint | allowAnyOf | Vì sao giữ |
|---|---|---|---|
| E2 | `RoleService/GetModules` | `role_r`, `role_cu`, `usr_cu` | Catalog dùng chung màn Phân quyền và form Người dùng. |
| E3 | `DeliveryInstructionService/GetDeliveryInstruction`, `GetLatestDeliveryInstructionByCode`, `ListDeliveryInstruction`, `ListVehicleByDICode` | `do_di`, `diso_cu`, `diso_r` | Phục vụ cả form Chỉ thị lẫn nhật ký điều xe (chốt ITMS-411, giữ nguyên ở v3). |

**E1 đã bãi bỏ (PO chốt bổ sung khi clear spec, 2026-11-23):** `CustomerDebtService/Get` trước đây giữ `[rec_debt_balance, cusdeb_hx]`; nay siết còn đúng `cusdeb_hx`, và form phiếu thu đọc số dư qua cạnh `rec_debt_balance → cusdeb_hx`. Hệ quả (PO đã chấp nhận): role chỉ làm phiếu thu sẽ thấy màn Công nợ KH. Quyết định này thay thế BR-PQ-007 và một phần chốt ITMS-383.

## Nhật ký quyết định của PO (2026-11-23)

| # | Quyết định | Ghi chú |
|---|---|---|
| 1 | Endpoint chỉ khai quyền module sở hữu; cross-module thành dependency trong registry | thay cho allowAnyOf mở rộng |
| 2 | `ResourceService/ListAdUnit` = `(authenticated)` | danh mục xã/phường công khai |
| 3 | Matrix BA cập nhật theo code: `CustomerDebtService/Get` bỏ `rec_r`; action 10304 xoá khỏi catalog | một nguồn sự thật |
| 4 | Buộc đăng nhập lại sau deploy backfill | cơ chế chốt ở #6 |
| 5 | **Siết tuyệt đối 1 quyền cho `CustomerDebtService/Get`** — bãi bỏ E1, còn `cusdeb_hx` + cạnh `rec_debt_balance → cusdeb_hx` | thay thế BR-PQ-007 + một phần ITMS-383 |
| 6 | **Re-login = flush toàn bộ session** — xoá toàn bộ session người dùng trong Redis **theo namespace/prefix session, không `FLUSHALL`**; không dùng token version hay revoke theo role | áp dụng BR-PQ-014 |

## Thay đổi chi tiết so với matrix 2026-11-22

| Hạng mục | Số lượng |
|---|---|
| **Tổng dòng khác bản 2026-11-22** | **35** / 118 |
| — bỏ quyền cross-module khỏi endpoint | 33 |
| — `CustomerDebtService/Get` siết còn 1 quyền (`cusdeb_hx`), bỏ `rec_debt_balance` + `rec_r` | 1 |
| — `ResourceService/ListAdUnit` từ chưa có rule → `(authenticated)` | 1 |
| Endpoint giữ nhiều quyền có lý do (ngoại lệ) | 5 (E2 + 4 method E3) |
| Tổng cạnh dependency | **90** (same-module 50 + cross-module 40) |
| Cạnh **còn thiếu** trong code (phải thêm ở PR #138) | **26** |
| Quyền cũ bị bỏ vì không có caller thật | 2 (`supdeb_hx` trên `GetSupplierPayableAmount`; `rec_r` trên `CustomerDebtService/Get`) |
| `needs_decision` còn lại | **0** |

### 26 cạnh phải thêm

`diso_cu→costs_r`, `do_cu→costs_r`, `diso_cu→cus_r`, `diso_r→cus_r`, `do_di→cus_r`, `pmt_r→cus_r`, `rec_cu→cus_r`, `rec_r→cus_r`, `rec_debt_balance→cus_r`, `subcon_cu→cus_r`, `rec_debt_balance→cusdeb_hx`, `diso_r→do_r`, `subcon_cu→do_r`, `fadj_cu→fissue_r`, `fadj_cu→frcp_r`, `pmt_cu→pytmtd_r`, `rec_cu→pytmtd_r`, `usr_cu→role_r`, `usr_r→role_r`, `do_cu→subcon_r`, `audit_r→usr_r`, `cus_cu→vehr_r`, `do_cu→wh_r`, `fadj_cu→wh_r`, `fissue_cu→wh_r`, `frcp_cu→wh_r`.

Bảng đầy đủ (kèm lý do + endpoint bằng chứng) ở `permission-matrix-2026-11-23.md` mục "Bảng dependency".

### Hệ quả lên role (snapshot `tms_staging`, 2026-11-23)

| Role | Quyền hiện có | Sau closure v3 | Được thêm |
|---|---|---|---|
| Bán hàng | 59 | 60 | `pytmtd_r` |
| QA383 rec only | 2 | 4 | `cus_r`, `pytmtd_r` |
| Manager, Test tạo mới, Thuận Huỳnh | 65 / 49 / 1 | không đổi | — |

Trong snapshot này **không role nào có `rec_debt_balance`**, nên chưa role nào nhận `cusdeb_hx`. Trên môi trường khác, role có `rec_debt_balance` sẽ được backfill thêm `rec_r` + `cus_r` + `cusdeb_hx` — tức thấy được màn Công nợ KH.

**Đánh đổi:** role hẹp phải mang thêm quyền xem của module mà form của nó nhúng (ví dụ role chỉ có `pmt_cu` nay phải có `cus_r`; role chỉ làm phiếu thu nhận thêm `cus_r`). Quyền này hiện rõ trên role và do UI tự tick, thay cho việc endpoint âm thầm chấp nhận quyền của màn khác. Đổi lại: không còn phải sửa + deploy BE mỗi khi có màn mới gọi API chia sẻ.

## Steps / luồng chính

1. Dev copy matrix v3 vào `internal/application/permission/data/permission_matrix.json` (đúng `endpoints`), giữ nguyên parser Go hiện tại.
2. Dev thêm 26 cạnh còn thiếu (25 cross-module + `rec_debt_balance → cusdeb_hx`) vào `getActionRelations()` bằng `WithCheck(...).WithDescription(...)`; rà lại mô tả tiếng Việt cho tooltip.
3. Dev viết migration mới (sau `000024`): thêm key mới + **vòng lặp closure** tới khi ổn định, chỉ UPDATE role thay đổi, có `down.sql` tương ứng.
4. Dev flush **toàn bộ session** sau migration, giới hạn trong namespace/prefix session (không `FLUSHALL`, không đụng counter/cache khác) — không chỉ ghi chú deploy, không revoke theo role. Dev phải nêu rõ prefix + lệnh xoá trong PR.
5. FE: thêm `supdeb_rc`, `supdeb_open` vào `action-type.ts`, bọc nút "Tính lại công nợ NCC" bằng `ProtectedElement`, giữ dashboard theo chốt ở plan.
6. QA: chạy bộ AC1–AC12 trên stack local (127.0.0.1), rồi hồi quy 4 case ITMS-383 cũ với expected mới.
7. QA PASS → BA cập nhật `SRS-PhanQuyen-Permission.md` (v0.6) + ADR.

## Trường hợp biên & ngoại lệ

- **Role chỉ có `rec_r`/`rec_cu`**: không đọc được số dư công nợ (endpoint `Get` chỉ nhận `cusdeb_hx`). Muốn thấy số dư phải có `rec_debt_balance` — và khi đó role nhận thêm `cusdeb_hx`, thấy cả màn Công nợ KH (hệ quả PO đã chấp nhận).
- **Ô công nợ trong form phiếu thu**: FE gọi `customerDebt.balance` ngay khi tạo phiếu (`!isEdit`), không gate theo quyền. Role thiếu key sẽ nhận 403 ở **một request này**, không chặn lưu phiếu (FE fallback `outstanding ?? 0`); QA không được tính 403 đó là FAIL nếu role cố ý không có `rec_debt_balance`.
- **Role có quyền nguồn nhưng thiếu quyền đích ở giữa chuỗi**: ví dụ `diso_d` (không có `diso_r`) — cần 2 vòng lặp mới đóng `do_r`/`cus_r`; migration một lượt sẽ bỏ sót.
- **Key lạ trong `permissions`** (không có trong catalog): migration bỏ qua, không lỗi, không xoá.
- **Role `is_deleted = true`**: không backfill (giữ nguyên dữ liệu lịch sử).
- **Migration chạy lại**: phải idempotent — `UPDATE 0`, không nhân đôi phần tử JSON.
- **Session cũ**: sau flush, request đầu tiên trả 401; FE phải điều hướng về login chứ không hiển thị màn rỗng. Chỉ xoá key trong namespace session — key khác (counter rate-limit, cache) phải còn nguyên.
- **Role thô chưa chuẩn hoá**: token phát trước migration chỉ mang quyền cũ, nhưng trước 401 thì request vẫn đi qua interceptor với tập quyền trong session; vì vậy QA phải kiểm AC7 trên role **đã qua chuẩn hoá** để không kết luận sai.
- **`GetModules`**: user chỉ có `usr_r` (xem người dùng) gọi `GetModules` → 403 (không nằm trong 3 quyền của E2) — giữ đúng chốt.
- **`ListAdUnit`**: dùng `(authenticated)` nhưng vẫn phải lọc theo tenant của token (không trả dữ liệu tenant khác).

## Dữ liệu / mẫu tham chiếu

- Matrix v3: `docs/tms/analysis/permission-matrix-2026-11-23.json` (máy đọc) · `.md` (người đọc).
- Matrix cũ để đối chiếu: `docs/tms/analysis/permission-matrix-2026-11-22.json`.
- Code tham chiếu: `tms_application@fix/group-permission-system` — `internal/application/permission/{registry.go,endpoint_rules.go,form_closure_test.go}`, `migrations/000024_itms408_backfill_permission_closure.up.sql`.
- Snapshot role dùng cho bảng hệ quả: DB `tms_staging` local, bảng `role` (5 role `is_deleted = false`).

## Câu hỏi mở (cần PO/Dev xác nhận, không chặn clear)

1. **4 cạnh suy từ allowAnyOf cũ nhưng chưa có caller trực tiếp trong bảng form→API**: `do_cu→subcon_r`, `cus_cu→vehr_r`, `fadj_cu→wh_r`, `fissue_cu→wh_r`. Nếu Dev xác nhận không có caller thì bỏ khỏi registry (đỡ cấp quyền thừa); nếu bỏ, phải ghi lại trong matrix để lần sau không suy lại.
2. **Dev xác nhận cách flush session**: spec chốt *flush toàn bộ* + *sau migration*; còn điểm đặt (job deploy hay startup) và việc flush có làm mất dữ liệu phiên khác (rate-limit counter, cache phụ) hay không là chi tiết kỹ thuật Dev phải nêu trong handoff.

## Cập nhật docs sau khi DONE

- [ ] SRS: `docs/tms/srs/srs/SRS-PhanQuyen-Permission.md` — v0.6: **BR-PQ-007 viết lại** (`Get` chỉ `cusdeb_hx`; ghi rõ thay thế một phần chốt ITMS-383), BR-PQ-008 (thay bằng 011/012), BR-PQ-009 (`ListAdUnit`), BR-PQ-010 (10304 đã xoá), **BR-PQ-014 = flush toàn bộ session**, thêm BR-PQ-011/012/013; cập nhật §matrix trỏ `permission-matrix-2026-11-23`; ghi quyết định PO 2026-11-23 (#5, #6) vào nhật ký quyết định.
- [ ] ADR: `docs/tms/adr/ADR-001-matrix-mot-nguon-su-that.md` — quyết định bỏ allowAnyOf mở rộng, dùng dependency + closure đệ quy, kèm hệ quả và đánh đổi.
- [ ] Ghi chú migration mới vào SRS mục "Migration & backfill" (số hiệu, số role bị đổi trên staging).
