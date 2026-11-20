## TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

Tên dự án: TMS – Transportation Management System

Module: Quản lý tuyến xe (Route Management)

### Lịch sử thay đổi (Revision History)

| Phiên bản | Ngày | Người thực hiện | Nội dung thay đổi |
|---|---|---|---|
| v1.0 | 18/07/2026 | Thư | Khởi tạo tài liệu |

### 1. GIỚI THIỆU (Introduction)

#### 1.1. Mục đích tài liệu

Đặc tả yêu cầu chức năng và phi chức năng cho module Quản lý tuyến xe thuộc hệ thống TMS.

#### 1.2. Phạm vi hệ thống (Scope)

In-scope:

Màn hình Danh sách tuyến xe (Route List)

Màn hình Thêm tuyến xe (Create Route) gồm 4 section: thông tin chung, nơi nhận, nơi giao, chi phí

Màn hình Chi tiết tuyến đường (Route Detail — view only)

Màn hình Sửa tuyến xe (Edit Route)

Xoá tuyến xe (soft delete) từ màn Chi tiết

Gán kho xuất phát / kho đích cho tuyến

Gán danh mục chi phí cho tuyến (sub-table)

Out-of-scope:

Tối ưu hoá tuyến đường (route optimization)

Tích hợp bản đồ / tính khoảng cách tự động

Quản lý chi phí chi tiết (thuộc module Quỹ / Tài Chính)

#### 1.3. Thuật ngữ & viết tắt (Glossary)

| Thuật ngữ | Định nghĩa |
|---|---|
| Route / Tuyến xe | Tuyến vận chuyển kết nối kho xuất phát (origin) và kho đích (destination) |
| Origin / Nơi nhận | Kho xuất phát — nơi lấy hàng |
| Destination / Nơi giao | Kho đích — nơi giao hàng |
| Route Cost | Chi phí gắn với tuyến (cầu đường, phí qua trạm...), liên kết qua bảng trung gian route_cost |
| Cost | Danh mục loại chi phí (master data), quản lý riêng |
| Warehouse | Kho hàng — được chọn làm origin/destination cho tuyến |
| Delivery Order | Đơn hàng giao hàng — tham chiếu route_id |

### 2. MÔ TẢ TỔNG QUAN (Overall Description)

#### 2.1. Bối cảnh & vấn đề (Business Context)

Tuyến xe là entity cốt lõi của hệ thống TMS, kết nối kho xuất phát và kho đích, mang theo thông tin khoảng cách (km), thời gian dự kiến, và danh sách chi phí phát sinh. Tuyến xe được tham chiếu trong:

delivery_order.route_id — đơn hàng giao hàng sử dụng tuyến.

route_cost (bảng trung gian N-N) — gán các loại chi phí (cost) cho tuyến.

Khi chọn kho cho tuyến, hệ thống tự động fill thông tin địa chỉ (tỉnh/TP, phường/xã, địa chỉ) từ dữ liệu kho — nhưng cũng lưu riêng vào route (denormalize) để tuyến vẫn giữ đúng địa chỉ ngay cả khi kho cập nhật sau.

Hiện tại hệ thống quản lý 29 tuyến xe.

#### 2.2. Đối tượng người dùng (User Personas)

| Vai trò | Mô tả | Quyền hạn chính |
|---|---|---|
| Admin | Quản trị viên | Full quyền |
| Nhân viên vận hành | Người dùng nghiệp vụ | Xem, thêm, chỉnh sửa tuyến |

#### 2.3. Giả định & ràng buộc

Giả định: Mã tuyến xe do user nhập, duy nhất per tenant. Khi chọn kho → auto-fill tỉnh/TP, phường/xã, địa chỉ từ thông tin kho nhưng user có thể chỉnh sửa (override). Trường length (số km) và time (thời gian) lưu dạng varchar (không phải number).

Ràng buộc: Multi-tenant. origin_warehouse_id và destination_warehouse_id là FK → warehouse.id. Chi phí tuyến quản lý qua bảng trung gian route_cost liên kết route_id ↔ cost_id.

Phụ thuộc: route tham chiếu bởi delivery_order — cần xử lý khi xoá tuyến đang có đơn hàng. Dropdown kho load từ module Kho. Dropdown chi phí load từ bảng cost.

### 3. YÊU CẦU CHỨC NĂNG (Functional Requirements)

#### 3.1. Màn hình: Danh sách tuyến xe (Route List)

Mã yêu cầu: FR-RTE-001 Độ ưu tiên: Must have

##### 3.1.1. Mô tả nghiệp vụ (Business Description)

Hiển thị danh sách tuyến xe dưới dạng bảng. Tìm kiếm theo mã tuyến xe, sắp xếp theo cột. Mỗi dòng hiển thị thông tin kho nơi nhận và nơi giao kèm địa chỉ chi tiết.

Đường dẫn: Sidebar → Vận Hành → [Submenu] → Danh sách tuyến xe

##### 3.1.2. User Story

Là nhân viên vận hành, tôi muốn xem danh sách tuyến xe với nơi nhận và nơi giao để chọn tuyến phù hợp khi tạo đơn hàng giao hàng.

##### 3.1.3. Luồng xử lý (User Flow)

Luồng chính: Truy cập → hiển thị bảng, mặc định created_at DESC. Tìm kiếm theo mã tuyến xe.

Luồng phụ: Click "+ Thêm Tuyến Xe" → Thêm. Click mã tuyến (link xanh) → Chi tiết.

##### 3.1.4. Đặc tả giao diện (UI Specification)

Thanh tìm kiếm:

| # | Thành phần | Loại | Mô tả |
|---|---|---|---|
| 1 | Nhập mã tuyến xe | Search Input | Tìm trên search_code. |

Bảng danh sách:

| # | Cột | Kiểu hiển thị | Sắp xếp | Mô tả |
|---|---|---|---|---|
| 1 | Ngày tạo | Text (DD/MM/YYYY + HH:mm) | Có (↑↓) | created_at. Mặc định DESC. |
| 2 | Mã tuyến | Text (link xanh) | Có (↑↓) | code. Click → Chi tiết. |
| 3 | Tên tuyến xe | Text | — | name. |
| 4 | Nơi nhận | Text 2 dòng | — | Dòng 1 (bold): Tên kho origin (resolve origin_warehouse_id → warehouse.name). Dòng 2 (nhỏ, xám): Địa chỉ ghép từ origin_address, origin_commune (resolve tên), origin_province (resolve tên). |
| 5 | Nơi giao | Text 2 dòng | — | Dòng 1 (bold): Tên kho destination. Dòng 2: Địa chỉ ghép tương tự. |

Nút hành động:

| # | Nút | Vị trí | Mô tả |
|---|---|---|---|
| 1 | + Thêm Tuyến Xe | Góc trên bên phải | Button primary xanh lá. |

##### 3.1.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-RTE-001 | Chỉ hiển thị is_deleted = false thuộc tenant. |
| BR-RTE-002 | Sắp xếp mặc định created_at DESC. |
| BR-RTE-003 | Tìm kiếm case-insensitive trên search_code. |
| BR-RTE-004 | Cột Nơi nhận/Nơi giao hiển thị tên kho (bold) + địa chỉ đầy đủ (dòng phụ). Tên kho resolve từ FK warehouse. Địa chỉ ghép từ các trường origin_address/destination_address + tên commune + tên province (resolve mã). |

##### 3.1.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/routes | GET | Danh sách tuyến xe |

Query Params:

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| search | string | Không | Tìm trên search_code |
| sort_by | string | Không | created_at, code, name. Default: created_at |
| sort_order | string | Không | Default: desc |
| page | integer | Không | Default: 1 |
| page_size | integer | Không | Default: 20 |

Response mẫu (200):

{

"data": [

{

"id": "uuid",

"code": "T-04",

"name": "Đồng Nai",

"origin_warehouse_id": "wh-uuid-1",

"origin_warehouse_name": "KHO VIỆT NHẬT",

"origin_province": "75",

"origin_province_name": "Thành Phố Đồng Nai",

"origin_commune": "25708",

"origin_commune_name": "Xã Phước Thái",

"origin_address": "KCN Gò Dầu",

"destination_warehouse_id": "wh-uuid-2",

"destination_warehouse_name": "KHO NM BÌNH ĐIỀN",

"destination_province": "72",

"destination_province_name": "Tây Ninh",

"destination_commune": "25843",

"destination_commune_name": "Xã Long Cang",

"destination_address": "Cụm Công Nghiệp Long Định",

"created_at": "2026-05-28T10:14:00Z"

}

],

"pagination": { "page": 1, "page_size": 20, "total_items": 29, "total_pages": 2 }

}

Lưu ý cho BE: API list nên resolve origin_warehouse_name, destination_warehouse_name, cùng tên province/commune để FE không cần gọi thêm.

#### 3.2. Màn hình: Thêm tuyến xe (Create Route)

Mã yêu cầu: FR-RTE-002 Độ ưu tiên: Must have

##### 3.2.1. Mô tả nghiệp vụ (Business Description)

Thêm mới tuyến xe với 4 section: Thông tin chung (mã, tên, số km, thời gian, mô tả), Thông tin nơi nhận (kho, tỉnh/TP, phường/xã, địa chỉ), Thông tin nơi giao (kho, tỉnh/TP, phường/xã, địa chỉ), và Thông tin chi phí (sub-table gán loại chi phí cho tuyến).

##### 3.2.2. User Story

Là nhân viên vận hành, tôi muốn tạo tuyến xe với kho xuất phát, kho đích, khoảng cách, thời gian, và các loại chi phí liên quan để sử dụng khi tạo đơn hàng vận chuyển.

##### 3.2.3. Luồng xử lý (User Flow)

Luồng chính — Thêm thành công:

Click "+ Thêm Tuyến Xe" → form 4 section.

Nhập bắt buộc: Mã tuyến xe, Tên tuyến xe, Kho nơi nhận, Tỉnh/TP nơi nhận, Phường/Xã nơi nhận, Kho nơi giao, Tỉnh/TP nơi giao, Phường/Xã nơi giao.

Tuỳ chọn: Số km (default 0), Thời gian, Mô tả, Địa chỉ nơi nhận/giao.

Tuỳ chọn thêm chi phí trong sub-table "Thông tin chi phí".

Click "Lưu" → validate → lưu route + route_costs → toast → quay về danh sách.

Luồng phụ — Chọn Kho → Auto-fill địa chỉ:

Khi chọn Kho nơi nhận (dropdown) → hệ thống auto-fill Tỉnh/TP, Phường/Xã, Địa chỉ từ thông tin kho đã chọn.

User có thể chỉnh sửa (override) các trường được auto-fill.

Tương tự cho Kho nơi giao.

Đổi kho → auto-fill lại, ghi đè giá trị cũ.

Luồng phụ — Thêm chi phí (sub-table):

Click nút thêm dòng ("+") → thêm hàng mới với dropdown chọn chi phí.

Dropdown load danh sách loại chi phí từ bảng cost (active, cùng tenant).

Hiển thị: Mã chi phí, Tên chi phí.

Có thể thêm nhiều dòng chi phí.

Luồng ngoại lệ:

Mã tuyến trùng → lỗi validation.

Trường bắt buộc trống → lỗi validation.

Kho nơi nhận = kho nơi giao → cảnh báo (tuỳ nghiệp vụ).

##### 3.2.4. Đặc tả giao diện (UI Specification)

Header:

| # | Thành phần | Mô tả |
|---|---|---|
| 1 | Nút quay lại (←) | Quay về danh sách |
| 2 | Tiêu đề | "Thêm tuyến xe" |
| 3 | Nút Lưu | Button primary, góc phải |

Section 1 — "Thông tin chung":

| # | Thành phần | Loại | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | Mã tuyến xe | Textbox | Có (*) | Unique per tenant. Lưu code + search_code. |
| 2 | Tên tuyến xe | Textbox | Có (*) | Lưu name + search_name. |
| 3 | Số km | Number Input | Không | Mặc định 0. Lưu length (varchar). |
| 4 | Thời gian | Textbox | Không | Nhập tự do (VD: "4h", "2 ngày"). Lưu time (varchar). |
| 5 | Mô tả | Textarea | Không | Lưu description. |

Layout Section 1:

Hàng 1: Mã tuyến xe (50%) | Tên tuyến xe (50%)

Hàng 2: Số km (50%) | Thời gian (50%)

Hàng 3: Mô tả (100%)

Section 2 — "Thông tin nơi nhận":

| # | Thành phần | Loại | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | Kho | Dropdown | Có (*) | Load danh sách kho hoạt động. Hiển thị "mã kho - tên kho". Chọn → auto-fill TP, Xã, Địa chỉ từ kho. Lưu origin_warehouse_id. |
| 2 | Tỉnh/Thành Phố | Dropdown | Có (*) | Auto-fill từ kho. Có thể override. Lưu origin_province (mã). |
| 3 | Phường/Xã | Dropdown | Có (*) | Cascade từ Tỉnh/TP. Auto-fill từ kho. Lưu origin_commune (mã). |
| 4 | Địa chỉ | Textbox | Không | Auto-fill từ kho. Có thể override. Lưu origin_address. |

Layout Section 2:

Hàng 1: Kho (~33%) | Tỉnh/Thành Phố (~33%) | Phường/Xã (~33%)

Hàng 2: Địa chỉ (100%)

Section 3 — "Thông tin nơi giao": (cấu trúc giống hệt Section 2, lưu vào trường destination_)*

| # | Thành phần | Loại | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | Kho | Dropdown | Có (*) | Lưu destination_warehouse_id. |
| 2 | Tỉnh/Thành Phố | Dropdown | Có (*) | Lưu destination_province. |
| 3 | Phường/Xã | Dropdown | Có (*) | Lưu destination_commune. |
| 4 | Địa chỉ | Textbox | Không | Lưu destination_address. |

Section 4 — "Thông tin chi phí" (sub-table):

| # | Cột | Kiểu | Sắp xếp | Mô tả |
|---|---|---|---|---|
| 1 | Mã chi phí | Text (read-only) | Có (↑↓) | cost.code. Tự động hiển thị khi chọn chi phí. |
| 2 | Tên chi phí | Text (read-only) | Có (↑↓) | cost.name. Tự động hiển thị khi chọn chi phí. |

Nút sub-table:

| # | Nút | Mô tả |
|---|---|---|
| 1 | + (Thêm dòng) | Thêm hàng mới → dropdown chọn loại chi phí từ bảng cost. |
| 2 | Xoá dòng | Xoá dòng chi phí khỏi sub-table. |

##### 3.2.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-RTE-005 | Mã tuyến xe (code) duy nhất per tenant. |
| BR-RTE-006 | Khi chọn Kho nơi nhận → auto-fill Tỉnh/TP, Phường/Xã, Địa chỉ từ thông tin kho (warehouse.province, warehouse.commune, warehouse.address). User có thể override. |
| BR-RTE-007 | Khi chọn Kho nơi giao → auto-fill tương tự cho destination. |
| BR-RTE-008 | Đổi kho → auto-fill lại, ghi đè giá trị cũ (kể cả user đã sửa). (Cần confirm PO: ghi đè hay chỉ fill khi trống?) |
| BR-RTE-009 | Cascade Tỉnh/TP → Phường/Xã áp dụng cho cả nơi nhận và nơi giao. Đổi tỉnh → reset phường/xã. |
| BR-RTE-010 | Dropdown Kho chỉ load kho có is_active = true, is_deleted = false cùng tenant. |
| BR-RTE-011 | length và time lưu dạng varchar (không phải numeric). FE nhận text tự do. length hiển thị trên form dạng number input (default 0), time hiển thị dạng textbox. |
| BR-RTE-012 | cost (trường numeric trên bảng route) hiện NOT NULL — cần xác định mục đích. Trên UI không hiển thị trường cost tổng. (Confirm PO: trường này dùng cho gì? Default = 0?) |
| BR-RTE-013 | Sub-table chi phí liên kết qua route_cost. Mỗi dòng = 1 cost_id. Không cho chọn trùng cost_id trong cùng tuyến. |
| BR-RTE-014 | Dropdown chi phí load từ bảng cost có is_active = true, is_deleted = false cùng tenant. |
| BR-RTE-015 | search_code, search_name, search_description tạo tự động. |
| BR-RTE-016 | Route và route_costs lưu trong cùng transaction. |
| BR-RTE-017 | Nút "Lưu" enable khi: Mã tuyến xe, Tên tuyến xe, Kho + Tỉnh/TP + Phường/Xã nơi nhận, Kho + Tỉnh/TP + Phường/Xã nơi giao đều đã điền. |

Validation Errors:

| Mã lỗi | Trường | Điều kiện | Message |
|---|---|---|---|
| VE-RTE-001 | Mã tuyến xe | Trống | "Vui lòng nhập mã tuyến xe" |
| VE-RTE-002 | Tên tuyến xe | Trống | "Vui lòng nhập tên tuyến xe" |
| VE-RTE-003 | Kho nơi nhận | Chưa chọn | "Vui lòng chọn kho nơi nhận" |
| VE-RTE-004 | Tỉnh/TP nơi nhận | Chưa chọn | "Vui lòng chọn tỉnh/thành phố nơi nhận" |
| VE-RTE-005 | Phường/Xã nơi nhận | Chưa chọn | "Vui lòng chọn phường/xã nơi nhận" |
| VE-RTE-006 | Kho nơi giao | Chưa chọn | "Vui lòng chọn kho nơi giao" |
| VE-RTE-007 | Tỉnh/TP nơi giao | Chưa chọn | "Vui lòng chọn tỉnh/thành phố nơi giao" |
| VE-RTE-008 | Phường/Xã nơi giao | Chưa chọn | "Vui lòng chọn phường/xã nơi giao" |
| VE-RTE-009 | Mã tuyến xe | Trùng | "Mã tuyến xe đã tồn tại" |

##### 3.2.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/routes | POST | Tạo tuyến xe (kèm costs) |
| 2 | /api/v1/warehouses?is_active=true | GET | Dropdown kho |
| 3 | /api/v1/costs?is_active=true | GET | Dropdown chi phí |
| 4 | /api/v1/locations/provinces | GET | Tỉnh/TP |
| 5 | /api/v1/locations/communes?province={code} | GET | Phường/Xã |

Request Body (POST /api/v1/routes):

{

"code": "T-05",

"name": "Tuyến Bình Dương",

"length": "150",

"time": "3h",

"description": "",

"origin_warehouse_id": "wh-uuid-1",

"origin_province": "72",

"origin_commune": "25843",

"origin_address": "Cụm CN Long Định",

"destination_warehouse_id": "wh-uuid-2",

"destination_province": "75",

"destination_commune": "25708",

"destination_address": "KCN Gò Dầu",

"cost_ids": ["cost-uuid-1", "cost-uuid-2"]

}

Response (201 Created):

{

"id": "uuid",

"code": "T-05",

"name": "Tuyến Bình Dương",

"length": "150",

"time": "3h",

"origin_warehouse_id": "wh-uuid-1",

"origin_warehouse_name": "KHO NM BÌNH ĐIỀN",

"destination_warehouse_id": "wh-uuid-2",

"destination_warehouse_name": "KHO ĐỒNG NAI",

"costs": [

{ "id": "rc-uuid", "cost_id": "cost-uuid-1", "code": "CD001", "name": "Cầu đường" }

],

"created_at": "2026-07-18T10:00:00Z"

}

Error Codes:

| HTTP Code | Error Code | Message | Trường hợp |
|---|---|---|---|
| 400 | ERR_VALIDATION | Dữ liệu không hợp lệ | Thiếu bắt buộc |
| 409 | ERR_DUPLICATE_CODE | Mã tuyến xe đã tồn tại | Trùng code |
| 401 | ERR_UNAUTHORIZED | Phiên đăng nhập hết hạn |  |
| 500 | ERR_INTERNAL | Lỗi hệ thống |  |

Lưu ý cho BE:

cost_ids là mảng. BE tạo record trong route_cost cho mỗi cost_id, gán order_index theo thứ tự mảng.

cost (numeric NOT NULL trên bảng route) — nếu không dùng trên UI, có thể default 0.

Validate origin_warehouse_id và destination_warehouse_id tồn tại, active, cùng tenant.

Validate mỗi cost_id tồn tại, active, cùng tenant. Không cho trùng trong cùng tuyến.

customer_routes (varchar nullable) — trường này tồn tại trong DB nhưng không hiển thị trên UI. (Confirm mục đích)

#### 3.3. Màn hình: Chi tiết tuyến đường (Route Detail)

Mã yêu cầu: FR-RTE-003 Độ ưu tiên: Must have

##### 3.3.1. Mô tả nghiệp vụ (Business Description)

Hiển thị chi tiết tuyến xe ở chế độ view-only với 4 section: Thông tin chung, Thông tin nơi nhận (bên trái), Thông tin nơi giao (bên phải, cùng hàng), và Thông tin chi phí (bảng read-only).

##### 3.3.2. Luồng xử lý (User Flow)

Click mã tuyến → API chi tiết → hiển thị 4 section. Click "Chỉnh Sửa" → Sửa. Click xoá → soft delete.

##### 3.3.3. Đặc tả giao diện (UI Specification)

Header: Nút quay lại | "Chi tiết tuyến đường" | Nút xoá (cam) | Nút Chỉnh Sửa

Sub-header: Mã tuyến (bold, VD: "T-04"). (Không có badge trạng thái trên screenshot)

Section "Thông tin chung" (label-value):

| # | Label | Giá trị |
|---|---|---|
| 1 | Tên tuyến xe | name |
| 2 | Số km | length |
| 3 | Thời gian | time |
| 4 | Mô tả | description |

Section "Thông tin nơi nhận" (bên trái) + "Thông tin nơi giao" (bên phải) — hiển thị song song:

| # | Label | Nơi nhận | Nơi giao |
|---|---|---|---|
| 1 | Kho | Tên kho origin | Tên kho destination |
| 2 | Tỉnh/Thành phố | Resolve origin_province | Resolve destination_province |
| 3 | Phường xã | Resolve origin_commune | Resolve destination_commune |
| 4 | Địa chỉ | origin_address | destination_address |

Section "Thông tin chi phí" (bảng read-only):

| # | Cột | Sắp xếp | Mô tả |
|---|---|---|---|
| 1 | Mã chi phí | Có (↑↓) | cost.code (resolve từ route_cost.cost_id) |
| 2 | Tên chi phí | Có (↑↓) | cost.name |

##### 3.3.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-RTE-018 | View-only. Edit qua nút "Chỉnh Sửa". |
| BR-RTE-019 | Nơi nhận và Nơi giao hiển thị song song (2 cột cùng hàng). |
| BR-RTE-020 | Tên kho resolve từ origin/destination_warehouse_id. Tỉnh/Xã resolve từ mã. |
| BR-RTE-021 | Xoá = soft delete. Nếu tuyến đang có delivery_order → cảnh báo/chặn. (Confirm PO) |

##### 3.3.5. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/routes/{id} | GET | Chi tiết tuyến kèm costs |
| 2 | /api/v1/routes/{id} | DELETE | Soft delete |

Response GET: Bao gồm costs array với mã + tên chi phí, origin_warehouse_name, destination_warehouse_name.

#### 3.4. Màn hình: Sửa tuyến xe (Edit Route)

Mã yêu cầu: FR-RTE-004 Độ ưu tiên: Must have

##### 3.4.1. Mô tả nghiệp vụ (Business Description)

Chỉnh sửa tuyến xe. Giao diện giống Thêm, pre-fill dữ liệu bao gồm dropdown kho, địa chỉ, và sub-table chi phí đã gán.

##### 3.4.2. Luồng xử lý (User Flow)

Click "Chỉnh Sửa" → form pre-fill. Dropdown kho pre-select (hiển thị "mã - tên"). Sub-table chi phí hiển thị costs đã gán, có thể thêm/xoá. Sửa → "Lưu" → validate → cập nhật → toast.

##### 3.4.3. Đặc tả giao diện

Giống Thêm (mục 3.2.4) với tiêu đề "Sửa tuyến xe", pre-fill dữ liệu.

##### 3.4.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-RTE-022 | Mã tuyến có thể sửa, phải duy nhất. (Confirm PO) |
| BR-RTE-023 | Đổi kho → auto-fill lại địa chỉ (ghi đè). |
| BR-RTE-024 | Sub-table chi phí: chiến lược replace-all — xoá toàn bộ route_cost cũ, insert lại từ cost_ids mới. |
| BR-RTE-025 | modified_at, modified_by cập nhật tự động. search_* regenerate. |

##### 3.4.5. Đặc tả API

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/routes/{id} | PUT | Cập nhật tuyến kèm costs |

Request Body PUT: Giống POST (mục 3.2.6). cost_ids là mảng mới — BE replace-all route_cost.

### 4. YÊU CẦU DỮ LIỆU (Data Requirements)

#### 4.1. Mô hình dữ liệu

[warehouse] 1 ←——— N [route]  (origin_warehouse_id FK)

[warehouse] 1 ←——— N [route]  (destination_warehouse_id FK)

[route] 1 ←——— N [route_cost] (route_id FK)

[cost]  1 ←——— N [route_cost] (cost_id FK)

[route] 1 ←——— N [delivery_order] (route_id FK)

#### 4.2. Từ điển dữ liệu

Bảng: route (đã tồn tại)

| Trường | Kiểu | Bắt buộc | Default | Mô tả |
|---|---|---|---|---|
| id | varchar (PK) | Có | — | UUID |
| tenant_id | varchar | Có | — | ID tenant |
| code | varchar | Có | — | Mã tuyến xe. Unique per tenant. |
| name | varchar | Có | — | Tên tuyến xe |
| length | varchar | Không | NULL | Số km (lưu dạng text, VD: "300") |
| time | varchar | Không | NULL | Thời gian dự kiến (lưu dạng text, VD: "4h") |
| cost | numeric | Có | — | Chi phí tổng (không hiển thị trên UI — cần confirm mục đích) |
| description | varchar | Không | NULL | Mô tả |
| origin_warehouse_id | varchar (FK → warehouse.id) | Không | NULL | Kho xuất phát |
| origin_province | varchar | Không | NULL | Mã tỉnh/TP nơi nhận (denormalize từ kho) |
| origin_commune | varchar | Không | NULL | Mã phường/xã nơi nhận |
| origin_address | varchar | Không | NULL | Địa chỉ chi tiết nơi nhận |
| destination_warehouse_id | varchar (FK → warehouse.id) | Không | NULL | Kho đích |
| destination_province | varchar | Không | NULL | Mã tỉnh/TP nơi giao |
| destination_commune | varchar | Không | NULL | Mã phường/xã nơi giao |
| destination_address | varchar | Không | NULL | Địa chỉ chi tiết nơi giao |
| customer_routes | varchar | Không | NULL | (Không hiển thị trên UI — cần confirm mục đích) |
| search_code | varchar | Có | — | Mã chuẩn hoá |
| search_name | varchar | Có | — | Tên chuẩn hoá |
| search_description | varchar | Không | NULL | Mô tả chuẩn hoá |
| is_active | boolean | Có | true | Trạng thái hoạt động |
| is_deleted | boolean | Có | false | Soft delete |
| created_at | timestamptz | Có | — | Thời điểm tạo |
| created_by | varchar | Không | NULL |  |
| modified_at | timestamptz | Có | — | Thời điểm cập nhật |
| modified_by | varchar | Không | NULL |  |

Bảng: route_cost (bảng trung gian N-N, đã tồn tại)

| Trường | Kiểu | Bắt buộc | Default | Mô tả |
|---|---|---|---|---|
| id | varchar (PK) | Có | — | UUID |
| tenant_id | varchar | Có | — | ID tenant |
| route_id | varchar (FK → route.id) | Có | — | ID tuyến |
| cost_id | varchar (FK → cost.id) | Có | — | ID loại chi phí |
| order_index | bigint | Có | — | Thứ tự hiển thị |
| created_at | timestamptz | Có | — |  |
| created_by | varchar | Không | NULL |  |
| modified_at | timestamptz | Có | — |  |
| modified_by | varchar | Không | NULL |  |

Bảng: cost (master data, quản lý riêng)

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | varchar (PK) | Có | UUID |
| tenant_id | varchar | Có |  |
| code | varchar | Có | Mã chi phí (VD: "CD001") |
| name | varchar | Có | Tên chi phí (VD: "Cầu đường") |
| description | varchar | Không |  |
| is_default | boolean | Có | Chi phí mặc định |
| is_active | boolean | Có |  |
| is_deleted | boolean | Có |  |

#### 4.3. Dữ liệu master & migration

29 tuyến xe hiện tại.

Bảng cost là master data quản lý riêng (module Quỹ).

Địa chỉ tuyến được denormalize từ kho — khi kho cập nhật, tuyến cũ giữ nguyên.

### 5. YÊU CẦU PHI CHỨC NĂNG

| Mã | Nhóm | Yêu cầu | Tiêu chí |
|---|---|---|---|
| NFR-001 | Performance | Load danh sách tuyến (kèm resolve kho + địa chỉ) | ≤ 3 giây (95%) |
| NFR-002 | Performance | API response | ≤ 500ms (P95) |
| NFR-003 | Security | Xác thực & phân quyền | JWT, tenant isolation |
| NFR-004 | Usability | Responsive | Desktop ≥ 1280px |
| NFR-005 | Audit | Logging | Log CRUD |
| NFR-006 | Localization | Ngôn ngữ | Tiếng Việt |

### 6. PHÂN QUYỀN

| Chức năng | Admin | Nhân viên vận hành |
|---|---|---|
| Xem danh sách | ✅ | ✅ |
| Xem chi tiết | ✅ | ✅ |
| Thêm tuyến | ✅ | ✅ |
| Chỉnh sửa | ✅ | ✅ |
| Xoá (soft delete) | ✅ | ❌ |

### 7. TÍCH HỢP HỆ THỐNG

| # | Hệ thống | Hướng | Phương thức | Ghi chú |
|---|---|---|---|---|
| 1 | Module Kho (Warehouse) | Inbound reference | FK origin/destination_warehouse_id | Chọn kho + auto-fill địa chỉ |
| 2 | Module Chi phí (Cost) | Inbound reference | Bảng trung gian route_cost | Gán loại chi phí cho tuyến |
| 3 | Module Đơn hàng (Delivery Order) | Outbound reference | FK route_id | Đơn hàng sử dụng tuyến |
| 4 | API Danh mục hành chính | Outbound (FE) | REST API | Tỉnh/TP, Phường/Xã |

### 9. RỦI RO & VẤN ĐỀ MỞ

| # | Loại | Mô tả | Mức độ | Trạng thái |
|---|---|---|---|---|
| 1 | Open Question | Trường cost (numeric NOT NULL) trên bảng route — không hiển thị trên UI. Mục đích? Default value? (BR-RTE-012) | Medium | Open |
| 2 | Open Question | Trường customer_routes (varchar) — không hiển thị trên UI. Mục đích? | Medium | Open |
| 3 | Open Question | length và time lưu dạng varchar thay vì numeric — có cần migrate sang numeric? Hiện DB có giá trị "300", "4h", "20". (BR-RTE-011) | Medium | Open |
| 4 | Open Question | Khi auto-fill địa chỉ từ kho rồi user override, đổi kho sẽ ghi đè hay giữ? (BR-RTE-008) | Medium | Open |
| 5 | Open Question | Kho nơi nhận và nơi giao có thể là cùng 1 kho không? | Low | Open |
| 6 | Open Question | Xoá tuyến đang có delivery_order: chặn hay cảnh báo? (BR-RTE-021) | High | Open |
| 7 | Open Question | Mã tuyến có cho sửa? (BR-RTE-022) | Medium | Open |
| 8 | Open Question | Danh sách tuyến không có tab trạng thái (Hoạt động/Ngưng hoạt động) và không có toggle trên form — nhưng DB có is_active. Có cần bổ sung tab + toggle? | Medium | Open |
| 9 | Open Question | Chiến lược cập nhật route_cost: replace-all hay upsert? (BR-RTE-024) | Medium | Open |
| 10 | Open Question | Search placeholder "Nhập mã tuyến xe" — có cần mở rộng tìm theo tên tuyến? | Low | Open |