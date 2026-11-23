# Permission Matrix v3 — TMS — 2026-11-23

**Nguồn:** BA TMS · PO anh Văn Toàn chốt 4 điểm ngày 2026-11-23 (run `2026-11-23-nhom-phan-quyen`).
**Bản máy đọc (nguồn sự thật):** `docs/tms/analysis/permission-matrix-2026-11-23.json` — thay thế bản 2026-11-22.
**Base code:** `tms_application@fix/group-permission-system` (460db00) · `tms-web@fix/group-permission-system` (eb945bb).

**Quy ước:** `allowAnyOf` = đủ 1 quyền là qua · `allOf` = phải đủ tất cả · `(authenticated)` = mọi user đã đăng nhập.
**Phủ:** 118/118 endpoint proto · 35 dòng khác bản 2026-11-22 (33 bỏ quyền cross-module + `CustomerDebtService/Get` siết còn 1 quyền + `ListAdUnit` thêm rule) · 90 cạnh dependency (26 cạnh còn thiếu trong code) · 0 `needs_decision`.

## Nguyên tắc v3

1. **Mỗi endpoint khai đúng quyền của module sở hữu** (1 key, hoặc `allOf` khi thật sự cần nhiều điều kiện).
   Endpoint không còn liệt kê quyền của các màn khác gọi nó.
2. **Nhu cầu cross-module là dependency trong registry**: form có quyền `X` gọi API của module B ⇒ cạnh `X → quyền xem B`.
   Dependency là nguồn duy nhất để UI tự tick và để migration backfill role.
3. **Closure phải đệ quy**: cạnh bắc cầu (`rec_debt_balance → rec_r → cus_r`) chỉ đóng được khi lặp.
4. **Đánh đổi đã chấp nhận:** role hẹp phải mang thêm quyền xem của module được gọi (ví dụ role chỉ có `pmt_cu` nay phải có `cus_r`) — quyền hiện rõ trên role, UI tự tick, không còn quyền ẩn ở endpoint.
5. `(authenticated)` chỉ dùng cho public/per-user/không nhạy cảm: login, register, notification, own permissions, number format, `DeleteImage` (+ kiểm chủ ảnh), `ResourceService/ListAdUnit`.

## Ngoại lệ có chủ đích (giữ nhiều quyền trên 1 endpoint)

| ID | Endpoint | allowAnyOf | Lý do |
|---|---|---|---|
| E2 | `/tms.RoleService/GetModules` | `role_r`, `role_cu`, `usr_cu` | Ngoại lệ có chủ đích (PO chốt): catalog module/action dùng chung cho màn Phân quyền (`role_r`/`role_cu`) và form Người dùng (`usr_cu` gán vai trò). |
| E3 | `/tms.DeliveryInstructionService/GetDeliveryInstruction` | `do_di`, `diso_cu`, `diso_r` | Ngoại lệ có chủ đích (PO chốt 22/11, giữ nguyên ở v3): phục vụ cả form Chỉ thị (`do_di`) và nhật ký điều xe (`diso_cu`/`diso_r`) — đây là 2 method mở guard + 2 method list cùng bộ. |
| E3 | `/tms.DeliveryInstructionService/GetLatestDeliveryInstructionByCode` | `do_di`, `diso_cu`, `diso_r` | Ngoại lệ có chủ đích (PO chốt 22/11, giữ nguyên ở v3): phục vụ cả form Chỉ thị (`do_di`) và nhật ký điều xe (`diso_cu`/`diso_r`) — đây là 2 method mở guard + 2 method list cùng bộ. |
| E3 | `/tms.DeliveryInstructionService/ListDeliveryInstruction` | `do_di`, `diso_cu`, `diso_r` | Ngoại lệ có chủ đích (PO chốt 22/11, giữ nguyên ở v3): phục vụ cả form Chỉ thị (`do_di`) và nhật ký điều xe (`diso_cu`/`diso_r`) — đây là 2 method mở guard + 2 method list cùng bộ. |
| E3 | `/tms.DeliveryInstructionService/ListVehicleByDICode` | `do_di`, `diso_cu`, `diso_r` | Ngoại lệ có chủ đích (PO chốt 22/11, giữ nguyên ở v3): phục vụ cả form Chỉ thị (`do_di`) và nhật ký điều xe (`diso_cu`/`diso_r`) — đây là 2 method mở guard + 2 method list cùng bộ. |

**E1 đã bãi bỏ (chốt bổ sung 2026-11-23):** `CustomerDebtService/Get` siết còn đúng `cusdeb_hx`; form phiếu thu đọc số dư qua cạnh `rec_debt_balance → cusdeb_hx`. Hệ quả PO đã chấp nhận: role làm phiếu thu thấy được màn Công nợ KH.

## Ma trận endpoint → quyền

### (auth)

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.AuthService/Login` | `(authenticated hoặc public)` | — | Login/Register là public theo thiết kế; các method khác của service này không có. |
| `/tms.TenantService/Register` | `(authenticated hoặc public)` | — | Login/Register là public theo thiết kế; các method khác của service này không có. |

### (shared)

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.ImageService/DeleteImage` | `(authenticated)` | — | CHỐT (ITMS-411): tối thiểu authenticated; quyền xoá theo chủ sở hữu ảnh (entity ref) do service kiểm — không biểu diễn bằng tập quyền tĩnh vì ảnh thuộc nhiều module. |
| `/tms.NotificationService/GetNotificationSettings` | `(authenticated)` | — | Thông báo là dữ liệu riêng từng user, không gắn module nghiệp vụ. |
| `/tms.NotificationService/GetUnreadCount` | `(authenticated)` | — | Thông báo là dữ liệu riêng từng user, không gắn module nghiệp vụ. |
| `/tms.NotificationService/ListNotifications` | `(authenticated)` | — | Thông báo là dữ liệu riêng từng user, không gắn module nghiệp vụ. |
| `/tms.NotificationService/MarkAsRead` | `(authenticated)` | — | Thông báo là dữ liệu riêng từng user, không gắn module nghiệp vụ. |
| `/tms.NotificationService/UpdateNotificationSetting` | `(authenticated)` | — | Thông báo là dữ liệu riêng từng user, không gắn module nghiệp vụ. |
| `/tms.ResourceService/ListAdUnit` | `(authenticated)` | — | CHỐT (PO 2026-11-23): danh mục xã/phường là dữ liệu công khai, dùng bởi CommuneSelect trong form tài xế/đối tác/tuyến/kho nên chỉ cần đăng nhập. |
| `/tms.SettingService/GetNumberFormat` | `(authenticated)` | — | NumberFormat là cấu hình hiển thị dùng chung mọi màn. |

### audit

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.AuditService/GroupAudit` | `audit_r` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.AuditService/ListAudit` | `audit_r` | — | Giữ quyền hiện tại. |

### cost

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.CostService/DeleteCost` | `costs_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.CostService/GetCost` | `costs_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `costs_r`. Bỏ 2 quyền khỏi endpoint (`diso_cu`, `do_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (diso_cu → costs_r, do_cu → costs_r). |
| `/tms.CostService/ListCost` | `costs_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `costs_r`. Bỏ 2 quyền khỏi endpoint (`diso_cu`, `do_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (diso_cu → costs_r, do_cu → costs_r). |
| `/tms.CostService/SaveCost` | `costs_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### customer-debt

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.CustomerDebtService/Export` | `cusdeb_ex` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.CustomerDebtService/ExportCustomerDebtDetail` | `cusdeb_ex` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.CustomerDebtService/Get` | `cusdeb_hx` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `cusdeb_hx`. Bỏ 2 quyền khỏi endpoint (`rec_debt_balance`, `rec_r`); nhu cầu của màn gọi chuyển thành dependency trong registry (rec_debt_balance → cusdeb_hx). `rec_r` không có caller thật nên bỏ hẳn, không tạo cạnh. |
| `/tms.CustomerDebtService/History` | `cusdeb_hx` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.CustomerDebtService/List` | `cusdeb_hx` | — | Giữ quyền hiện tại. |
| `/tms.CustomerDebtService/Recalculate` | `cusdeb_rc` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### customer-receipt

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.CustomerReceiptService/Delete` | `rec_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.CustomerReceiptService/Get` | `rec_r` | — | Giữ quyền hiện tại. |
| `/tms.CustomerReceiptService/List` | `rec_r` | — | Giữ quyền hiện tại. |
| `/tms.CustomerReceiptService/Save` | `rec_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### delivery-instruction

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.DeliveryInstructionService/DeleteDeliveryInstruction` | `do_di` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DeliveryInstructionService/ExportDeliveryInstruction` | `do_di_ex` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DeliveryInstructionService/GetDeliveryInstruction` | `do_di`, `diso_cu`, `diso_r` | — | **(E3)** Ngoại lệ có chủ đích (PO chốt 22/11, giữ nguyên ở v3): phục vụ cả form Chỉ thị (`do_di`) và nhật ký điều xe (`diso_cu`/`diso_r`) — đây là 2 method mở guard + 2 method list cùng bộ. |
| `/tms.DeliveryInstructionService/GetLatestDeliveryInstructionByCode` | `do_di`, `diso_cu`, `diso_r` | — | **(E3)** Ngoại lệ có chủ đích (PO chốt 22/11, giữ nguyên ở v3): phục vụ cả form Chỉ thị (`do_di`) và nhật ký điều xe (`diso_cu`/`diso_r`) — đây là 2 method mở guard + 2 method list cùng bộ. |
| `/tms.DeliveryInstructionService/ListDeliveryInstruction` | `do_di`, `diso_cu`, `diso_r` | — | **(E3)** Ngoại lệ có chủ đích (PO chốt 22/11, giữ nguyên ở v3): phục vụ cả form Chỉ thị (`do_di`) và nhật ký điều xe (`diso_cu`/`diso_r`) — đây là 2 method mở guard + 2 method list cùng bộ. |
| `/tms.DeliveryInstructionService/ListVehicleByDICode` | `do_di`, `diso_cu`, `diso_r` | — | **(E3)** Ngoại lệ có chủ đích (PO chốt 22/11, giữ nguyên ở v3): phục vụ cả form Chỉ thị (`do_di`) và nhật ký điều xe (`diso_cu`/`diso_r`) — đây là 2 method mở guard + 2 method list cùng bộ. |
| `/tms.DeliveryInstructionService/SaveDeliveryInstruction` | `do_di` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DeliveryInstructionService/ValidateDeliveryInstruction` | `do_di` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### delivery-order

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.DeliveryOrderService/DeleteDeliveryOrder` | `do_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DeliveryOrderService/ExportDeliveryOrder` | `do_ex` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DeliveryOrderService/GetDeliveryOrder` | `do_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `do_r`. Bỏ 4 quyền khỏi endpoint (`diso_cu`, `diso_r`, `do_di`, `subcon_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (diso_cu → do_r, diso_r → do_r, do_di → do_r, subcon_cu → do_r). |
| `/tms.DeliveryOrderService/ListDeliveryOrder` | `do_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `do_r`. Bỏ 4 quyền khỏi endpoint (`diso_cu`, `diso_r`, `do_di`, `subcon_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (diso_cu → do_r, diso_r → do_r, do_di → do_r, subcon_cu → do_r). |
| `/tms.DeliveryOrderService/SaveDeliveryOrder` | `do_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### dispatch-order

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.DispatchOrderService/DeleteDispatchOrder` | `diso_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DispatchOrderService/ExportDispatchOrder` | `diso_ex` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DispatchOrderService/GetDispatchOrder` | `diso_r` | — | Giữ quyền hiện tại. |
| `/tms.DispatchOrderService/ListDispatchOrder` | `diso_r` | — | Giữ quyền hiện tại. |
| `/tms.DispatchOrderService/SaveDispatchOrder` | `diso_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### driver

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.DriverService/DeleteDriver` | `drv_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DriverService/GetDriver` | `drv_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `drv_r`. Bỏ 1 quyền khỏi endpoint (`diso_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (diso_cu → drv_r). |
| `/tms.DriverService/ListDriver` | `drv_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `drv_r`. Bỏ 1 quyền khỏi endpoint (`diso_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (diso_cu → drv_r). |
| `/tms.DriverService/SaveDriver` | `drv_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### fuel-adjustment

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.FuelAdjustmentService/Delete` | `fadj_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.FuelAdjustmentService/Get` | `fadj_r` | — | Giữ quyền hiện tại. |
| `/tms.FuelAdjustmentService/GetSystemBalance` | `fadj_r` | — | Giữ quyền hiện tại. |
| `/tms.FuelAdjustmentService/List` | `fadj_r` | — | Giữ quyền hiện tại. |
| `/tms.FuelAdjustmentService/Save` | `fadj_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### fuel-issue

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.FuelIssueService/Delete` | `fissue_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.FuelIssueService/Get` | `fissue_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `fissue_r`. Bỏ 1 quyền khỏi endpoint (`fadj_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (fadj_cu → fissue_r). |
| `/tms.FuelIssueService/List` | `fissue_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `fissue_r`. Bỏ 1 quyền khỏi endpoint (`fadj_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (fadj_cu → fissue_r). |
| `/tms.FuelIssueService/Save` | `fissue_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### fuel-receipt

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.FuelReceiptService/Delete` | `frcp_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.FuelReceiptService/Get` | `frcp_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `frcp_r`. Bỏ 1 quyền khỏi endpoint (`fadj_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (fadj_cu → frcp_r). |
| `/tms.FuelReceiptService/List` | `frcp_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `frcp_r`. Bỏ 1 quyền khỏi endpoint (`fadj_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (fadj_cu → frcp_r). |
| `/tms.FuelReceiptService/Save` | `frcp_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### fuel-tank

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.FuelTankService/Activity` | `ftk_r` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.FuelTankService/Delete` | `ftk_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.FuelTankService/Get` | `ftk_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `ftk_r`. Bỏ 3 quyền khỏi endpoint (`fadj_cu`, `fissue_cu`, `frcp_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (fadj_cu → ftk_r, fissue_cu → ftk_r, frcp_cu → ftk_r). |
| `/tms.FuelTankService/List` | `ftk_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `ftk_r`. Bỏ 3 quyền khỏi endpoint (`fadj_cu`, `fissue_cu`, `frcp_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (fadj_cu → ftk_r, fissue_cu → ftk_r, frcp_cu → ftk_r). |
| `/tms.FuelTankService/Save` | `ftk_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### partner

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.PartnerService/DeletePartner` | `cus_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.PartnerService/GetPartner` | `cus_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `cus_r`. Bỏ 11 quyền khỏi endpoint (`pmt_r`, `pmt_cu`, `do_cu`, `do_di`, `diso_r`, `diso_cu`, `cusdeb_hx`, `supdeb_hx`, `rec_cu`, `rec_debt_balance`, `subcon_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (pmt_r → cus_r, pmt_cu → cus_r, do_cu → cus_r, do_di → cus_r, diso_r → cus_r, diso_cu → cus_r, cusdeb_hx → cus_r, supdeb_hx → cus_r, rec_cu → cus_r, rec_debt_balance → cus_r, subcon_cu → cus_r). |
| `/tms.PartnerService/GetPartnerOpeningBalance` | `cus_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `cus_r`. Bỏ 8 quyền khỏi endpoint (`pmt_cu`, `do_cu`, `do_di`, `cusdeb_hx`, `supdeb_hx`, `rec_cu`, `rec_debt_balance`, `subcon_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (pmt_cu → cus_r, do_cu → cus_r, do_di → cus_r, cusdeb_hx → cus_r, supdeb_hx → cus_r, rec_cu → cus_r, rec_debt_balance → cus_r, subcon_cu → cus_r). |
| `/tms.PartnerService/ListPartner` | `cus_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `cus_r`. Bỏ 11 quyền khỏi endpoint (`pmt_r`, `pmt_cu`, `do_cu`, `do_di`, `diso_r`, `diso_cu`, `cusdeb_hx`, `supdeb_hx`, `rec_cu`, `rec_debt_balance`, `subcon_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (pmt_r → cus_r, pmt_cu → cus_r, do_cu → cus_r, do_di → cus_r, diso_r → cus_r, diso_cu → cus_r, cusdeb_hx → cus_r, supdeb_hx → cus_r, rec_cu → cus_r, rec_debt_balance → cus_r, subcon_cu → cus_r). |
| `/tms.PartnerService/SavePartner` | `cus_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.PartnerService/SavePartnerCustomerOpeningBalance` | `cus_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.PartnerService/SavePartnerSupplierOpeningBalance` | `supdeb_open` | — | CHỐT (ITMS-411): tách key mới supdeb_open (nhóm Công nợ NCC) thay cus_cu; migration backfill cho role đang có cus_cu để không mất quyền nhập số dư đầu kỳ NCC. |

### payment-method

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.PaymentMethodService/DeletePaymentMethod` | `pytmtd_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.PaymentMethodService/GetPaymentMethod` | `pytmtd_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `pytmtd_r`. Bỏ 2 quyền khỏi endpoint (`pmt_cu`, `rec_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (pmt_cu → pytmtd_r, rec_cu → pytmtd_r). |
| `/tms.PaymentMethodService/ListBank` | `pytmtd_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `pytmtd_r`. Bỏ 2 quyền khỏi endpoint (`pmt_cu`, `rec_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (pmt_cu → pytmtd_r, rec_cu → pytmtd_r). |
| `/tms.PaymentMethodService/ListPaymentMethod` | `pytmtd_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `pytmtd_r`. Bỏ 2 quyền khỏi endpoint (`pmt_cu`, `rec_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (pmt_cu → pytmtd_r, rec_cu → pytmtd_r). |
| `/tms.PaymentMethodService/SavePaymentMethod` | `pytmtd_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### payment-voucher

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.PaymentVoucherService/CancelPaymentVoucher` | `pmt_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.PaymentVoucherService/GetPaymentVoucher` | `pmt_r` | — | Giữ quyền hiện tại. |
| `/tms.PaymentVoucherService/GetSupplierPayableAmount` | `pmt_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `pmt_r`. Bỏ 2 quyền khỏi endpoint (`pmt_cu`, `supdeb_hx`); nhu cầu của màn gọi chuyển thành dependency trong registry (pmt_cu → pmt_r). `supdeb_hx` không có caller thật nên bỏ hẳn, không tạo cạnh. |
| `/tms.PaymentVoucherService/ListPaymentVoucher` | `pmt_r` | — | Giữ quyền hiện tại. |
| `/tms.PaymentVoucherService/SavePaymentVoucher` | `pmt_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### product

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.ProductService/DeleteProduct` | `prd_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.ProductService/GetProduct` | `prd_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `prd_r`. Bỏ 1 quyền khỏi endpoint (`do_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (do_cu → prd_r). |
| `/tms.ProductService/ListProduct` | `prd_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `prd_r`. Bỏ 1 quyền khỏi endpoint (`do_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (do_cu → prd_r). |
| `/tms.ProductService/SaveProduct` | `prd_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### role

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.RoleService/DeleteRole` | `role_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.RoleService/GetModules` | `role_r`, `role_cu`, `usr_cu` | — | **(E2)** Ngoại lệ có chủ đích (PO chốt): catalog module/action dùng chung cho màn Phân quyền (`role_r`/`role_cu`) và form Người dùng (`usr_cu` gán vai trò). |
| `/tms.RoleService/GetRole` | `role_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `role_r`. Bỏ 2 quyền khỏi endpoint (`usr_cu`, `usr_r`); nhu cầu của màn gọi chuyển thành dependency trong registry (usr_cu → role_r, usr_r → role_r). |
| `/tms.RoleService/ListRole` | `role_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `role_r`. Bỏ 2 quyền khỏi endpoint (`usr_cu`, `usr_r`); nhu cầu của màn gọi chuyển thành dependency trong registry (usr_cu → role_r, usr_r → role_r). |
| `/tms.RoleService/SaveRole` | `role_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### route

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.RouteService/DeleteRoute` | `vehr_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.RouteService/GetRoute` | `vehr_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `vehr_r`. Bỏ 2 quyền khỏi endpoint (`do_cu`, `cus_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (do_cu → vehr_r, cus_cu → vehr_r). |
| `/tms.RouteService/ListRoute` | `vehr_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `vehr_r`. Bỏ 2 quyền khỏi endpoint (`do_cu`, `cus_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (do_cu → vehr_r, cus_cu → vehr_r). |
| `/tms.RouteService/SaveRoute` | `vehr_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### subcontract

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.SubcontractService/DeleteSubcontract` | `subcon_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.SubcontractService/GetSubcontract` | `subcon_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `subcon_r`. Bỏ 2 quyền khỏi endpoint (`do_di`, `do_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (do_di → subcon_r, do_cu → subcon_r). |
| `/tms.SubcontractService/GetSubcontractRelatedOrders` | `subcon_r` | — | Giữ quyền hiện tại. |
| `/tms.SubcontractService/ListSubcontract` | `subcon_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `subcon_r`. Bỏ 2 quyền khỏi endpoint (`do_di`, `do_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (do_di → subcon_r, do_cu → subcon_r). |
| `/tms.SubcontractService/SaveSubcontract` | `subcon_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### supplier-debt

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.SupplierDebtService/Get` | `supdeb_hx` | — | Giữ quyền hiện tại. |
| `/tms.SupplierDebtService/History` | `supdeb_hx` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.SupplierDebtService/List` | `supdeb_hx` | — | Giữ quyền hiện tại. |
| `/tms.SupplierDebtService/Recalculate` | `supdeb_rc` | — | CHỐT (ITMS-411): tách key mới supdeb_rc (nhóm Công nợ NCC) cho hành động ghi; migration backfill cho mọi role đang có supdeb_hx — tiền lệ cusdeb_rc. |

### user

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.UserService/DeleteUser` | `usr_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.UserService/GetPermissions` | `(authenticated)` | — | Trả quyền của chính user — mọi user cần gọi để FE render. |
| `/tms.UserService/GetUser` | `usr_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `usr_r`. Bỏ 1 quyền khỏi endpoint (`audit_r`); nhu cầu của màn gọi chuyển thành dependency trong registry (audit_r → usr_r). |
| `/tms.UserService/ListUser` | `usr_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `usr_r`. Bỏ 1 quyền khỏi endpoint (`audit_r`); nhu cầu của màn gọi chuyển thành dependency trong registry (audit_r → usr_r). |
| `/tms.UserService/SaveUser` | `usr_cu` | — | CHỐT (ITMS-411): giữ usr_cu; BỔ SUNG rule conditional trong service — request truyền roleId ⇒ user phải có thêm role_cu (chặn tăng quyền gián tiếp cho user khác). Self đã chặn #128. Conditional không biểu diễn bằng tập quyền tĩnh — cần check trong service. |

### vehicle

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.VehicleService/DeleteVehicle` | `veh_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.VehicleService/GetVehicle` | `veh_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `veh_r`. Bỏ 2 quyền khỏi endpoint (`do_di`, `diso_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (do_di → veh_r, diso_cu → veh_r). |
| `/tms.VehicleService/ListVehicle` | `veh_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `veh_r`. Bỏ 2 quyền khỏi endpoint (`do_di`, `diso_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (do_di → veh_r, diso_cu → veh_r). |
| `/tms.VehicleService/SaveVehicle` | `veh_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### warehouse

| Endpoint | Quyền (allowAnyOf) | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.WarehouseService/DeleteWarehouse` | `wh_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.WarehouseService/GetWarehouse` | `wh_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `wh_r`. Bỏ 4 quyền khỏi endpoint (`do_cu`, `frcp_cu`, `fissue_cu`, `fadj_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (do_cu → wh_r, frcp_cu → wh_r, fissue_cu → wh_r, fadj_cu → wh_r). |
| `/tms.WarehouseService/ListWarehouse` | `wh_r` | — | Matrix v3 (PO 2026-11-23): endpoint chỉ khai quyền module sở hữu — `wh_r`. Bỏ 4 quyền khỏi endpoint (`do_cu`, `frcp_cu`, `fissue_cu`, `fadj_cu`); nhu cầu của màn gọi chuyển thành dependency trong registry (do_cu → wh_r, frcp_cu → wh_r, fissue_cu → wh_r, fadj_cu → wh_r). |
| `/tms.WarehouseService/SaveWarehouse` | `wh_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

## Bảng dependency (đầu vào của `getActionRelations()` + migration)

`status`: `existing` = đã có ở PR #138 (registry/migration 000024) · `missing` = phải thêm.

### Cạnh còn thiếu (phải thêm)

| Từ quyền | Kéo theo | Loại | Vì sao | Bằng chứng (endpoint) |
|---|---|---|---|---|
| `diso_cu` | `costs_r` | cross-module | Form/màn có quyền `diso_cu` gọi `/tms.CostService/GetCost` nên phải kèm quyền xem module sở hữu `costs_r`. | `/tms.CostService/GetCost`, `/tms.CostService/ListCost` |
| `do_cu` | `costs_r` | cross-module | Form/màn có quyền `do_cu` gọi `/tms.CostService/GetCost` nên phải kèm quyền xem module sở hữu `costs_r`. | `/tms.CostService/GetCost`, `/tms.CostService/ListCost` |
| `diso_cu` | `cus_r` | cross-module | Form/màn có quyền `diso_cu` gọi `/tms.PartnerService/GetPartner` nên phải kèm quyền xem module sở hữu `cus_r`. | `/tms.PartnerService/GetPartner`, `/tms.PartnerService/ListPartner` |
| `diso_r` | `cus_r` | cross-module | Form/màn có quyền `diso_r` gọi `/tms.PartnerService/GetPartner` nên phải kèm quyền xem module sở hữu `cus_r`. | `/tms.PartnerService/GetPartner`, `/tms.PartnerService/ListPartner` |
| `do_di` | `cus_r` | cross-module | Form/màn có quyền `do_di` gọi `/tms.PartnerService/GetPartner` nên phải kèm quyền xem module sở hữu `cus_r`. | `/tms.PartnerService/GetPartner`, `/tms.PartnerService/GetPartnerOpeningBalance`, `/tms.PartnerService/ListPartner` |
| `pmt_r` | `cus_r` | cross-module | Form/màn có quyền `pmt_r` gọi `/tms.PartnerService/GetPartner` nên phải kèm quyền xem module sở hữu `cus_r`. | `/tms.PartnerService/GetPartner`, `/tms.PartnerService/ListPartner` |
| `rec_cu` | `cus_r` | cross-module | Form/màn có quyền `rec_cu` gọi `/tms.PartnerService/GetPartner` nên phải kèm quyền xem module sở hữu `cus_r`. | `/tms.PartnerService/GetPartner`, `/tms.PartnerService/GetPartnerOpeningBalance`, `/tms.PartnerService/ListPartner` |
| `rec_debt_balance` | `cus_r` | cross-module | Form/màn có quyền `rec_debt_balance` gọi `/tms.PartnerService/GetPartner` nên phải kèm quyền xem module sở hữu `cus_r`. | `/tms.PartnerService/GetPartner`, `/tms.PartnerService/GetPartnerOpeningBalance`, `/tms.PartnerService/ListPartner` |
| `rec_r` | `cus_r` | cross-module | Màn Phiếu thu (view `rec_r`) lọc danh sách theo khách hàng qua partner.list; xem chi tiết phiếu cũng hiển thị tên đối tác. | `/tms.PartnerService/ListPartner` |
| `subcon_cu` | `cus_r` | cross-module | Form/màn có quyền `subcon_cu` gọi `/tms.PartnerService/GetPartner` nên phải kèm quyền xem module sở hữu `cus_r`. | `/tms.PartnerService/GetPartner`, `/tms.PartnerService/GetPartnerOpeningBalance`, `/tms.PartnerService/ListPartner` |
| `rec_debt_balance` | `cusdeb_hx` | cross-module | Form/màn có quyền `rec_debt_balance` gọi `/tms.CustomerDebtService/Get` nên phải kèm quyền xem module sở hữu `cusdeb_hx`. | `/tms.CustomerDebtService/Get` |
| `diso_r` | `do_r` | cross-module | Form/màn có quyền `diso_r` gọi `/tms.DeliveryOrderService/GetDeliveryOrder` nên phải kèm quyền xem module sở hữu `do_r`. | `/tms.DeliveryOrderService/GetDeliveryOrder`, `/tms.DeliveryOrderService/ListDeliveryOrder` |
| `subcon_cu` | `do_r` | cross-module | Form/màn có quyền `subcon_cu` gọi `/tms.DeliveryOrderService/GetDeliveryOrder` nên phải kèm quyền xem module sở hữu `do_r`. | `/tms.DeliveryOrderService/GetDeliveryOrder`, `/tms.DeliveryOrderService/ListDeliveryOrder` |
| `fadj_cu` | `fissue_r` | cross-module | Form/màn có quyền `fadj_cu` gọi `/tms.FuelIssueService/Get` nên phải kèm quyền xem module sở hữu `fissue_r`. | `/tms.FuelIssueService/Get`, `/tms.FuelIssueService/List` |
| `fadj_cu` | `frcp_r` | cross-module | Form/màn có quyền `fadj_cu` gọi `/tms.FuelReceiptService/Get` nên phải kèm quyền xem module sở hữu `frcp_r`. | `/tms.FuelReceiptService/Get`, `/tms.FuelReceiptService/List` |
| `pmt_cu` | `pytmtd_r` | cross-module | Form/màn có quyền `pmt_cu` gọi `/tms.PaymentMethodService/GetPaymentMethod` nên phải kèm quyền xem module sở hữu `pytmtd_r`. | `/tms.PaymentMethodService/GetPaymentMethod`, `/tms.PaymentMethodService/ListBank`, `/tms.PaymentMethodService/ListPaymentMethod` |
| `rec_cu` | `pytmtd_r` | cross-module | Form/màn có quyền `rec_cu` gọi `/tms.PaymentMethodService/GetPaymentMethod` nên phải kèm quyền xem module sở hữu `pytmtd_r`. | `/tms.PaymentMethodService/GetPaymentMethod`, `/tms.PaymentMethodService/ListBank`, `/tms.PaymentMethodService/ListPaymentMethod` |
| `usr_cu` | `role_r` | cross-module | Form/màn có quyền `usr_cu` gọi `/tms.RoleService/GetRole` nên phải kèm quyền xem module sở hữu `role_r`. | `/tms.RoleService/GetRole`, `/tms.RoleService/ListRole` |
| `usr_r` | `role_r` | cross-module | Form/màn có quyền `usr_r` gọi `/tms.RoleService/GetRole` nên phải kèm quyền xem module sở hữu `role_r`. | `/tms.RoleService/GetRole`, `/tms.RoleService/ListRole` |
| `do_cu` | `subcon_r` | cross-module | Form/màn có quyền `do_cu` gọi `/tms.SubcontractService/GetSubcontract` nên phải kèm quyền xem module sở hữu `subcon_r`. | `/tms.SubcontractService/GetSubcontract`, `/tms.SubcontractService/ListSubcontract` |
| `audit_r` | `usr_r` | cross-module | Form/màn có quyền `audit_r` gọi `/tms.UserService/GetUser` nên phải kèm quyền xem module sở hữu `usr_r`. | `/tms.UserService/GetUser`, `/tms.UserService/ListUser` |
| `cus_cu` | `vehr_r` | cross-module | Form/màn có quyền `cus_cu` gọi `/tms.RouteService/GetRoute` nên phải kèm quyền xem module sở hữu `vehr_r`. | `/tms.RouteService/GetRoute`, `/tms.RouteService/ListRoute` |
| `do_cu` | `wh_r` | cross-module | Form/màn có quyền `do_cu` gọi `/tms.WarehouseService/GetWarehouse` nên phải kèm quyền xem module sở hữu `wh_r`. | `/tms.WarehouseService/GetWarehouse`, `/tms.WarehouseService/ListWarehouse` |
| `fadj_cu` | `wh_r` | cross-module | Form/màn có quyền `fadj_cu` gọi `/tms.WarehouseService/GetWarehouse` nên phải kèm quyền xem module sở hữu `wh_r`. | `/tms.WarehouseService/GetWarehouse`, `/tms.WarehouseService/ListWarehouse` |
| `fissue_cu` | `wh_r` | cross-module | Form/màn có quyền `fissue_cu` gọi `/tms.WarehouseService/GetWarehouse` nên phải kèm quyền xem module sở hữu `wh_r`. | `/tms.WarehouseService/GetWarehouse`, `/tms.WarehouseService/ListWarehouse` |
| `frcp_cu` | `wh_r` | cross-module | Form/màn có quyền `frcp_cu` gọi `/tms.WarehouseService/GetWarehouse` nên phải kèm quyền xem module sở hữu `wh_r`. | `/tms.WarehouseService/GetWarehouse`, `/tms.WarehouseService/ListWarehouse` |

### Cạnh đã có (giữ nguyên)

| Từ quyền | Kéo theo | Loại |
|---|---|---|
| `cusdeb_hx` | `cus_r` | cross-module |
| `diso_cu` | `do_r` | cross-module |
| `diso_cu` | `drv_r` | cross-module |
| `diso_cu` | `veh_r` | cross-module |
| `do_cu` | `cus_r` | cross-module |
| `do_cu` | `prd_r` | cross-module |
| `do_cu` | `vehr_r` | cross-module |
| `do_di` | `subcon_r` | cross-module |
| `do_di` | `veh_r` | cross-module |
| `fadj_cu` | `ftk_r` | cross-module |
| `fissue_cu` | `ftk_r` | cross-module |
| `frcp_cu` | `ftk_r` | cross-module |
| `pmt_cu` | `cus_r` | cross-module |
| `supdeb_hx` | `cus_r` | cross-module |
| `costs_cu` | `costs_r` | same-module |
| `costs_d` | `costs_r` | same-module |
| `cus_cu` | `cus_r` | same-module |
| `cus_d` | `cus_r` | same-module |
| `cusdeb_ex` | `cusdeb_hx` | same-module |
| `cusdeb_rc` | `cusdeb_hx` | same-module |
| `diso_cu` | `diso_r` | same-module |
| `diso_d` | `diso_r` | same-module |
| `diso_ex` | `diso_r` | same-module |
| `do_cu` | `do_r` | same-module |
| `do_d` | `do_r` | same-module |
| `do_di` | `do_r` | same-module |
| `do_di_ex` | `do_r` | same-module |
| `do_ex` | `do_r` | same-module |
| `drv_cu` | `drv_r` | same-module |
| `drv_d` | `drv_r` | same-module |
| `fadj_cu` | `fadj_r` | same-module |
| `fadj_d` | `fadj_r` | same-module |
| `fissue_cu` | `fissue_r` | same-module |
| `fissue_d` | `fissue_r` | same-module |
| `frcp_cu` | `frcp_r` | same-module |
| `frcp_d` | `frcp_r` | same-module |
| `ftk_cu` | `ftk_r` | same-module |
| `ftk_d` | `ftk_r` | same-module |
| `pmt_cu` | `pmt_r` | same-module |
| `pmt_d` | `pmt_r` | same-module |
| `prd_cu` | `prd_r` | same-module |
| `prd_d` | `prd_r` | same-module |
| `pytmtd_cu` | `pytmtd_r` | same-module |
| `pytmtd_d` | `pytmtd_r` | same-module |
| `rec_cu` | `rec_r` | same-module |
| `rec_d` | `rec_r` | same-module |
| `rec_debt_balance` | `rec_r` | same-module |
| `role_cu` | `role_r` | same-module |
| `role_d` | `role_r` | same-module |
| `subcon_cu` | `subcon_r` | same-module |
| `subcon_d` | `subcon_r` | same-module |
| `subcon_di` | `subcon_r` | same-module |
| `supdeb_open` | `supdeb_hx` | same-module |
| `supdeb_rc` | `supdeb_hx` | same-module |
| `usr_cu` | `usr_r` | same-module |
| `usr_d` | `usr_r` | same-module |
| `usr_pin` | `usr_r` | same-module |
| `usr_pw` | `usr_r` | same-module |
| `veh_cu` | `veh_r` | same-module |
| `veh_d` | `veh_r` | same-module |
| `vehr_cu` | `vehr_r` | same-module |
| `vehr_d` | `vehr_r` | same-module |
| `wh_cu` | `wh_r` | same-module |
| `wh_d` | `wh_r` | same-module |

## Closure đệ quy & thứ tự migration

1. Thêm key mới (`supdeb_rc`, `supdeb_open`) + same-module của chúng.
2. Lặp toàn bộ dependency trên từng role **tới khi tập quyền không đổi** (hoặc `WITH RECURSIVE`); một lượt là không đủ.
3. Chỉ UPDATE role có thay đổi (idempotent, chạy lại an toàn).
4. **Flush toàn bộ session** sau migration, giới hạn trong namespace/prefix session (không `FLUSHALL`, không đụng counter/cache khác) ⇒ mọi user đăng nhập lại một lần (BR-PQ-014).

Ví dụ bắc cầu: `rec_debt_balance → rec_r` (same-module) rồi `rec_r → cus_r` (cross-module) ⇒ role chỉ có `rec_debt_balance` phải nhận cả `rec_r` và `cus_r`.

### Quyền cũ không có caller thật (bỏ hẳn, không thành dependency)

| Quyền bị bỏ | Endpoint | Ghi chú |
|---|---|---|
| `rec_r` (đáng lẽ kéo `cusdeb_hx`) | `/tms.CustomerDebtService/Get` | Màn xem phiếu thu (`rec_r`) không gọi API số dư: ô công nợ chỉ hiện ở màn thêm mới (`!isEdit`, cần `rec_cu`). Cấp `cusdeb_hx` cho `rec_r` là mở màn Công nợ KH không có nhu cầu — bỏ. |
| `supdeb_hx` (đáng lẽ kéo `pmt_r`) | `/tms.PaymentVoucherService/GetSupplierPayableAmount` | Quyền này có trong allowAnyOf cũ nhưng không màn nào dùng thật (không có caller trong code FE) — bỏ hẳn, KHÔNG tạo dependency (tránh cấp quyền xem module không liên quan). |

## Ảnh hưởng role trên `tms_staging` (dữ liệu local, 2026-11-23)

| Role | Quyền hiện có | Sau closure v3 | Quyền được thêm |
|---|---|---|---|
| Bán hàng (`ROLE-20260512-001`) | 59 | 60 | `pytmtd_r` |
| QA383 rec only (`qa383-rec`) | 2 | 4 | `cus_r`, `pytmtd_r` |

## Kiểm chứng bắt buộc khi Dev áp matrix v3

- `TestFormPermissionClosure` (`internal/application/permission/form_closure_test.go`) phải PASS **khi matrix đã siết về 1 quyền/endpoint** — đây chính là test chứng minh các cạnh dependency mới đủ.
- Không sửa test case để test pass; thiếu quyền nghĩa là thiếu cạnh.

## Chưa phủ / giới hạn

- Bảng form→API suy từ code FE `tms-web` (grep tĩnh); màn mới chưa merge có thể chưa có cạnh.
- Không rà đa-tenant: mọi quyền trong phạm vi tenant của user.
- `vehr_cu` (10304 `CustomerAddRoute` vs 10602 `RouteEdit`): PO chốt action 10304 đã chết trong code; catalog chỉ còn 10602, key `vehr_cu` giữ nguyên.
