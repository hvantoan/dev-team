## TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

Tên dự án: TMS – Transportation Management System

Module: Quản lý phương tiện (Vehicle Management)

### Lịch sử thay đổi (Revision History)

| Phiên bản | Ngày | Người thực hiện | Nội dung thay đổi |
|---|---|---|---|
| v1.0 | 18/07/2026 | Thư | Khởi tạo tài liệu |

### 1. GIỚI THIỆU (Introduction)

#### 1.1. Mục đích tài liệu

Tài liệu SRS này đặc tả yêu cầu chức năng và phi chức năng cho module Quản lý phương tiện thuộc hệ thống TMS (Transportation Management System).

#### 1.2. Phạm vi hệ thống (Scope)

In-scope:

Màn hình Danh sách phương tiện (Vehicle List) với tab lọc trạng thái

Màn hình Thêm phương tiện (Create Vehicle)

Màn hình Chi tiết phương tiện (Vehicle Detail — view only)

Màn hình Sửa phương tiện (Edit Vehicle)

Xoá phương tiện (soft delete) từ màn Chi tiết

Gán tài xế mặc định cho phương tiện

Tìm kiếm, sắp xếp, bật/tắt trạng thái hoạt động

Out-of-scope:

Quản lý bảo trì / lịch sử sửa chữa xe

Quản lý bảo hiểm / đăng kiểm xe

Theo dõi GPS / vị trí xe realtime

Quản lý nhiên liệu (thuộc module riêng "Nhiên Liệu")

#### 1.3. Tài liệu tham chiếu

| Tài liệu | Link / Vị trí | Ghi chú |
|---|---|---|
| Figma Design | [link] | Màn hình Danh sách, Chi tiết, Thêm & Sửa phương tiện |

### 2. MÔ TẢ TỔNG QUAN (Overall Description)

#### 2.1. Bối cảnh & vấn đề (Business Context)

Trong hệ thống TMS, phương tiện là dữ liệu danh mục đại diện cho xe vận tải. Mỗi phương tiện có thể được gán một tài xế mặc định (driver_id → driver). Phương tiện được tham chiếu trong:

delivery_instruction.vehicle_id — gán xe cho chỉ thị giao hàng.

fuel_issue.vehicle_id — phiếu cấp nhiên liệu.

Thông tin phương tiện bao gồm: mã phương tiện, biển số, loại phương tiện, trọng tải tối đa, tài xế mặc định, mô tả, và trạng thái hoạt động.

Hiện tại hệ thống quản lý 16 phương tiện (tất cả đang hoạt động).

#### 2.2. Đối tượng người dùng (User Personas)

| Vai trò (Role) | Mô tả | Quyền hạn chính |
|---|---|---|
| Admin | Quản trị viên hệ thống TMS | Full quyền: xem, thêm, sửa, xoá, bật/tắt |
| Nhân viên vận hành | Người dùng nghiệp vụ điều xe | Xem, thêm, chỉnh sửa phương tiện |

#### 2.3. Giả định & ràng buộc (Assumptions & Constraints)

Giả định: Mã phương tiện do user nhập, duy nhất per tenant. Biển số xe bắt buộc nhập. Loại phương tiện nhập tự do dạng text (không phải dropdown cố định). Trọng tải tối đa tính bằng tấn, kiểu numeric. Một phương tiện chỉ gán tối đa 1 tài xế mặc định (nullable).

Ràng buộc: Multi-tenant. driver_id là FK tham chiếu sang driver.id — dropdown tài xế chỉ load tài xế đang hoạt động (is_active = true, is_deleted = false) cùng tenant.

Phụ thuộc: Bảng vehicle được tham chiếu bởi delivery_instruction và fuel_issue — cần xử lý khi xoá/vô hiệu hoá xe đang sử dụng.

### 3. YÊU CẦU CHỨC NĂNG (Functional Requirements)

#### 3.1. Màn hình: Danh sách phương tiện (Vehicle List)

Mã yêu cầu: FR-VEH-001 Độ ưu tiên: Must have

##### 3.1.1. Mô tả nghiệp vụ (Business Description)

Hiển thị danh sách phương tiện dưới dạng bảng. Có 3 tab lọc trạng thái, thanh tìm kiếm theo mã/tên phương tiện, sắp xếp theo cột, và nút thêm mới.

Đường dẫn: Sidebar → Vận Hành → [Submenu] → Danh sách phương tiện

##### 3.1.2. User Story

Là nhân viên vận hành, tôi muốn xem danh sách phương tiện với thông tin biển số, loại xe, trạng thái để tra cứu khi gán xe cho chỉ thị giao hàng.

##### 3.1.3. Luồng xử lý (User Flow)

Luồng chính — Xem danh sách:

Truy cập menu Vận Hành → hiển thị "Danh sách phương tiện", tab "Tất cả" mặc định.

Bảng: Ngày tạo, Mã phương tiện, Biển số, Loại phương tiện, Trạng thái. Mặc định created_at DESC.

Luồng phụ — Tab trạng thái: Tất cả | Hoạt động (is_active = true) | Ngưng hoạt động (is_active = false).

Luồng phụ — Tìm kiếm: Nhập vào "Nhập mã, tên phương tiện" → tìm trên search_code và search_plate. Kết hợp AND với tab.

Luồng phụ — Điều hướng: Click "+ Thêm Phương Tiện" → Thêm. Click mã phương tiện (link xanh) → Chi tiết.

Luồng ngoại lệ: Danh sách/tab/search rỗng → empty state.

##### 3.1.4. Đặc tả giao diện (UI Specification)

Tabs lọc trạng thái:

| # | Tab | Mô tả |
|---|---|---|
| 1 | Tất cả | is_deleted = false. Mặc định. |
| 2 | Hoạt động | is_active = true |
| 3 | Ngưng hoạt động | is_active = false |

Thanh tìm kiếm:

| # | Thành phần | Loại | Mô tả |
|---|---|---|---|
| 1 | Nhập mã, tên phương tiện | Search Input | Tìm trên search_code, search_plate. |

Bảng danh sách:

| # | Cột | Kiểu hiển thị | Sắp xếp | Mô tả |
|---|---|---|---|---|
| 1 | Ngày tạo | Text (DD/MM/YYYY + HH:mm dòng dưới) | Có (↑↓) | created_at. Mặc định DESC. |
| 2 | Mã phương tiện | Text (link xanh) | Có (↑↓) | code. Click → Chi tiết. |
| 3 | Biển số | Text | — | plate. Không có icon sort trên screenshot. |
| 4 | Loại phương tiện | Text | — | class. Không sort. |
| 5 | Trạng thái | Badge | — | is_active: "Hoạt động" (xanh lá) / "Ngưng hoạt động" (đỏ/cam). |

Nút hành động:

| # | Nút | Vị trí | Mô tả |
|---|---|---|---|
| 1 | + Thêm Phương Tiện | Góc trên bên phải | Button primary xanh lá. |

##### 3.1.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-VEH-001 | Danh sách chỉ hiển thị is_deleted = false thuộc tenant. |
| BR-VEH-002 | Sắp xếp mặc định created_at DESC. |
| BR-VEH-003 | Tìm kiếm case-insensitive trên search_code và search_plate. Kết hợp AND với tab trạng thái. |

##### 3.1.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/vehicles | GET | Danh sách phương tiện |

Query Params:

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| search | string | Không | Tìm trên search_code, search_plate |
| is_active | boolean | Không | Lọc trạng thái. Không truyền = Tất cả. |
| sort_by | string | Không | created_at, code. Default: created_at |
| sort_order | string | Không | asc/desc. Default: desc |
| page | integer | Không | Default: 1 |
| page_size | integer | Không | Default: 20 |

Error Codes:

| HTTP Code | Error Code | Message | Trường hợp |
|---|---|---|---|
| 401 | ERR_UNAUTHORIZED | Phiên đăng nhập hết hạn | Token không hợp lệ |
| 403 | ERR_FORBIDDEN | Không có quyền truy cập |  |
| 500 | ERR_INTERNAL | Lỗi hệ thống |  |

#### 3.2. Màn hình: Thêm phương tiện (Create Vehicle)

Mã yêu cầu: FR-VEH-002 Độ ưu tiên: Must have

##### 3.2.1. Mô tả nghiệp vụ (Business Description)

Thêm mới phương tiện với 1 section "Thông tin chung": mã phương tiện (bắt buộc), biển số (bắt buộc), loại phương tiện, trọng tải tối đa (tấn), tài xế (dropdown chọn từ danh sách tài xế), mô tả, và toggle cho phép hoạt động.

Đường dẫn: Danh sách phương tiện → "+ Thêm Phương Tiện"

##### 3.2.2. User Story

Là nhân viên vận hành, tôi muốn thêm mới phương tiện với biển số, loại xe, trọng tải, và gán tài xế mặc định để sử dụng xe trong hoạt động vận chuyển.

##### 3.2.3. Luồng xử lý (User Flow)

Luồng chính — Thêm thành công:

Click "+ Thêm Phương Tiện" → form "Thông tin chung".

Nhập bắt buộc: Mã phương tiện, Biển số.

Tuỳ chọn: Loại phương tiện, Trọng tải tối đa, Tài xế (dropdown), Mô tả.

Toggle "Cho phép hoạt động" mặc định ON.

Click "Lưu" → validate → lưu → toast thành công → quay về danh sách.

Luồng phụ — Chọn Tài xế:

Dropdown "Tài xế" load danh sách tài xế đang hoạt động (is_active = true, is_deleted = false) cùng tenant.

Hiển thị tên tài xế. Chọn → lưu driver_id.

Có thể bỏ chọn (để trống) — phương tiện không có tài xế mặc định.

Luồng ngoại lệ:

Mã phương tiện trùng → lỗi validation.

Trường bắt buộc trống → lỗi validation.

##### 3.2.4. Đặc tả giao diện (UI Specification)

Header:

| # | Thành phần | Mô tả |
|---|---|---|
| 1 | Nút quay lại (←) | Quay về danh sách |
| 2 | Tiêu đề | "Thêm phương tiện" |
| 3 | Nút Lưu | Button primary, góc phải. Disable khi chưa hợp lệ. |

Form — Section "Thông tin chung":

| # | Thành phần | Loại | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | Mã phương tiện | Textbox | Có (*) | Unique per tenant. Lưu code + search_code. |
| 2 | Biển số | Textbox | Có (*) | Biển số xe. Lưu plate + search_plate. |
| 3 | Loại phương tiện | Textbox | Không | Nhập tự do (VD: "Xe tải", "Xe cont", "Xe thùng"). Lưu class. |
| 4 | Trọng tải tối đa (tấn) | Number Input | Không | Đơn vị: tấn. Chỉ nhận số ≥ 0. Lưu max_weight (numeric). |
| 5 | Tài xế | Dropdown | Không | Load danh sách tài xế hoạt động. Hiển thị tên tài xế. Lưu driver_id. Cho phép để trống. |
| 6 | Mô tả | Textarea | Không | Multi-line. Lưu description. |
| 7 | Cho phép hoạt động | Toggle Switch | — | Mặc định ON. is_active. |

##### 3.2.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-VEH-004 | Mã phương tiện (code) duy nhất per tenant. |
| BR-VEH-005 | Biển số (plate) bắt buộc, NOT NULL. (Cần confirm: biển số có cần unique per tenant?) |
| BR-VEH-006 | Loại phương tiện (class) nhập tự do dạng text, NOT NULL (có default '' ngầm). DB hiện có giá trị không chuẩn hoá (VD: "Xe cont", "xe cont", " xe cont" có space). (Khuyến nghị: chuẩn hoá hoặc dùng dropdown cố định) |
| BR-VEH-007 | Trọng tải tối đa (max_weight) kiểu numeric, nullable. Nếu nhập thì phải ≥ 0. Đơn vị: tấn. |
| BR-VEH-008 | Dropdown Tài xế chỉ load tài xế có is_active = true AND is_deleted = false cùng tenant. |
| BR-VEH-009 | driver_id nullable — phương tiện có thể không gán tài xế mặc định. |
| BR-VEH-010 | Toggle mặc định ON → is_active = true. |
| BR-VEH-011 | search_code, search_plate tạo tự động (lowercase, bỏ dấu, bỏ khoảng trắng). |
| BR-VEH-012 | tenant_id gán tự động. id = UUID. is_deleted = false. Audit fields tự động. |
| BR-VEH-013 | Nút "Lưu" enable khi Mã phương tiện và Biển số đã điền. |

Validation Errors:

| Mã lỗi | Trường | Điều kiện | Message hiển thị |
|---|---|---|---|
| VE-VEH-001 | Mã phương tiện | Để trống | "Vui lòng nhập mã phương tiện" |
| VE-VEH-002 | Biển số | Để trống | "Vui lòng nhập biển số" |
| VE-VEH-003 | Mã phương tiện | Trùng mã | "Mã phương tiện đã tồn tại" |
| VE-VEH-004 | Trọng tải tối đa | Giá trị < 0 | "Trọng tải phải lớn hơn hoặc bằng 0" |

##### 3.2.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/vehicles | POST | Tạo mới phương tiện |
| 2 | /api/v1/drivers?is_active=true&page_size=1000 | GET | Load danh sách tài xế cho dropdown |

Error Codes:

| HTTP Code | Error Code | Message | Trường hợp |
|---|---|---|---|
| 400 | ERR_VALIDATION | Dữ liệu không hợp lệ | Thiếu code/plate, max_weight < 0 |
| 409 | ERR_DUPLICATE_CODE | Mã phương tiện đã tồn tại | Trùng code |
| 401 | ERR_UNAUTHORIZED | Phiên đăng nhập hết hạn | Token không hợp lệ |
| 500 | ERR_INTERNAL | Lỗi hệ thống |  |

Lưu ý cho BE:

Validate driver_id (nếu có) phải tồn tại, is_active = true, is_deleted = false, cùng tenant.

class NOT NULL — nếu user không nhập, FE gửi chuỗi rỗng "".

search_plate nên bỏ khoảng trắng + lowercase: "60H 03844" → "60h03844" để search "60h03844" hoặc "60H 03844" đều match.

#### 3.3. Màn hình: Chi tiết phương tiện (Vehicle Detail)

Mã yêu cầu: FR-VEH-003 Độ ưu tiên: Must have

##### 3.3.1. Mô tả nghiệp vụ (Business Description)

Hiển thị chi tiết phương tiện ở chế độ view-only. Từ đây có thể chuyển sang chỉnh sửa hoặc xoá.

Đường dẫn: Danh sách → Click mã phương tiện → Chi tiết phương tiện

##### 3.3.2. User Story

Là nhân viên vận hành, tôi muốn xem đầy đủ thông tin phương tiện bao gồm tài xế được gán để xác minh trước khi sử dụng trong chỉ thị giao hàng.

##### 3.3.3. Luồng xử lý (User Flow)

Luồng chính: Click mã → API lấy chi tiết → hiển thị. Header: mã PT + badge trạng thái. Section "Thông tin chung": label-value.

Luồng phụ: Click "Chỉnh Sửa" → Sửa. Click nút xoá → dialog xác nhận → soft delete → danh sách.

Luồng ngoại lệ: Phương tiện không tồn tại → thông báo lỗi.

##### 3.3.4. Đặc tả giao diện (UI Specification)

Header:

| # | Thành phần | Mô tả |
|---|---|---|
| 1 | Nút quay lại (←) | Quay về danh sách |
| 2 | Tiêu đề | "Chi tiết phương tiện" |
| 3 | Nút xoá | Icon thùng rác, nền cam |
| 4 | Nút Chỉnh Sửa | Button secondary, icon bút chì |

Sub-header: Mã phương tiện (bold) + Badge trạng thái.

Section "Thông tin chung" (label-value):

| # | Label | Giá trị | Mô tả |
|---|---|---|---|
| 1 | Mã phương tiện | code | VD: "PT-03" |
| 2 | Biển số | plate | VD: "67K19202837" |
| 3 | Loại phương tiện | class | VD: "Xe". Trống nếu rỗng. |
| 4 | Trọng tải tối đa | max_weight + "(tấn)" | VD: "0(tấn)". Nếu null → trống. |
| 5 | Tài xế | Tên tài xế (resolve từ driver_id) | Trống nếu null. |
| 6 | Mô tả | description | Trống nếu null/rỗng. |

##### 3.3.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-VEH-014 | View-only. Chuyển edit qua "Chỉnh Sửa". |
| BR-VEH-015 | Badge: "Hoạt động" (xanh) / "Ngưng hoạt động" (đỏ/cam). |
| BR-VEH-016 | Tài xế hiển thị tên (resolve từ driver_id). Nếu driver_id = null → hiển thị trống. |
| BR-VEH-017 | Trọng tải hiển thị kèm đơn vị "(tấn)". |
| BR-VEH-018 | Xoá = soft delete (is_deleted = true). |
| BR-VEH-019 | Nếu phương tiện đang tham chiếu bởi delivery_instruction hoặc fuel_issue → cảnh báo hoặc chặn xoá. (Confirm PO) |

##### 3.3.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/vehicles/{id} | GET | Chi tiết phương tiện |
| 2 | /api/v1/vehicles/{id} | DELETE | Soft delete |

Error Codes (DELETE):

| HTTP Code | Error Code | Message | Trường hợp |
|---|---|---|---|
| 404 | ERR_NOT_FOUND | Phương tiện không tồn tại |  |
| 409 | ERR_IN_USE | Phương tiện đang được sử dụng | Tham chiếu bởi DI/fuel_issue (nếu chặn) |
| 401 | ERR_UNAUTHORIZED | Phiên đăng nhập hết hạn |  |
| 500 | ERR_INTERNAL | Lỗi hệ thống |  |

#### 3.4. Màn hình: Sửa phương tiện (Edit Vehicle)

Mã yêu cầu: FR-VEH-004 Độ ưu tiên: Must have

##### 3.4.1. Mô tả nghiệp vụ (Business Description)

Chỉnh sửa thông tin phương tiện. Giao diện giống Thêm, pre-fill dữ liệu hiện tại.

Đường dẫn: Chi tiết phương tiện → "Chỉnh Sửa"

##### 3.4.2. User Story

Là nhân viên vận hành, tôi muốn chỉnh sửa thông tin phương tiện, đổi tài xế mặc định, hoặc tắt hoạt động để cập nhật khi có thay đổi.

##### 3.4.3. Luồng xử lý (User Flow)

Luồng chính: Click "Chỉnh Sửa" → form pre-fill. Dropdown Tài xế pre-select tài xế hiện tại (nếu có). Sửa → "Lưu" → validate → cập nhật → toast → quay về Chi tiết.

Luồng phụ — Đổi/gỡ tài xế: Chọn tài xế khác hoặc bỏ chọn (clear dropdown) → driver_id = null.

Luồng phụ — Tắt hoạt động: Toggle OFF → cảnh báo nếu xe đang dùng trong DI/fuel_issue.

##### 3.4.4. Đặc tả giao diện (UI Specification)

Giống Thêm phương tiện (mục 3.2.4) với:

| # | Khác biệt | Mô tả |
|---|---|---|
| 1 | Tiêu đề | "Sửa phương tiện" |
| 2 | Dữ liệu | Pre-fill từ hiện tại |
| 3 | Dropdown Tài xế | Pre-select tài xế đang gán (nếu có) |
| 4 | Toggle | Phản ánh is_active hiện tại |

##### 3.4.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-VEH-020 | Mã phương tiện có thể sửa, phải duy nhất. (Confirm PO — khoá mã?) |
| BR-VEH-021 | Khi tắt hoạt động xe đang dùng trong DI/fuel_issue → cảnh báo. (Confirm PO) |
| BR-VEH-022 | Dropdown Tài xế: nếu tài xế hiện tại đã bị is_active = false → vẫn hiển thị (pre-select) nhưng đánh dấu "(Ngưng hoạt động)". (Confirm PO — hay ẩn luôn?) |
| BR-VEH-023 | modified_at, modified_by cập nhật tự động. search_* regenerate. |

##### 3.4.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/vehicles/{id} | PUT | Cập nhật phương tiện |

Error Codes:

| HTTP Code | Error Code | Message | Trường hợp |
|---|---|---|---|
| 400 | ERR_VALIDATION | Dữ liệu không hợp lệ | Thiếu bắt buộc, max_weight < 0 |
| 404 | ERR_NOT_FOUND | Phương tiện không tồn tại |  |
| 409 | ERR_DUPLICATE_CODE | Mã phương tiện đã tồn tại | Trùng code |
| 401 | ERR_UNAUTHORIZED | Phiên đăng nhập hết hạn |  |
| 500 | ERR_INTERNAL | Lỗi hệ thống |  |

### 4. YÊU CẦU DỮ LIỆU (Data Requirements)

#### 4.1. Mô hình dữ liệu (Data Model)

[driver] 1 ←——— N [vehicle]                (driver_id FK)

[vehicle] 1 ←——— N [delivery_instruction]   (vehicle_id FK)

[vehicle] 1 ←——— N [fuel_issue]             (vehicle_id FK)

#### 4.2. Từ điển dữ liệu (Data Dictionary)

Bảng: vehicle (đã tồn tại)

| Trường | Kiểu dữ liệu | Bắt buộc | Default | Mô tả |
|---|---|---|---|---|
| id | varchar (PK) | Có | — | UUID |
| tenant_id | varchar | Có | — | ID tenant |
| code | varchar | Có | — | Mã phương tiện. Unique per tenant. |
| plate | varchar | Có | — | Biển số xe |
| class | varchar | Có | — | Loại phương tiện (nhập tự do: "Xe tải", "Xe cont", "Xe thùng"...) |
| description | varchar | Không | NULL | Mô tả |
| max_weight | numeric | Không | NULL | Trọng tải tối đa (tấn) |
| driver_id | varchar (FK → driver.id) | Không | NULL | Tài xế mặc định được gán cho xe |
| search_code | varchar | Có | — | Mã chuẩn hoá tìm kiếm |
| search_plate | varchar | Có | — | Biển số chuẩn hoá tìm kiếm |
| is_active | boolean | Có | true | Trạng thái hoạt động |
| is_deleted | boolean | Có | false | Soft delete flag |
| created_at | timestamptz | Có | — | Thời điểm tạo |
| created_by | varchar | Không | NULL | User tạo |
| modified_at | timestamptz | Có | — | Thời điểm cập nhật |
| modified_by | varchar | Không | NULL | User cập nhật |

### 5. YÊU CẦU PHI CHỨC NĂNG (Non-Functional Requirements)

| Mã | Nhóm | Yêu cầu | Tiêu chí đo lường |
|---|---|---|---|
| NFR-001 | Performance | Load danh sách phương tiện | ≤ 2 giây (95% request) |
| NFR-002 | Performance | Response time API | ≤ 500ms (P95) |
| NFR-003 | Security | Xác thực & phân quyền | JWT, role-based, data isolation per tenant |
| NFR-004 | Usability | Responsive | Desktop (≥ 1280px) |
| NFR-005 | Compatibility | Trình duyệt | Chrome, Edge (2 phiên bản gần nhất) |
| NFR-006 | Audit | Logging | Log Create / Update / Delete |
| NFR-007 | Localization | Ngôn ngữ | Tiếng Việt |