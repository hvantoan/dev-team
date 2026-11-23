# Permission Audit — TMS — 2026-11-22

**Người lập:** BA TMS · **Yêu cầu:** anh Văn Toàn — phân tích lại module phân quyền trước khi nâng cấp.
**Phạm vi kiểm chứng:** BE `tms_application` @ `origin/main` (đã gồm PR #127, #128, #135, #136, #137); FE `tms-web` @ `origin/dev`; DB staging `tms_staging` (truy vấn trực tiếp bảng `role`).

---

## 1. Trạng thái các ticket đã biết

| Ticket | Trạng thái code (đã verify trực tiếp) |
|---|---|
| ITMS-382 | **Đã fix BE** (#128): `users.Save` chặn tự đổi role (`ErrUserSaveSelfRoleForbidden`), force logout khi đổi role/deactivate. Còn đọng: xem §3.6 — roleId vẫn chỉ chặn self, user có `usr_cu` vẫn đổi được role **của người khác** không qua `role_cu`. |
| ITMS-384 | **Đã fix rule** (#127): `diso_cu → {diso_r, do_r, do_di}`, `diso_d → {diso_r, do_r}`. DB staging đã đúng closure (không role nào thiếu). |
| ITMS-385 | **Đã fix rule** (#127): `fadj_cu/fadj_d → fadj_r`. **Nhưng lỗi nghiệp vụ chưa hết**: form Kiểm kê gọi `fuelTank.list` (`ftk_r`) mà `fadj_cu` không kèm → QA retest FAIL 22/11. |
| ITMS-386 | FE IN DEVELOP: đối chiếu đã xác nhận — middleware `withAuth` không check quyền theo path; 10 trang thiếu `ProtectedViewServer` (danh sách §4) nên màn không có quyền Xem vẫn vào được, chỉ trả bảng rỗng. |
| ITMS-387 | FE IN DEVELOP: primitives sẵn có (`ProtectedElement`, `PermissionGate`, `usePermissionCheck`) nhưng nhiều nút không bọc. |
| ITMS-383 | **Đã merge** (#136): `rec_debt_balance` (20104) + `methodAnyPermissions` cho `CustomerDebtService/Get {cusdeb_hx, rec_debt_balance}` + migration 000023. Trên staging: Manager & Bán hàng đã có key sau backfill. |
| ITMS-402 | FE đã fix một phần (PR #188, #189 trên dev): trpc propagate 401 khi session revoked. Còn lại trạng thái ON STAGING cần QA verify đủ mặt API. |

## 2. Trạng thái roles trên staging (query trực tiếp)

Closure check 50+ rule phụ thuộc (cu/d/ex → r cùng màn, cross-module) trên `role.permissions` — **0 role nào thiếu quyền** trong danh sách hiện có:

| Role | Ghi chú |
|---|---|
| Manager (ROLE-20260404-001) | Đủ full bộ key, gồm `rec_debt_balance`, `do_di`, `ftk_r`, `cusdeb_rc` |
| Bán hàng (ROLE-20260512-001) | Đủ, đã được backfill `rec_debt_balance` |
| Thuận Huỳnh, TEST-PQ-01/02/03 | Chỉ còn `prd_r` trên DB |

**Mâu thuẫn cần làm rõ:** Điều phối báo QA retest 22/11 dùng role TEST-PQ-03 thiếu `do_di` — nhưng trên DB staging TEST-PQ-03 hiện chỉ có `prd_r`. Có thể role đã bị sửa/xóa quyền sau khi test, hoặc test chạy trên user thuộc role khác. Cần QA xác nhận lại role+user thực tế trong case FAIL.

## 3. Nguyên nhân gốc (4 nhóm)

### Nhóm A — Rule dependency sửa tay, vá từng ticket
`getActionRelations()` (registry.go) là nguồn duy nhất của dependency, nhưng chỉ được vá khi có bug report (384, 385). Không có invariant test nào ràng buộc "cu/d phải kèm r" hay "form X gọi API Y → quyền X phải kèm quyền Y". Đã có `pmt_verify_test.go`, `customer_debt_permission_test.go` dạng test cho từng key đơn lẻ — đúng hướng nhưng chưa bao phủ.

### Nhóm B — Không có bước backfill/migrate khi rule đổi
- #127 sửa rule diso/fadj **không kèm migration** — mọi role tạo trước đó giữ nguyên quyền cũ cho tới khi ai đó bấm lưu lại role. Trên staging hiện không role nào mắc, nhưng là do may: các role đang active đều quyền rộng.
- #136 (ITMS-383) làm đúng chuẩn: rule mới + migration 000023. → phải lấy đây làm tiền lệ bắt buộc.

### Nhóm C — Form FE gọi API module khác nhưng dependency chưa khai
Pattern chung: mọi `*Select` component gọi API list của domain sở hữu nó. Form module A nhúng select của module B ⇒ role của A phải kèm quyền list của B, nhưng registry không khai. Các chỗ đã xác nhận bằng code:

| # | Form/Màn | API module khác nó gọi | Quyền cần | Trạng thái |
|---|---|---|---|---|
| C1 | Kiểm kê (Thêm/Sửa), Xuất nhiên liệu, Nhập nhiên liệu — `FuelTankSelect` | `fuelTank.list` | `ftk_r` | **Thiếu** trong registry `fadj_cu/fissue_cu/frcp_cu` → ITMS-385 vẫn FAIL trên môi trường có role hẹp |
| C2 | Nhật ký điều xe — `DeliveryInstructionSelect` + `deliveryOrder.*` | `deliveryInstruction.list`, `deliveryOrder.list/detail` | `do_di`, `do_r` | Đã khai cho `diso_cu` (#127); `diso_d` chỉ kèm `do_r` — nếu màn xóa không cần xem DI thì ổn; cần xác nhận |
| C3 | Nhật ký điều xe — `DriverSelect`, `VehicleSelect` | `driver.list`, `vehicle.list` | `drv_r`, `veh_r` | **Chưa khai** trong `diso_cu` — nghi vấn cao (form điều xe bắt buộc chọn tài xế/xe) |
| C4 | Đơn vận chuyển — `CustomerSelect` (=PartnerSelect), `ProductSelect`, `VehicleRouteSelect` | `partner.list`, `product.list`, `route.list` | `cus_r`, `prd_r`, `vehr_r` | **Chưa khai** trong `do_cu` — nghi vấn cao |
| C5 | Phiếu chi — `PartnerSelect` | `partner.list` | `cus_r` | **Chưa khai** trong `pmt_cu` — nghi vấn cao |
| C6 | Công nợ KH / Công nợ NCC — filter `CustomerSelect`/`PartnerSelect` | `partner.list` | `cus_r` | **Chưa khai** trong `cusdeb_hx`/`supdeb_hx` — role chỉ xem công nợ sẽ không lọc được theo đối tác |
| C7 | Phiếu thu — `CustomerDebtService/Get` hiển thị số dư | `customerDebt.get` | `rec_debt_balance` | Đã khai đúng tiền lệ (#136) |
| C8 | Chỉ thị giao hàng — `SubcontractSelect`, `VehicleSelect` | `subcontract.list`, `vehicle.list` | `subcon_r`, `veh_r` | **Chưa khai** trong `do_di` — nghi vấn |

### Nhóm D — BE thiếu guard / guard sai trên một số endpoint
Đối chiếu 118 route proto vs `methodPermissions` @origin/main — 14 method không guard; trong đó hợp lệ (login, notification, settings, getPermissions, register), còn các điểm đáng ngờ:

| # | Endpoint | Hiện trạng | Rủi ro |
|---|---|---|---|
| D1 | `DeliveryInstructionService/GetLatestDeliveryInstructionByCode`, `ListVehicleByDICode` | Không guard — mọi user authenticated gọi được | Lộ dữ liệu chỉ thị giao hàng/xe ngoài phạm vi `do_di` |
| D2 | `ImageService/DeleteImage` | Không guard | Mọi user đăng nhập xóa được ảnh của người khác |
| D3 | `SupplierDebtService/Recalculate` | Dùng `supdeb_hx` (quyền **đọc**) cho hành động ghi/tính lại | User chỉ-xem công nợ NCC vẫn trigger recalc. Cần `supdeb_rc` riêng theo tiền lệ `cusdeb_rc` |
| D4 | `PartnerService/SavePartnerSupplierOpeningBalance` | Dùng `cus_cu` | Sửa số dư đầu kỳ **NCC** lại nằm dưới quyền Đối tác/Khách — sai module, nên thuộc supplier-debt hoặc quyền riêng |
| D5 | `UserService/SaveUser` — `roleId` | `usr_cu` cho phép gán `roleId` bất kỳ cho user khác mà không cần `role_cu` | Tăng quyền gián tiếp: user có `usr_cu` (không có `role_cu`) vẫn set role Manager cho người khác. Self đã chặn ở #128; **đề xuất mở rộng**: chỉ user có `role_cu` (hoặc admin) mới được truyền `roleId` |
| D6 | Key collision: `Action_CustomerAddRoute` (10304) và `Action_RouteEdit` (10602) **cùng map sang `vehr_cu`** | `permission_keys.go` | Catalog hiển thị 2 checkbox khác tên nhưng cùng 1 key — bật cái nào cũng cấp `vehr_cu`. Action 10304 trở thành alias vô nghĩa hoặc gây hiểu nhầm "Thêm tuyến cho KH" vs "Sửa tuyến" |

### Nhóm E — FE guard thiếu đồng nhất
- `middleware.ts` chỉ check session expiry, **không check path-permission** → page không bọc `ProtectedViewServer` vào được dù thiếu quyền.
- Trang thiếu `ProtectedViewServer` (đối chiếu 82 page): `dispatch-orders`, `receipt-payments` (list/detail/edit/new), `payment-vouchers` (list/detail/new), `payment-methods`, `customer-debt`, `dashboard`. → Đúng hiện tượng ITMS-386 (vào được, bảng rỗng, không 403).
- 401 vs 200 (ITMS-402): trpc route đã vá một phần; cần rà lại tất cả client để session hết hạn luôn đẩy về login.

## 4. Đề xuất nâng cấp

### Ngắn hạn (fix điểm, không đổi kiến trúc)
1. **Khai bổ sung dependency trong registry** cho C1–C6, C8 theo nguyên tắc "quyền của form phải kèm quyền đọc của mọi select nó nhúng". Cụ thể: `fadj_cu→ftk_r`, `fissue_cu→ftk_r`, `frcp_cu→ftk_r`, `diso_cu→drv_r+veh_r`, `do_cu→cus_r+prd_r+vehr_r`, `pmt_cu→cus_r`, `cusdeb_hx→cus_r`, `supdeb_hx→cus_r`, `do_di→subcon_r+veh_r`. **Mỗi nhóm bắt buộc kèm migration backfill** (tiền lệ 000023) — không lặp lại sai sót của #127.
2. **Chặn D1–D5**: guard 2 DI endpoint bằng `do_di`; guard `DeleteImage` theo chủ module của ảnh; thêm `supdeb_rc`; sửa mapping `SavePartnerSupplierOpeningBalance`; chỉ cho set `roleId` khi có `role_cu`.
3. **FE**: bọc `ProtectedViewServer` cho 10 trang thiếu; sweep nút theo quyền (tiếp tục ITMS-387); hoàn thiện propagate 401 (ITMS-402).
4. Xử lý D6: quyết định action 10304 là alias xóa khỏi catalog hay tách key riêng (`cus_addroute`).

### Dài hạn (nâng cấp hệ thống)
1. **Dependency closure một nguồn duy nhất + backfill tự động**: thay vì sửa `getActionRelations` tay, khai báo dependency theo cấu trúc dữ liệu; kèm migration generator — mỗi lần rule đổi, migration sinh ra backfill mọi role (như 000023) vào cùng PR. Test: với mọi action X có Check[], `NormalizePermissions([key(X)])` phải chứa đủ; và không role nào trong DB vi phạm closure sau deploy.
2. **Bảng "form → API → permission"** (source of truth vận hành): mỗi màn FE khai các API nó gọi; tooling suy ra quyền tối thiểu của quyền form. Kết hợp codegen: mỗi `*Select` tự khai báo dependency quyền của nó → lint khi form dùng select mà registry thiếu dep.
3. **Test tự động permission matrix**: với mỗi (role mẫu, quyền màn X), sinh request tới mọi API mà form X gọi → assert không 403. Endpoint loại write (Save/Delete/Cancel/Recalculate) bắt buộc có entry trong `methodPermissions`/`methodAnyPermissions` — test duyệt toàn bộ route proto và fail nếu có method write không guard.
4. **FE chuẩn hóa**: 403 của list API → render trang từ chối truy cập (không nuốt thành bảng rỗng); toàn bộ nút mutating qua `ProtectedElement`/`PermissionGate`; cân nhắc khai báo permission theo route config thay vì bọc tay từng page.

## 5. Danh sách ticket đề xuất (chưa tạo trên Jira)

| Đề xuất | Tiêu đề | Phạm vi | Ghi chú |
|---|---|---|---|
| **NEW-1** | Bổ sung dependency select cross-module + migration backfill role (theo tiền lệ ITMS-383) | BE: registry `fadj_cu/fissue_cu/frcp_cu→ftk_r`; `diso_cu→drv_r,veh_r`; `do_cu→cus_r,prd_r,vehr_r`; `pmt_cu→cus_r`; `cusdeb_hx/supdeb_hx→cus_r`; `do_di→subcon_r,veh_r` + migration backfill + test closure. FE: không đổi. Fix gốc lỗi ITMS-385 còn sót | Ưu tiên cao — chặn thẳng bug đang FAIL |
| **NEW-2** | Siết guard BE các endpoint hở + tách quyền ghi khỏi quyền đọc | BE: guard `GetLatestDeliveryInstructionByCode`+`ListVehicleByDICode` (`do_di`), `DeleteImage`, `supdeb_rc` mới (có migration), remap `SavePartnerSupplierOpeningBalance`, `roleId` chỉ với `role_cu`, xử lý collision `vehr_cu`/10304 | Nhóm security — nên làm cùng NEW-1 hoặc chung 1 PR nhóm permission |
| **NEW-3** | Chuẩn hóa FE permission guard toàn cục | FE: `ProtectedViewServer` cho 10 page thiếu; sweep nút theo quyền (mở rộng ITMS-387); route-config khai báo permission; hoàn thiện 401 (ghép ITMS-402 nếu chưa xong) | Độc lập với BE, chạy song song được |
| NEW-4 (nâng cấp dài hạn) | Permission dependency generator + test ma trận quyền tự động | BE: data-driven dependency, migration generator, test "mọi API form gọi không 403" + "mọi endpoint write có guard"; FE: select tự khai dep + lint | Làm sau khi NEW-1/2 ổn định |

*Ticket đang chạy, không lập mới: ITMS-386, ITMS-387 (FE, IN DEVELOP); ITMS-402 (ON STAGING — cần QA verify phần còn lại).*

## 6. Chưa rà / cần xác nhận thêm

- **Role TEST-PQ-01/02/03** hiện chỉ `prd_r` trên staging — mâu thuẫn mô tả QA retest; cần QA TMS xác nhận role thực tế của case FAIL 22/11.
- C2: `diso_d` chỉ kèm `do_r`, chưa kèm `do_di` — cần xem flow xóa điều xe có đọc chỉ thị không (rà nhanh chưa đủ bằng chứng).
- Các select `resource` (commune/province), `user`, `cost`, `subcontract`, `role`, `fuelReceipt`, `fuelIssue`, `payment-method/bank` dùng ở form nào chưa rà hết — danh sách C là tối thiểu, có thể còn.
- Danh sách endpoint guard chính xác nhất nên chạy test "route write phải có guard" (mục 4.3) sau khi NEW-2 để chốt.
