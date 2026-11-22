# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

- Tên dự án: TMS – Transportation Management System
- Module: **Phân quyền & Kiểm soát truy cập (Permission / Authorization)**
- Phiên bản: v0.4-draft (khung — chờ bằng chứng reproduce của QA để chốt rule)
- Ngày tạo: 19/11/2026
- Người soạn: BA TMS
- Người phê duyệt: Văn Toàn (PO) — *chưa duyệt*

## Lịch sử thay đổi

| Phiên bản | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.4-draft | 22/11/2026 | BA TMS | ITMS-383: thêm `rec_debt_balance` nhóm Phiếu thu; rule OR `cusdeb_hx`/`rec_debt_balance` cho endpoint số dư công nợ (BR-PQ-007); backfill cho role có `rec_r`/`rec_cu` |
| v0.3-draft | 19/11/2026 | BA TMS | Bổ sung dep same-module cho `diso_cu` (ITMS-384): tick phải kéo `diso_r` + `do_r` + `do_di`; làm rõ BR-PQ-003 dep cross-module là BỔ SUNG, không thay thế dep same-module |
| v0.2-draft | 19/11/2026 | BA TMS | Chốt expected + rule cho ITMS-384, 385 theo bằng chứng reproduce của QA; bổ sung permission key Nhóm A; đề xuất scope fix Nhóm A |
| v0.1-draft | 19/11/2026 | BA TMS | Khởi tạo khung tài liệu cho nhóm bug phân quyền ITMS-382, 384–388 (+378, 383) |

---

## 1. GIỚI THIỆU

### 1.1. Mục đích tài liệu

Tài liệu này chuẩn hóa **rule phân quyền xuyên suốt các module TMS** — là chuẩn đối chiếu khi QA reproduce và khi Dev sửa các bug phân quyền. Mỗi rule được ghi theo format: điều kiện quyền → hành vi hệ thống kỳ vọng → bằng chứng reproduce (QA) → trạng thái duyệt.

### 1.2. Phạm vi

**In-scope:**
- Mô hình phân quyền tổng thể: role → permission key → WithCheck chain
- Cơ chế enforce ở BE (interceptor `method_permissions.go`, cây quyền `registry.go`)
- Cơ chế enforce ở FE (`ProtectedViewServer`, `EActionType`, ẩn/disable control)
- Rule cụ thể cho các ticket: ITMS-378, 382, 383, 384, 385, 386, 387, 388

**Out-of-scope:**
- Thiết kế lại hệ thống role/permission (giữ mô hình hiện tại)
- Phân quyền theo tenant / data-scope (chưa phát sinh)
- Nghiệp vụ từng module (đã có SRS riêng trong `docs/srs/`)

### 1.3. Thuật ngữ

| Thuật ngữ | Định nghĩa |
|---|---|
| Permission key | Mã quyền ở BE, dạng `xxx_yy` (VD: `do_r`, `do_di`, `usr_cu`, `cusdeb_hx`) |
| WithCheck | Khai báo trong `registry.go`: quyền A tự kèm kiểm tra/quyền B |
| ProtectedViewServer | Component FE chặn render trang khi user thiếu quyền View (trả 403 thay vì bảng trống) |
| EActionType | Enum hành động ở FE (View/Add/Edit/Delete/Export...) dùng để ẩn nút khi thiếu quyền |
| Self-action | Thao tác lên chính tài khoản mình (đổi role, xoá chính mình) |

## 2. MÔ TẢ TỔNG QUAN

### 2.1. Mô hình phân quyền hiện tại (theo phân tích code của Dev TMS, 19/11/2026)

- **BE (`tms_application`, Go/ent)** có 2 cơ chế tập trung:
  1. `internal/interceptor/method_permissions.go` — map RPC method → permission key bắt buộc. Method thiếu trong map = mọi user đăng nhập đều gọi được. Method nhận nhiều quyền thay thế khai báo ở `methodAnyPermissions` (user cần ít nhất một key trong tập).
  2. `internal/application/permission/registry.go` — cây quyền: một quyền `.WithCheck(...)` quyền khác → cấp quyền A tự động kèm B.
- **FE (`tms-web`, Next.js/tRPC)**: `ProtectedViewServer` chặn trang khi thiếu quyền View; `EActionType` + `usePermissionCheck` ẩn/disable nút. Nhiều màn đã có cơ chế nhưng chưa áp.
- **Nguyên tắc chung đang áp:** quyền Add/Edit/Delete phải kèm quyền View tương ứng của cùng module; user không có quyền View → báo từ chối truy cập (403), KHÔNG hiển thị bảng trống; user không được phép leo quyền/tự tác động lên chính mình ngoài quyền được cấp.

### 2.2. Đối tượng người dùng

| Vai trò | Mô tả |
|---|---|
| Admin | Full quyền, không bị giới hạn rule trong tài liệu này |
| Role thường | Tập hợp permission được tick trong màn Role; mọi hành vi bị ràng buộc bởi quyền được cấp |

### 2.3. Giả định & ràng buộc

- Danh mục permission key lấy từ `registry.go` + `method_permissions.go` bản code hiện tại (Dev TMS xác nhận 19/11/2026).
- Rule chốt trong tài liệu này chỉ có hiệu lực sau khi anh Toàn duyệt.

## 3. DANH MỤC MODULE & PERMISSION KEY

> Nguồn: `internal/application/permission/registry.go` + `internal/interceptor/method_permissions.go` (trích theo báo cáo Dev TMS). Các key đã xác nhận liên quan ticket; danh mục đầy đủ cần Dev export bổ sung ở lần cập nhật tới.

| Module | Permission key | Tên quyền hiển thị | Ticket liên quan |
|---|---|---|---|
| Delivery Order | `do_r` | Đơn vận chuyển - Xem | ITMS-384 |
| Delivery Order | `do_di` | Delivery Instructions - Xem/Danh sách | ITMS-384 |
| Dispatch Order | `diso_r` | Dispatch log (điều xe) - Xem | ITMS-384 |
| Dispatch Order | `diso_cu` | Dispatch log - Thêm/Sửa (auto-check `do_r`) | ITMS-384 |
| Fuel | `fadj_r` | Kiểm kê (Fuel adjustment) - Xem | ITMS-385 |
| Fuel | `fadj_cu` | Kiểm kê - Thêm/Sửa | ITMS-385 |
| Fuel | `fadj_d` | Kiểm kê - Xóa | ITMS-385 |
| Fuel | `fissue_d` | Xuất nhiên liệu (Fuel issue) - Xóa | ITMS-385 |
| Customer Debt | `cusdeb_hx` | Customer debt - View/Balance | ITMS-383 |
| Customer Debt | *(chưa rõ key)* | Customer debt - Export Excel | ITMS-378 |
| Customer Receipt | `rec_debt_balance` | Xem số dư công nợ khách hàng (auto-check `rec_r`) | ITMS-383 |
| User | `usr_cu` | User - Create/Update | ITMS-382 |
| User | *(chưa rõ key)* | User - Delete | ITMS-388 |
| User/Role | *(chưa rõ key)* | Role - Edit (đổi role user) | ITMS-382 |
| Payment Voucher | *(chưa rõ key)* | Payment voucher - View/Create/Cancel | ITMS-386, 387 |
| Receipt Payment | *(chưa rõ key)* | Receipt - View/Create/Cancel | ITMS-386, 387 |
| Payment Method | *(chưa rõ key)* | Payment method - View | ITMS-386 |

*(Trống chờ: export danh mục đầy đủ từ registry.go — nhờ Dev TMS bổ sung khi bắt đầu PR liên quan.)*

## 4. QUY TẮC NGHIỆP VỤ (Business Rules)

### 4.1. Rule chung (đã chốt nguyên tắc, chờ gắn bằng chứng)

| Mã | Quy tắc | Trạng thái |
|---|---|---|
| BR-PQ-001 | User không có quyền **View** của một màn → hệ thống trả/hiển thị **từ chối truy cập (403)**, KHÔNG render bảng trống. | Draft — căn cứ ITMS-386 |
| BR-PQ-002 | User không có quyền action (Create/Cancel/Delete/Export) → control tương ứng **không render** trên UI (ẩn hoàn toàn, không chỉ disable). | Draft — căn cứ ITMS-387, 378 |
| BR-PQ-003 | Quyền Add/Edit/Delete của module X phải **kèm quyền View của chính module X** (và quyền xem dữ liệu phụ thuộc cần thiết để thực hiện action). **Lưu ý:** dep cross-module (VD `do_r`, `do_di`) là **BỔ SUNG**, không thay thế dep same-module — tick `diso_cu` phải kéo `diso_r` (View của chính Dispatch Order) **và** các quyền xem cross-module. | Draft — căn cứ ITMS-384, 385 |
| BR-PQ-004 | Mọi RPC method nhạy cảm phải có mapping trong `method_permissions.go`; method thiếu mapping = lỗi bảo mật. | Draft — căn cứ ITMS-383 |
| BR-PQ-005 | User **không được phép tự thay đổi role/quyền của chính mình** khi không có quyền quản trị role tương ứng. | Draft — căn cứ ITMS-382 |
| BR-PQ-006 | User **không được phép xoá chính tài khoản mình**, kể cả khi có quyền "User - Delete". | Draft — căn cứ ITMS-388 |
| BR-PQ-007 | Endpoint số dư công nợ khách hàng `GET /api/v1/customer-debts/{customerId}` (`CustomerDebtService/Get`, FE gọi qua `customerDebt.balance`) **CHẤP NHẬN `cusdeb_hx` HOẶC `rec_debt_balance`**; chỉ có `rec_r`/`rec_cu` hoặc thiếu cả hai → **403**. Không tái dùng `rec_r`/`rec_cu` cho quyền đọc số dư; dùng tập quyền OR (`methodAnyPermissions`). `List`/`History` vẫn chỉ `cusdeb_hx`. | Draft — căn cứ ITMS-383, quyết định anh Toàn 22/11/2026 |

### 4.2. Rule theo ticket — chờ bằng chứng reproduce của QA để chốt expected

| Ticket | Module | Rule chốt (expected) | Bằng chứng QA | Duyệt |
|---|---|---|---|---|
| ITMS-384 | Dispatch/DI | **BR-PQ-003a**: Cấp `diso_cu` (Dispatch log - Thêm/Sửa) phải tự kèm **`diso_r`** (View chính module) **+ `do_r` + `do_di`** — user sửa điều xe phải xem được Delivery Instructions (danh sách + chi tiết). Thiếu `do_di` → `deliveryInstruction.list` trả 403, màn `/delivery-instructions` 404. | ☑ REPRODUCED 19/11/2026 — user `qadispatch` (`diso_r`+`diso_cu`+`do_r`, không `do_di`). Bug phụ phát hiện 19/11: tick `diso_cu` chưa auto-ON `diso_r` (thiếu dep same-module). Triệu chứng đã reproduce: trang DI → 404, `deliveryInstruction.list` → 403 ở cả màn DI lẫn form `/dispatch-orders`; `dispatchOrder.list` vẫn 200. Bằng chứng: `qa-261119-1025-itms-384-385-reproduce.md` + `evidence-384-385/` | ☑ đã duyệt hướng (19/11/2026) |
| ITMS-385 | Fuel | **BR-PQ-003b**: `fadj_cu` và `fadj_d` (Kiểm kê - Thêm/Sửa, Xóa) phải `.WithCheck(fadj_r)` — auto-tick **"Kiểm kê - Xem"**, TUYỆT ĐỐI không cấp `fissue_d` (Xuất nhiên liệu - Xóa) hay bất kỳ quyền module khác. | ☑ REPRODUCED 19/11/2026 — admin tick `fadj_cu` → `fissue_d` tự ON trong khi `fadj_r` vẫn OFF. Cùng root cause ở `fadj_d` (chưa verify riêng, gộp chung fix). Bằng chứng: cùng report + `385-before.png`, `385-after-tick.png` | ☐ chờ anh Toàn duyệt |
| ITMS-382 | Users | User không có quyền sửa role → không tự đổi được role của mình (BE chặn + FE disable RoleSelect trên chính mình). | ☐ chờ | ☐ |
| ITMS-383 | Customer Debt / Phiếu thu | **BR-PQ-007**: `CustomerDebtService/Get` chấp nhận **`cusdeb_hx` HOẶC `rec_debt_balance`**; `rec_r`/`rec_cu` một mình hoặc thiếu cả hai → 403. Quyền mới hiển thị là checkbox **"Xem số dư công nợ khách hàng"** trong nhóm Phiếu thu (action `20104`). | ☑ Dev verified 22/11/2026 (PR #136, commit `88d4ce0`), HTTP thật trên stack local: `cusdeb_hx` 200, chỉ `rec_debt_balance` 200, chỉ `rec_r` 403, chỉ `rec_cu` 403, `prd_r` 403, admin 200; `GET /api/v1/roles/modules` trả action `20104` trong nhóm Phiếu thu (4 action), `rec_r` uncheck `[20102, 20103, 20104]`; migration `000023` backfill 7 role ở bản clone + 2 role active ở staging (Bán hàng, Manager), chạy lại `UPDATE 0`; `go build ./...` + `go test` pass | ☐ chờ anh Toàn duyệt |
| ITMS-386 | Nhiều màn | 5 màn (payment-vouchers, receipt-payments, customer-debt, payment-methods, dispatch-orders) thiếu quyền View → 403 thay vì bảng trống. | ☐ chờ | ☐ |
| ITMS-387 | Payment/Receipt | Nút Cancel/Create trên Payment Voucher & Receipt chỉ hiện khi có quyền tương ứng. | ☐ chờ | ☐ |
| ITMS-388 | Users | Nút Delete ẩn trên row của chính mình + BE từ chối `Delete(id == self)`. | ☐ chờ | ☐ |
| ITMS-378 | Customer Debt | Nút Export Excel chỉ hiện khi có `CustomerDebtExport` — Dev báo đã fix ở commit `32ba7c4` (#182), chỉ còn verify. | ☐ chờ verify | ☐ |

### 4.3. Scope fix đề xuất — Nhóm A (ITMS-384 + 385, chung 1 PR)

Cùng file `internal/application/permission/registry.go` (BE `tms_application`):

| Ticket | Vị trí | Sửa |
|---|---|---|
| ITMS-384 | `registry.go:169` — `DispatchOrderEdit` | Thêm `.WithCheck(DispatchOrderView)` (cấp `diso_r`, dep same-module) + `.WithCheck(DeliveryInstruction)` (cấp `do_di`) bên cạnh `DeliveryOrderView` hiện có |
| ITMS-385 | `registry.go:202-205` — `FuelAdjustEdit`, `FuelAdjustDelete` | Đổi `.WithCheck(FuelIssueDelete)` → `.WithCheck(FuelAdjustView)`; sửa mô tả quyền ghi sai "Yêu cầu quyền xóa Xuất nhiên liệu" |

- FE: không cần sửa (auto-check chạy từ cây quyền BE).
- Test: với 384, user `diso_cu` phải gọi được `deliveryInstruction.list` và mở được `/delivery-instructions`; với 385, tick `fadj_cu`/`fadj_d` chỉ kéo `fadj_r`, không đụng nhóm Xuất nhiên liệu.

### 4.4. Migrate / backfill dữ liệu — ITMS-383

Migration `000023_itms383_backfill_receipt_debt_balance_permission` (repo `tms_application`, PR #136):

- **Up**: cấp `rec_debt_balance` cho **mọi role đang có `rec_r` hoặc `rec_cu`**; idempotent (chạy lại = `UPDATE 0`).
- **Down**: gỡ `rec_debt_balance` khỏi mọi role.
- **Vì sao bắt buộc**: không backfill thì role thu ngân/kế toán đang có `rec_r`/`rec_cu` bị 403 ở form phiếu thu sau deploy; FE fallback `totalDue = debtBalance?.closingDebt ?? outstanding ?? 0` nên ô tổng nợ hiển thị **0** mà không báo lỗi.
- **Phạm vi đã verify**: bản clone local 7 role khớp rule; staging lúc review 2 role active — **Bán hàng**, **Manager**. Production áp cùng rule khi deploy.
- **Hiệu lực quyền**: BE đọc quyền từ session snapshot (Redis) → user được backfill thấy key từ **lần đăng nhập kế tiếp** hoặc sau khi refresh session của role, không tức thời ngay sau `migrate up`.

## 5. LIÊN HỆ SRS KHÁC

- `SRS-CongNo-NhaCungCap.docx` — module read-only; vai trò Kế toán xem/lọc, Admin full (ITMS-383 bám rule này).
- `SRS-DonVanChuyen.docx` — vai trò: Admin full; Nhân viên điều phối xem/tạo/sửa; Nhân viên cấp lệnh chỉ xem.
- `ITMS-378-customer-debt-export-excel-permission.md` — SRS con của 378.

## 6. OPEN QUESTIONS

1. Danh mục permission key đầy đủ từ `registry.go` (cần Dev export khi làm PR-A).
2. Key/tên hiển thị chính xác cho các ô "chưa rõ key" ở mục 3.
3. BR-PQ-002: với nút quan trọng (Cancel), chọn ẩn hoàn toàn hay disable + tooltip? — đề xuất ẩn, chờ anh Toàn chốt kèm kết quả QA.
