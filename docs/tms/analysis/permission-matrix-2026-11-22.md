# Permission Matrix — TMS — 2026-11-22

**Nguồn:** BA TMS · yêu cầu anh Văn Toàn (ITMS-411, group-permission-system). Bản máy đọc: `permission-matrix-2026-11-22.json`.

**Quy ước:** `allowAnyOf` = đủ 1 quyền là qua · `allOf` = phải đủ tất cả · `(authenticated)` = mọi user đã đăng nhập.

**Phủ:** 118/118 endpoint proto · 9 quyết định đã chốt trong ITMS-411 (22/11) — còn 2 needs_decision (`ResourceService/ListAdUnit` + collision `vehr_cu` chờ Dev xác định).


## Nguyên tắc thiết kế

1. Mỗi endpoint khai TẬP quyền (`allowAnyOf`/`allOf`), không hard-code 1 quyền.
2. Quyền ghi (`*_cu`, `*_d`, `*_ex`, `*_rc`) luôn kèm `*_r` cùng module trong registry `WithCheck`.
3. **API dùng chung cho select/lookup** (partner, vehicle, driver, product, route, warehouse, fuel-tank, fuel-issue, subcontract, delivery-order, delivery-instruction, cost, role, user, payment-method): áp dụng **allowAnyOf mở rộng** = quyền xem module sở hữu + quyền edit/view của mọi màn gọi nó. Lý do chọn cách này thay vì WithCheck: role không bị phình quyền xem màn người dùng không cần (vd thủ kho tạo phiếu nhập nhiên liệu được đọc bồn mà không cần quyền xem màn Bồn nhiên liệu… hoặc ngược lại tùy chốt). **Lưu ý đánh đổi:** allowAnyOf mở rộng phải duy trì mỗi khi có màn mới gọi API — nguồn sự thật là bảng form→API ở mục 4.
4. Dữ liệu nhạy cảm nằm giữa 2 màn (số dư công nợ trong form phiếu thu) → **permission riêng** theo tiền lệ ITMS-383, KHÔNG mở rộng allowAnyOf tới quyền tổng quát khác.
5. Endpoint public/auth (login, register) và per-user (notification, own permissions, number format) → `(authenticated)`.

## Ma trận endpoint → quyền


### product

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.ProductService/DeleteProduct` | `prd_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.ProductService/GetProduct` | `prd_r`, `do_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.ProductService/ListProduct` | `prd_r`, `do_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.ProductService/SaveProduct` | `prd_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### warehouse

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.WarehouseService/DeleteWarehouse` | `wh_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.WarehouseService/GetWarehouse` | `wh_r`, `do_cu`, `frcp_cu`, `fissue_cu`, `fadj_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.WarehouseService/ListWarehouse` | `wh_r`, `do_cu`, `frcp_cu`, `fissue_cu`, `fadj_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.WarehouseService/SaveWarehouse` | `wh_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### partner

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.PartnerService/DeletePartner` | `cus_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.PartnerService/GetPartner` | `cus_r`, `pmt_r`, `pmt_cu`, `do_cu`, `do_di`, `diso_r`, `diso_cu`, `cusdeb_hx`, `supdeb_hx`, `rec_cu`, `rec_debt_balance`, `subcon_cu` | — | API dùng chung cho select/lookup + filter của nhiều màn — gồm cả view-only (filter phiếu chi `pmt_r`, màn điều xe `diso_r`/`diso_cu`). Nguồn sự thật callers: bảng form→API. |
| `/tms.PartnerService/GetPartnerOpeningBalance` | `cus_r`, `pmt_r`, `pmt_cu`, `do_cu`, `do_di`, `diso_r`, `diso_cu`, `cusdeb_hx`, `supdeb_hx`, `rec_cu`, `rec_debt_balance`, `subcon_cu` | — | API dùng chung cho select/lookup + filter của nhiều màn — gồm cả view-only (filter phiếu chi `pmt_r`, màn điều xe `diso_r`/`diso_cu`). Nguồn sự thật callers: bảng form→API. |
| `/tms.PartnerService/ListPartner` | `cus_r`, `pmt_r`, `pmt_cu`, `do_cu`, `do_di`, `diso_r`, `diso_cu`, `cusdeb_hx`, `supdeb_hx`, `rec_cu`, `rec_debt_balance`, `subcon_cu` | — | API dùng chung cho select/lookup + filter của nhiều màn — gồm cả view-only (filter phiếu chi `pmt_r`, màn điều xe `diso_r`/`diso_cu`). Nguồn sự thật callers: bảng form→API. |
| `/tms.PartnerService/SavePartner` | `cus_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.PartnerService/SavePartnerCustomerOpeningBalance` | `cus_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.PartnerService/SavePartnerSupplierOpeningBalance` | `supdeb_open` | — | **CHỐT ITMS-411:** key mới `supdeb_open` (nhóm Công nợ NCC) thay `cus_cu`; migration backfill cho role có `cus_cu`. |

### driver

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.DriverService/DeleteDriver` | `drv_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DriverService/GetDriver` | `drv_r`, `diso_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.DriverService/ListDriver` | `drv_r`, `diso_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.DriverService/SaveDriver` | `drv_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### vehicle

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.VehicleService/DeleteVehicle` | `veh_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.VehicleService/GetVehicle` | `veh_r`, `do_di`, `diso_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.VehicleService/ListVehicle` | `veh_r`, `do_di`, `diso_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.VehicleService/SaveVehicle` | `veh_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### route

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.RouteService/DeleteRoute` | `vehr_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.RouteService/GetRoute` | `vehr_r`, `do_cu`, `cus_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.RouteService/ListRoute` | `vehr_r`, `do_cu`, `cus_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.RouteService/SaveRoute` | `vehr_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### customer-receipt

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.CustomerReceiptService/Delete` | `rec_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.CustomerReceiptService/Get` | `rec_r` | — | Giữ quyền hiện tại. |
| `/tms.CustomerReceiptService/List` | `rec_r` | — | Giữ quyền hiện tại. |
| `/tms.CustomerReceiptService/Save` | `rec_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### payment-voucher

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.PaymentVoucherService/CancelPaymentVoucher` | `pmt_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.PaymentVoucherService/GetPaymentVoucher` | `pmt_r` | — | Giữ quyền hiện tại. |
| `/tms.PaymentVoucherService/GetSupplierPayableAmount` | `pmt_r`, `pmt_cu`, `supdeb_hx` | — | Số tiền phải trả NCC — dùng trong form phiếu chi (pmt_cu) và có thể trong màn công nợ NCC. |
| `/tms.PaymentVoucherService/ListPaymentVoucher` | `pmt_r` | — | Giữ quyền hiện tại. |
| `/tms.PaymentVoucherService/SavePaymentVoucher` | `pmt_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### customer-debt

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.CustomerDebtService/Export` | `cusdeb_ex` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.CustomerDebtService/ExportCustomerDebtDetail` | `cusdeb_ex` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.CustomerDebtService/Get` | `rec_debt_balance`, `rec_r`, `cusdeb_hx` | — | **CHỐT ITMS-411:** phiếu thu đọc số dư qua `rec_debt_balance`/`rec_r`; màn Công nợ KH giữ `cusdeb_hx`. Không gồm `cus_r`. Thay đổi so với #136: thêm `rec_r`. |
| `/tms.CustomerDebtService/History` | `cusdeb_hx` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.CustomerDebtService/List` | `cusdeb_hx` | — | Giữ quyền hiện tại. |
| `/tms.CustomerDebtService/Recalculate` | `cusdeb_rc` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### supplier-debt

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.SupplierDebtService/Get` | `supdeb_hx` | — | Giữ quyền hiện tại. |
| `/tms.SupplierDebtService/History` | `supdeb_hx` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.SupplierDebtService/List` | `supdeb_hx` | — | Giữ quyền hiện tại. |
| `/tms.SupplierDebtService/Recalculate` | `supdeb_rc` | — | **CHỐT ITMS-411:** key mới `supdeb_rc` cho hành động ghi; migration backfill cho role có `supdeb_hx` — tiền lệ `cusdeb_rc`. |

### delivery-order

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.DeliveryOrderService/DeleteDeliveryOrder` | `do_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DeliveryOrderService/ExportDeliveryOrder` | `do_ex` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DeliveryOrderService/GetDeliveryOrder` | `do_r`, `diso_cu`, `diso_r`, `do_di`, `subcon_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.DeliveryOrderService/ListDeliveryOrder` | `do_r`, `diso_cu`, `diso_r`, `do_di`, `subcon_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.DeliveryOrderService/SaveDeliveryOrder` | `do_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### delivery-instruction

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.DeliveryInstructionService/DeleteDeliveryInstruction` | `do_di` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DeliveryInstructionService/ExportDeliveryInstruction` | `do_di_ex` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DeliveryInstructionService/GetDeliveryInstruction` | `do_di`, `diso_cu`, `diso_r` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.DeliveryInstructionService/GetLatestDeliveryInstructionByCode` | `do_di`, `diso_cu`, `diso_r` | — | **CHỐT ITMS-411:** thêm guard (trước không guard). Phục vụ màn chỉ thị và nhật ký điều xe. |
| `/tms.DeliveryInstructionService/ListDeliveryInstruction` | `do_di`, `diso_cu`, `diso_r` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.DeliveryInstructionService/ListVehicleByDICode` | `do_di`, `diso_cu`, `diso_r` | — | **CHỐT ITMS-411:** thêm guard (trước không guard). Đồng bộ xe theo mã DI. |
| `/tms.DeliveryInstructionService/SaveDeliveryInstruction` | `do_di` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DeliveryInstructionService/ValidateDeliveryInstruction` | `do_di` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### dispatch-order

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.DispatchOrderService/DeleteDispatchOrder` | `diso_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DispatchOrderService/ExportDispatchOrder` | `diso_ex` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.DispatchOrderService/GetDispatchOrder` | `diso_r` | — | Giữ quyền hiện tại. |
| `/tms.DispatchOrderService/ListDispatchOrder` | `diso_r` | — | Giữ quyền hiện tại. |
| `/tms.DispatchOrderService/SaveDispatchOrder` | `diso_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### subcontract

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.SubcontractService/DeleteSubcontract` | `subcon_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.SubcontractService/GetSubcontract` | `subcon_r`, `do_di`, `do_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.SubcontractService/GetSubcontractRelatedOrders` | `subcon_r` | — | Giữ quyền hiện tại. |
| `/tms.SubcontractService/ListSubcontract` | `subcon_r`, `do_di`, `do_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.SubcontractService/SaveSubcontract` | `subcon_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### fuel-tank

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.FuelTankService/Activity` | `ftk_r` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.FuelTankService/Delete` | `ftk_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.FuelTankService/Get` | `ftk_r`, `fadj_cu`, `fissue_cu`, `frcp_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.FuelTankService/List` | `ftk_r`, `fadj_cu`, `fissue_cu`, `frcp_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.FuelTankService/Save` | `ftk_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### fuel-receipt

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.FuelReceiptService/Delete` | `frcp_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.FuelReceiptService/Get` | `frcp_r`, `fadj_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.FuelReceiptService/List` | `frcp_r`, `fadj_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.FuelReceiptService/Save` | `frcp_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### fuel-issue

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.FuelIssueService/Delete` | `fissue_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.FuelIssueService/Get` | `fissue_r`, `fadj_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.FuelIssueService/List` | `fissue_r`, `fadj_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.FuelIssueService/Save` | `fissue_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### fuel-adjustment

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.FuelAdjustmentService/Delete` | `fadj_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.FuelAdjustmentService/Get` | `fadj_r` | — | Giữ quyền hiện tại. |
| `/tms.FuelAdjustmentService/GetSystemBalance` | `fadj_r` | — | Giữ quyền hiện tại. |
| `/tms.FuelAdjustmentService/List` | `fadj_r` | — | Giữ quyền hiện tại. |
| `/tms.FuelAdjustmentService/Save` | `fadj_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### cost

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.CostService/DeleteCost` | `costs_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.CostService/GetCost` | `costs_r`, `diso_cu`, `do_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.CostService/ListCost` | `costs_r`, `diso_cu`, `do_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.CostService/SaveCost` | `costs_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### audit

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.AuditService/GroupAudit` | `audit_r` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.AuditService/ListAudit` | `audit_r` | — | Giữ quyền hiện tại. |

### user

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.UserService/DeleteUser` | `usr_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.UserService/GetPermissions` | `(authenticated)` | — | Trả quyền của chính user — mọi user cần gọi để FE render. |
| `/tms.UserService/GetUser` | `usr_r`, `audit_r` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.UserService/ListUser` | `usr_r`, `audit_r` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.UserService/SaveUser` | `usr_cu` | — | **CHỐT ITMS-411:** giữ `usr_cu`; bổ sung rule conditional trong service — request truyền `roleId` ⇒ phải có thêm `role_cu`. Self đã chặn #128. |

### role

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.RoleService/DeleteRole` | `role_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.RoleService/GetModules` | `role_r`, `role_cu`, `usr_cu` | — | **CHỐT ITMS-411:** thêm guard (trước không guard) — catalog phục vụ cả màn Phân quyền lẫn form Người dùng. |
| `/tms.RoleService/GetRole` | `role_r`, `usr_cu`, `usr_r` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.RoleService/ListRole` | `role_r`, `usr_cu`, `usr_r` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.RoleService/SaveRole` | `role_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### payment-method

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.PaymentMethodService/DeletePaymentMethod` | `pytmtd_d` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |
| `/tms.PaymentMethodService/GetPaymentMethod` | `pytmtd_r`, `pmt_cu`, `rec_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.PaymentMethodService/ListBank` | `pytmtd_r`, `pmt_cu`, `rec_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.PaymentMethodService/ListPaymentMethod` | `pytmtd_r`, `pmt_cu`, `rec_cu` | — | API dùng chung cho select/lookup của nhiều form — allowAnyOf gồm quyền xem module sở hữu + quyền edit/view của các màn gọi nó. Phương án thay thế: giữ 1 quyền + WithCheck trong registry (ít quyền hơn nhưng role phình). Đề xuất chọn allowAnyOf cho endpoint chia sẻ. |
| `/tms.PaymentMethodService/SavePaymentMethod` | `pytmtd_cu` | — | Giữ quyền hiện tại (endpoint ghi/chuyên biệt). |

### (shared)

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.ImageService/DeleteImage` | `(authenticated)` | — | **CHỐT ITMS-411:** tối thiểu authenticated; quyền xoá theo chủ sở hữu ảnh (entity ref) do service kiểm — không biểu diễn bằng tập quyền tĩnh. |
| `/tms.NotificationService/GetNotificationSettings` | `(authenticated)` | — | Thông báo là dữ liệu riêng từng user, không gắn module nghiệp vụ. |
| `/tms.NotificationService/GetUnreadCount` | `(authenticated)` | — | Thông báo là dữ liệu riêng từng user, không gắn module nghiệp vụ. |
| `/tms.NotificationService/ListNotifications` | `(authenticated)` | — | Thông báo là dữ liệu riêng từng user, không gắn module nghiệp vụ. |
| `/tms.NotificationService/MarkAsRead` | `(authenticated)` | — | Thông báo là dữ liệu riêng từng user, không gắn module nghiệp vụ. |
| `/tms.NotificationService/UpdateNotificationSetting` | `(authenticated)` | — | Thông báo là dữ liệu riêng từng user, không gắn module nghiệp vụ. |
| `/tms.ResourceService/ListAdUnit` | — | — | CHƯA PHỦ — không xác định được rule. ⚠️ **needs_decision:** Cần review thủ công method này. |
| `/tms.SettingService/GetNumberFormat` | `(authenticated)` | — | NumberFormat là cấu hình hiển thị dùng chung mọi màn. |

### (auth)

| Endpoint | allowAnyOf | allOf | Lý do / ghi chú |
|---|---|---|---|
| `/tms.AuthService/Login` | `(authenticated hoặc public)` | — | Login/Register là public theo thiết kế; các method khác của service này không có. |
| `/tms.TenantService/Register` | `(authenticated hoặc public)` | — | Login/Register là public theo thiết kế; các method khác của service này không có. |

## Bảng form → API → quyền tối thiểu (closure)

Nguồn: rà code FE `tms-web@dev` (lượt audit 22/11). "Quyền màn" là quyền cần để form dùng đầy đủ.

| Màn/Form | Quyền màn | API gọi | Với matrix mới, role chỉ cần |
|---|---|---|---|
| Đơn vận chuyển (Thêm/Sửa) | `do_cu` (+`do_r`) | deliveryOrder.save, partner.list, product.list, vehicleRoute.list | `do_cu` — vì partner/product/route list đều allowAnyOf có `do_cu` |
| Chỉ thị giao hàng | `do_di` | deliveryInstruction.*, partner.list, subcontract.list, vehicle.list, deliveryOrder.get | `do_di` — các list đã allowAnyOf có `do_di` |
| Nhật ký điều xe | `diso_cu`/`diso_r`/`diso_ex`/`diso_d` | dispatchOrder.*, deliveryOrder.list/detail, deliveryInstruction.list, driver.list, vehicle.list, cost.list | `diso_cu` cho form (driver/vehicle/cost/DI list đều chấp `diso_cu`); `diso_r` cho xem; `diso_d` xoá |
| Thuê vận chuyển | `subcon_cu`/`subcon_r`/`subcon_d`/`subcon_di` | subcontract.*, partner.list (dự kiến), deliveryOrder.* | `subcon_*` — partner.list/đơn hàng chấp `subcon_cu` |
| Phiếu thu | `rec_r`/`rec_cu`/`rec_d` + `rec_debt_balance` | receipt.*, customerDebt.get, partner.list | `rec_cu`+`rec_debt_balance` tạo được phiếu có số dư |
| Phiếu chi | `pmt_r`/`pmt_cu`/`pmt_d` | paymentVoucher.*, partner.list, supplier payable | `pmt_cu` đủ (partner.list + GetSupplierPayableAmount đều chấp) |
| Công nợ KH | `cusdeb_hx`/`cusdeb_ex`/`cusdeb_rc` | customerDebt.*, partner.list (filter) | `cusdeb_hx` đủ (partner.list chấp `cusdeb_hx`) |
| Công nợ NCC | `supdeb_hx`/`supdeb_rc`/`supdeb_open` (đã chốt) | supplierDebt.*, partner.list, saveSupplierOpeningBalance | `supdeb_hx` xem/lọc; `supdeb_rc` recalc; `supdeb_open` nhập số dư đầu kỳ NCC |
| Kiểm kê nhiên liệu | `fadj_r`/`fadj_cu`/`fadj_d` | fuelAdjustment.*, fuelTank.list, getSystemBalance | `fadj_cu` đủ (fuelTank.list + GetSystemBalance chấp `fadj_cu`) |
| Xuất nhiên liệu | `fissue_r`/`fissue_cu`/`fissue_d` | fuelIssue.*, fuelTank.list | `fissue_cu` đủ |
| Nhập nhiên liệu | `frcp_r`/`frcp_cu`/`frcp_d` | fuelReceipt.*, fuelTank.list | `frcp_cu` đủ |
| Quản trị user | `usr_r`/`usr_cu`/`usr_d` | user.*, role.list (chọn vai trò) | `usr_cu` đủ (role.list chấp `usr_cu`) |
| Phân quyền | `role_r`/`role_cu`/`role_d` | role.*, role.getModules | `role_cu` đủ (GetModules chấp `role_cu`) |
| Audit | `audit_r` | audit.*, user.list (filter) | `audit_r` đủ (user.list chấp `audit_r`) |

⇒ Với ma trận này, registry `WithCheck` có thể thu gọn còn rule trong-module (cu/d/ex→r); các dep cross-module được giải quyết ở tầng endpoint. **Vẫn nên giữ WithCheck trong-module** để UI checkbox tự tick.

## Xung đột & điểm nóng

| # | Vấn đề | Chi tiết |
|---|---|---|
| 1 | `CustomerDebtService/Get` bị 2 màn tranh | **CHỐT:** `[rec_debt_balance, rec_r, cusdeb_hx]` — giữ `cusdeb_hx` vì màn Công nợ vẫn dùng Get; không gồm `cus_r`. |
| 2 | Key collision `vehr_cu` | Action 10304 `CustomerAddRoute` và 10602 `RouteEdit` cùng map `vehr_cu`. **GIỮ NGUYÊN cả 2 action** (chốt lại ITMS-411): xoá là thay đổi không hoàn tác với role đang tham chiếu. ⚠️ **needs_decision (Dev):** xác định action nào còn sống trong code trước khi xoá; nếu xoá thì migration đi kèm trong PR của nhóm. |
| 3 | `SupplierDebtService/Recalculate` dùng quyền đọc | **CHỐT:** key mới `supdeb_rc` + migration backfill role có `supdeb_hx`. |
| 4 | `SavePartnerSupplierOpeningBalance` sai module | **CHỐT:** key mới `supdeb_open` (nhóm Công nợ NCC) + migration backfill role có `cus_cu`. |
| 5 | `roleId` trong `SaveUser` | **CHỐT:** truyền `roleId` ⇒ user phải có thêm `role_cu` — check conditional trong service. |
| 6 | `ImageService/DeleteImage` không guard | **CHỐT:** `(authenticated)` + service kiểm chủ sở hữu ảnh theo entity ref. |
| 7 | `DeliveryInstruction` 2 method không guard | **CHỐT:** guard `[do_di, diso_cu, diso_r]`. |
| 8 | `RoleService/GetModules` không guard | **CHỐT:** guard `[role_r, role_cu, usr_cu]`. |

## Quyết định đã chốt (ITMS-411, 22/11) & needs_decision còn lại

8 quyết định đã chốt và áp vào ma trận: CustomerDebt/Get giữ `cusdeb_hx`; GetModules `[role_r, role_cu, usr_cu]`; DeleteImage `(authenticated)` + check chủ ảnh; key mới `supdeb_rc`; rule conditional `roleId`→`role_cu`; key mới `supdeb_open`; 2 DI method guard `[do_di, diso_cu, diso_r]`; nguyên tắc chung = allowAnyOf mở rộng ở endpoint cho API chia sẻ + WithCheck trong-module ở registry.

needs_decision còn lại:
1. **ResourceService/ListAdUnit**: không rõ ngữ nghĩa/caller — cần xác nhận method này phục vụ màn nào để gán quyền.
2. **vehr_cu collision (10304 vs 10602)**: Dev xác định action nào còn sống trong code; giữ nguyên cả 2 cho tới khi có kết luận — xoá (nếu có) phải kèm migration trong PR của nhóm.

## Chưa phủ / giới hạn

- Mapping form→API rà bằng grep tĩnh trên FE dev; form mới/nhánh feature chưa merge có thể chưa nằm trong bảng closure.
- `ResourceService/ListAdUnit` không rõ ngữ nghĩa dùng ở đâu — đánh needs_decision, chưa gán quyền.
- Không rà đa-tenant: mọi permission giả định trong phạm vi tenant của user.
