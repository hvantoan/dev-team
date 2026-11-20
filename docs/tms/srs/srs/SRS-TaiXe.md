## TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

Tên dự án: TMS – Transportation Management System

Module: Quản lý tài xế (Driver Management)

### Lịch sử thay đổi (Revision History)

| Phiên bản | Ngày | Người thực hiện | Nội dung thay đổi |
|---|---|---|---|
| v1.0 | 18/07/2026 | Thư | Khởi tạo tài liệu |

### 1. GIỚI THIỆU (Introduction)

#### 1.1. Mục đích tài liệu

Tài liệu SRS này đặc tả yêu cầu chức năng và phi chức năng cho module Quản lý tài xế thuộc hệ thống TMS (Transportation Management System). Tài liệu là cơ sở cho team Dev (FE/BE), QC và các bên liên quan trong quá trình phát triển, kiểm thử và nghiệm thu.

#### 1.2. Phạm vi hệ thống (Scope)

In-scope:

Màn hình Danh sách tài xế (Driver List) với tab lọc trạng thái

Màn hình Thêm tài xế (Create Driver) gồm 3 section: thông tin chung, liên hệ, giấy phép lái xe

Màn hình Chi tiết tài xế (Driver Detail — view only)

Màn hình Sửa tài xế (Edit Driver)

Xoá tài xế (soft delete) từ màn Chi tiết

Upload hình ảnh giấy phép lái xe

Tìm kiếm, sắp xếp, bật/tắt trạng thái hoạt động

Out-of-scope:

Quản lý lịch trình / chuyến đi của tài xế

Chấm công / quản lý ca làm việc tài xế

Theo dõi GPS / vị trí tài xế realtime

Đào tạo / chứng chỉ bổ sung ngoài GPLX

#### 1.3. Tài liệu tham chiếu

| Tài liệu | Link / Vị trí | Ghi chú |
|---|---|---|
| Figma Design | [link] | Màn hình Danh sách, Chi tiết, Thêm & Sửa tài xế |

### 2. MÔ TẢ TỔNG QUAN (Overall Description)

#### 2.1. Bối cảnh & vấn đề (Business Context)

Trong hệ thống TMS, tài xế là dữ liệu danh mục (master data) đại diện cho người lái xe thực hiện vận chuyển. Tài xế được tham chiếu trong:

vehicle.driver_id — gán tài xế mặc định cho xe.

dispatch_order.driver_id — gán tài xế cho lệnh điều xe cụ thể.

Thông tin tài xế bao gồm 3 nhóm: thông tin cá nhân (tên, CCCD, ngày sinh), thông tin liên hệ (SĐT, địa chỉ), và thông tin giấy phép lái xe (hạng, số giấy phép, ngày cấp/hết hạn, hình ảnh đính kèm). Hình ảnh GPLX được lưu qua bảng item_image.

Hiện tại hệ thống đang quản lý 9 tài xế (tất cả đang hoạt động).

#### 2.2. Đối tượng người dùng (User Personas)

| Vai trò (Role) | Mô tả | Quyền hạn chính |
|---|---|---|
| Admin | Quản trị viên hệ thống TMS | Full quyền: xem, thêm, sửa, xoá, bật/tắt trạng thái |
| Nhân viên vận hành | Người dùng nghiệp vụ điều xe | Xem, thêm, chỉnh sửa tài xế |

#### 2.3. Giả định & ràng buộc (Assumptions & Constraints)

Giả định: Mã tài xế do người dùng tự nhập, duy nhất per tenant. Thông tin giấy phép lái xe (hạng, số, ngày cấp, ngày hết hạn) là bắt buộc khi tạo/sửa tài xế. Hạng GPLX nhập tự do dạng text (VD: "C1", "FC", "E,FC").

Ràng buộc: Multi-tenant. Hình ảnh GPLX lưu URL trên storage, metadata qua bảng item_image liên kết item_id = driver.id. province/commune lưu mã hành chính.

Phụ thuộc: Bảng driver được tham chiếu bởi vehicle và dispatch_order — cần xử lý khi xoá/vô hiệu hoá tài xế đang gắn với xe hoặc lệnh điều xe.

### 3. YÊU CẦU CHỨC NĂNG (Functional Requirements)

#### 3.1. Màn hình: Danh sách tài xế (Driver List)

Mã yêu cầu: FR-DRV-001 Độ ưu tiên: Must have

##### 3.1.1. Mô tả nghiệp vụ (Business Description)

Màn hình hiển thị danh sách tài xế dưới dạng bảng. Có 3 tab lọc trạng thái (Tất cả, Hoạt động, Ngưng hoạt động), thanh tìm kiếm theo mã/tên, sắp xếp theo cột, phân trang, và nút thêm mới.

Đường dẫn: Sidebar → Vận Hành → [Submenu] → Danh sách tài xế

##### 3.1.2. User Story

Là nhân viên vận hành, tôi muốn xem danh sách tài xế, lọc theo trạng thái, và tìm kiếm nhanh để tra cứu khi cần gán tài xế cho xe hoặc lệnh điều xe.

##### 3.1.3. Luồng xử lý (User Flow)

Luồng chính — Xem danh sách:

Truy cập menu Vận Hành → hệ thống hiển thị "Danh sách tài xế", tab "Tất cả" mặc định.

Bảng hiển thị: Ngày tạo, Mã tài xế, Họ và tên, Trạng thái. Sắp xếp mặc định created_at DESC.

Luồng phụ — Tab trạng thái:

Tab "Hoạt động" → is_active = true.

Tab "Ngưng hoạt động" → is_active = false.

Tab "Tất cả" → toàn bộ.

Luồng phụ — Tìm kiếm:

Nhập từ khoá vào "Nhập mã, tên tài xế" → tìm trên search_code và search_name.

Kết hợp AND với tab trạng thái đang chọn.

Luồng phụ — Điều hướng:

Click "+ Thêm Tài Xế" → màn hình Thêm tài xế.

Click mã tài xế (link xanh) → màn hình Chi tiết tài xế.

Luồng ngoại lệ:

Danh sách / tab / search rỗng → empty state.

##### 3.1.4. Đặc tả giao diện (UI Specification)

Tabs lọc trạng thái:

| # | Tab | Mô tả |
|---|---|---|
| 1 | Tất cả | Toàn bộ tài xế (is_deleted = false). Mặc định. |
| 2 | Hoạt động | is_active = true |
| 3 | Ngưng hoạt động | is_active = false |

Thanh tìm kiếm:

| # | Thành phần | Loại | Mô tả |
|---|---|---|---|
| 1 | Nhập mã, tên tài xế | Search Input | Placeholder: "Nhập mã, tên tài xế". Tìm trên search_code, search_name. |

Bảng danh sách:

| # | Cột | Kiểu hiển thị | Sắp xếp | Mô tả |
|---|---|---|---|---|
| 1 | Ngày tạo | Text (DD/MM/YYYY + HH:mm dòng dưới) | Có (↑↓) | created_at. Mặc định DESC. |
| 2 | Mã tài xế | Text (link xanh) | Có (↑↓) | code. Click → Chi tiết. |
| 3 | Họ và tên | Text | Có (↑↓) | name |
| 4 | Trạng thái | Badge | — | is_active: true → "Hoạt động" (xanh lá), false → "Ngưng hoạt động" (đỏ/cam). Cột này không có icon sort trên screenshot. |

Phân trang:

| # | Thành phần | Mô tả |
|---|---|---|
| 1 | Số dòng mỗi trang | Dropdown chọn số bản ghi: 20 (mặc định), có thể 10/50/100. |
| 2 | Điều hướng trang | Nút Previous (<) / Next (>), hiển thị số trang hiện tại. |

Nút hành động:

| # | Nút | Vị trí | Mô tả |
|---|---|---|---|
| 1 | + Thêm Tài Xế | Góc trên bên phải | Button primary xanh lá. |

##### 3.1.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-DRV-001 | Danh sách chỉ hiển thị tài xế is_deleted = false thuộc tenant hiện tại. |
| BR-DRV-002 | Sắp xếp mặc định created_at DESC. |
| BR-DRV-003 | Tìm kiếm case-insensitive trên search_code và search_name. Kết hợp AND với tab trạng thái. |
| BR-DRV-004 | Phân trang mặc định 20 dòng/trang, có thể thay đổi. |

##### 3.1.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/drivers | GET | Danh sách tài xế |

Query Params:

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| search | string | Không | Tìm trên search_code, search_name |
| is_active | boolean | Không | Lọc trạng thái. Không truyền = Tất cả. |
| sort_by | string | Không | created_at, code, name. Default: created_at |
| sort_order | string | Không | asc/desc. Default: desc |
| page | integer | Không | Default: 1 |
| page_size | integer | Không | Default: 20 |

Error Codes:

| HTTP Code | Error Code | Message | Trường hợp |
|---|---|---|---|
| 401 | ERR_UNAUTHORIZED | Phiên đăng nhập hết hạn | Token không hợp lệ |
| 403 | ERR_FORBIDDEN | Không có quyền truy cập | Không có quyền xem tài xế |
| 500 | ERR_INTERNAL | Lỗi hệ thống | Lỗi server |

#### 3.2. Màn hình: Thêm tài xế (Create Driver)

Mã yêu cầu: FR-DRV-002 Độ ưu tiên: Must have

##### 3.2.1. Mô tả nghiệp vụ (Business Description)

Màn hình thêm mới tài xế với 3 section: Thông tin chung (mã, tên, CCCD, ngày sinh, mô tả, toggle hoạt động), Thông tin liên hệ (SĐT, tỉnh/TP, phường/xã, địa chỉ), và Thông tin giấy phép (hạng, số giấy phép, ngày cấp, ngày hết hạn, upload hình ảnh).

Đường dẫn: Danh sách tài xế → "+ Thêm Tài Xế"

##### 3.2.2. User Story

Là nhân viên vận hành, tôi muốn thêm mới tài xế với đầy đủ thông tin cá nhân, liên hệ, và giấy phép lái xe để gán tài xế cho xe và lệnh điều xe.

##### 3.2.3. Luồng xử lý (User Flow)

Luồng chính — Thêm thành công:

Click "+ Thêm Tài Xế" → hiển thị form 3 section.

Nhập trường bắt buộc: Mã tài xế, Họ và tên, Căn cước công dân, Hạng (GPLX), Số giấy phép, Ngày cấp, Ngày hết hạn.

Tuỳ chọn: Ngày sinh, Mô tả, SĐT, Tỉnh/TP, Phường/Xã, Địa chỉ, Upload hình GPLX.

Toggle "Cho phép hoạt động" mặc định ON.

Click "Lưu" → validate → lưu driver + upload hình (nếu có) → toast thành công → quay về danh sách.

Luồng phụ — Upload hình GPLX:

Tại section "Thông tin giấy phép", có khu vực upload hình (bên dưới các trường ngày).

Người dùng click chọn file hoặc kéo thả → preview ảnh hiển thị.

Hỗ trợ upload nhiều hình (mặt trước, mặt sau GPLX).

Hình được upload lên storage → lưu metadata vào item_image với item_id = driver.id.

Luồng phụ — Cascade Tỉnh/TP → Phường/Xã:

Chọn tỉnh → load phường/xã. Đổi tỉnh → reset phường/xã.

Luồng ngoại lệ:

Mã tài xế trùng → lỗi validation.

Trường bắt buộc trống → lỗi validation.

Ngày hết hạn GPLX ≤ ngày cấp → lỗi validation.

Upload hình thất bại → toast lỗi, cho phép thử lại.

##### 3.2.4. Đặc tả giao diện (UI Specification)

Section 1 — "Thông tin chung":

| # | Thành phần | Loại | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | Mã tài xế | Textbox | Có (*) | Unique per tenant. Lưu code + search_code. |
| 2 | Ngày sinh | Date Picker | Không | Format DD/MM/YYYY. Icon lịch bên phải. Lưu birthday. |
| 3 | Họ và tên | Textbox | Có (*) | Lưu name + search_name. |
| 4 | Căn cước công dân | Textbox | Có (*) | Placeholder: "Căn cước công dân". Lưu identity_number + search_identity_number. |
| 5 | Mô tả | Textarea | Không | Multi-line. Lưu description. |
| 6 | Cho phép hoạt động | Toggle Switch | — | Mặc định ON. is_active = true/false. |

Section 2 — "Thông tin liên hệ":

| # | Thành phần | Loại | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | Số điện thoại | Textbox | Không | Lưu phone + search_phone. |
| 2 | Tỉnh/Thành Phố | Dropdown | Không | Mã hành chính → province. |
| 3 | Phường/Xã | Dropdown | Không | Cascade từ tỉnh → commune. |
| 4 | Địa chỉ | Textarea | Không | Lưu address. |

Section 3 — "Thông tin giấy phép":

| # | Thành phần | Loại | Bắt buộc | Mô tả |
|---|---|---|---|---|
| 1 | Hạng | Textbox | Có (*) | Hạng GPLX (VD: "C1", "FC", "E,FC"). Nhập tự do dạng text. Lưu license_class. |
| 2 | Số giấy phép | Textbox | Có (*) | Số GPLX. Lưu license_number. |
| 3 | Ngày cấp | Date Picker | Có (*) | Format DD/MM/YYYY. Icon lịch. Lưu license_date. |
| 4 | Ngày hết hạn | Date Picker | Có (*) | Format DD/MM/YYYY. Icon lịch. Lưu license_expiration_date. Phải > Ngày cấp. |
| 5 | Hình đính kèm | Image Upload | Không | Upload hình GPLX (mặt trước/sau). Hỗ trợ nhiều hình. Lưu vào item_image. |

##### 3.2.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-DRV-005 | Mã tài xế (code) là duy nhất trong cùng tenant. |
| BR-DRV-006 | Toggle "Cho phép hoạt động" mặc định ON → is_active = true. |
| BR-DRV-007 | Ngày hết hạn GPLX (license_expiration_date) phải sau ngày cấp (license_date). |
| BR-DRV-008 | Hạng GPLX (license_class) nhập tự do dạng text. DB hiện có: "A1", "C1", "FC", "E,FC". (Cần confirm: nên dùng dropdown cố định hay textbox tự do?) |
| BR-DRV-009 | Hình đính kèm GPLX lưu vào bảng item_image với item_id = driver.id. Hỗ trợ upload nhiều hình. |
| BR-DRV-010 | Cascade Tỉnh/TP → Phường/Xã. province/commune lưu mã hành chính. |
| BR-DRV-011 | search_code, search_name, search_identity_number, search_phone tạo tự động (lowercase, bỏ dấu). |
| BR-DRV-012 | tenant_id gán tự động. id = UUID. is_deleted = false. Audit fields ghi tự động. |
| BR-DRV-013 | phone và description có default '' trong DB (NOT NULL) — FE gửi chuỗi rỗng nếu user không nhập. |
| BR-DRV-014 | Nút "Lưu" enable khi: Mã tài xế, Họ và tên, Căn cước công dân, Hạng, Số giấy phép, Ngày cấp, Ngày hết hạn đã điền. |

Validation Errors:

| Mã lỗi | Trường | Điều kiện | Message hiển thị |
|---|---|---|---|
| VE-DRV-001 | Mã tài xế | Để trống | "Vui lòng nhập mã tài xế" |
| VE-DRV-002 | Họ và tên | Để trống | "Vui lòng nhập họ và tên" |
| VE-DRV-003 | Căn cước công dân | Để trống | "Vui lòng nhập số căn cước công dân" |
| VE-DRV-004 | Hạng | Để trống | "Vui lòng nhập hạng giấy phép" |
| VE-DRV-005 | Số giấy phép | Để trống | "Vui lòng nhập số giấy phép" |
| VE-DRV-006 | Ngày cấp | Chưa chọn | "Vui lòng chọn ngày cấp" |
| VE-DRV-007 | Ngày hết hạn | Chưa chọn | "Vui lòng chọn ngày hết hạn" |
| VE-DRV-008 | Ngày hết hạn | ≤ Ngày cấp | "Ngày hết hạn phải sau ngày cấp" |
| VE-DRV-009 | Mã tài xế | Trùng mã | "Mã tài xế đã tồn tại" |

##### 3.2.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/drivers | POST | Tạo mới tài xế |
| 2 | /api/v1/drivers/{id}/images | POST | Upload hình GPLX |
| 3 | /api/v1/locations/provinces | GET | Danh sách tỉnh/TP |
| 4 | /api/v1/locations/communes?province={code} | GET | Phường/xã theo tỉnh |

Error Codes:

| HTTP Code | Error Code | Message | Trường hợp |
|---|---|---|---|
| 400 | ERR_VALIDATION | Dữ liệu không hợp lệ | Thiếu trường bắt buộc, ngày hết hạn ≤ ngày cấp |
| 409 | ERR_DUPLICATE_CODE | Mã tài xế đã tồn tại | Trùng code |
| 401 | ERR_UNAUTHORIZED | Phiên đăng nhập hết hạn | Token không hợp lệ |
| 413 | ERR_FILE_TOO_LARGE | File quá lớn | Ảnh vượt giới hạn dung lượng |
| 500 | ERR_INTERNAL | Lỗi hệ thống | Lỗi server |

Lưu ý cho BE:

phone và description là NOT NULL với default '' — nếu FE không gửi, BE set ''.

license_class và license_number là NOT NULL không có default — phải validate bắt buộc.

Upload hình có thể tách thành step riêng (sau khi tạo driver) hoặc gộp trong cùng request (multipart). Tuỳ thiết kế BE.

Validate license_expiration_date > license_date ở cả FE và BE.

#### 3.3. Màn hình: Chi tiết tài xế (Driver Detail)

Mã yêu cầu: FR-DRV-003 Độ ưu tiên: Must have

##### 3.3.1. Mô tả nghiệp vụ (Business Description)

Màn hình hiển thị chi tiết tài xế ở chế độ view-only với 3 section tương ứng. Section Thông tin giấy phép bao gồm preview hình ảnh GPLX đã upload.

Đường dẫn: Danh sách → Click mã tài xế → Chi tiết tài xế

##### 3.3.2. User Story

Là nhân viên vận hành, tôi muốn xem đầy đủ thông tin tài xế bao gồm hình ảnh giấy phép để xác minh thông tin trước khi gán vào lệnh điều xe.

##### 3.3.3. Luồng xử lý (User Flow)

Luồng chính — Xem chi tiết:

Click mã tài xế → gọi API lấy chi tiết (kèm images).

Header: mã tài xế + badge trạng thái.

Section "Thông tin chung": Tên, Số CMND/CCCD, Ngày sinh, Mô tả.

Section "Thông tin liên hệ": SĐT, Tỉnh/TP, Phường/Xã, Địa chỉ.

Section "Thông tin giấy phép lái xe": Hạng, Số giấy phép, Ngày cấp, Ngày hết hạn, Hình đính kèm (preview thumbnail).

Luồng phụ:

Click "Chỉnh Sửa" → màn hình Sửa tài xế.

Click nút xoá → dialog xác nhận → soft delete → quay về danh sách.

Click hình GPLX → xem phóng to (lightbox).

Luồng ngoại lệ:

Tài xế không tồn tại → thông báo lỗi.

##### 3.3.4. Đặc tả giao diện (UI Specification)

Header:

| # | Thành phần | Mô tả |
|---|---|---|
| 1 | Nút quay lại (←) | Quay về danh sách |
| 2 | Tiêu đề | "Chi tiết tài xế" |
| 3 | Nút xoá | Icon thùng rác, nền cam |
| 4 | Nút Chỉnh Sửa | Button secondary, icon bút chì |

Sub-header: Mã tài xế (bold) + Badge trạng thái.

Section "Thông tin chung" (label-value):

| # | Label | Giá trị | Mô tả |
|---|---|---|---|
| 1 | Tên | name |  |
| 2 | Số CMND/CCCD | identity_number |  |
| 3 | Ngày sinh | birthday (DD/MM/YYYY) | Trống nếu null |
| 4 | Mô tả | description | Trống nếu rỗng |

Section "Thông tin liên hệ" (label-value):

| # | Label | Giá trị | Mô tả |
|---|---|---|---|
| 1 | Số điện thoại | phone | Trống nếu rỗng |
| 2 | Tỉnh/Thành phố | Resolve từ province | Trống nếu null |
| 3 | Phường/Xã | Resolve từ commune | Trống nếu null |
| 4 | Địa chỉ | address | Trống nếu null |

Section "Thông tin giấy phép lái xe" (label-value + hình):

| # | Label | Giá trị | Mô tả |
|---|---|---|---|
| 1 | Hạng | license_class | VD: "FC", "C1" |
| 2 | Số giấy phép | license_number |  |
| 3 | Ngày cấp | license_date (DD/MM/YYYY) |  |
| 4 | Ngày hết hạn | license_expiration_date (DD/MM/YYYY) |  |
| 5 | Hình đính kèm | Thumbnail images | Load từ item_image WHERE item_id = driver.id. Click → lightbox xem phóng to. |

##### 3.3.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-DRV-015 | View-only. Chuyển edit qua nút "Chỉnh Sửa". |
| BR-DRV-016 | Badge trạng thái: "Hoạt động" (xanh) / "Ngưng hoạt động" (đỏ/cam). |
| BR-DRV-017 | Tỉnh/TP, Phường/Xã hiển thị tên (resolve từ mã). |
| BR-DRV-018 | Xoá tài xế = soft delete (is_deleted = true). |
| BR-DRV-019 | Nếu tài xế đang gắn với vehicle hoặc dispatch_order, hệ thống cần cảnh báo hoặc chặn xoá. (Cần confirm PO) |
| BR-DRV-020 | Hình GPLX hiển thị thumbnail. Click → lightbox/fullscreen. |

##### 3.3.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/drivers/{id} | GET | Chi tiết tài xế kèm images |
| 2 | /api/v1/drivers/{id} | DELETE | Soft delete |

Error Codes (DELETE):

| HTTP Code | Error Code | Message | Trường hợp |
|---|---|---|---|
| 404 | ERR_NOT_FOUND | Tài xế không tồn tại | ID không tồn tại hoặc đã xoá |
| 409 | ERR_IN_USE | Tài xế đang được sử dụng | Đang gắn với vehicle/dispatch_order (nếu chặn) |
| 401 | ERR_UNAUTHORIZED | Phiên đăng nhập hết hạn | Token không hợp lệ |
| 500 | ERR_INTERNAL | Lỗi hệ thống | Lỗi server |

#### 3.4. Màn hình: Sửa tài xế (Edit Driver)

Mã yêu cầu: FR-DRV-004 Độ ưu tiên: Must have

##### 3.4.1. Mô tả nghiệp vụ (Business Description)

Cho phép chỉnh sửa thông tin tài xế. Giao diện giống Thêm tài xế, pre-fill dữ liệu hiện tại, bao gồm hình GPLX đã upload (có thể xoá/thêm hình).

Đường dẫn: Chi tiết tài xế → "Chỉnh Sửa"

##### 3.4.2. User Story

Là nhân viên vận hành, tôi muốn chỉnh sửa thông tin tài xế, cập nhật giấy phép khi gia hạn, và thay đổi trạng thái để đảm bảo dữ liệu luôn chính xác.

##### 3.4.3. Luồng xử lý (User Flow)

Luồng chính — Chỉnh sửa thành công:

Click "Chỉnh Sửa" từ Chi tiết → form pre-fill toàn bộ, bao gồm hình GPLX hiện có.

Chỉnh sửa các trường, thêm/xoá hình.

Click "Lưu" → validate → cập nhật → toast thành công → quay về Chi tiết.

Luồng phụ — Quản lý hình:

Hình hiện có hiển thị thumbnail với nút xoá (x).

Click nút xoá → xoá hình khỏi danh sách (xoá item_image tương ứng khi lưu).

Có thể upload hình mới bổ sung.

Luồng phụ — Tắt hoạt động:

Toggle OFF → is_active = false. Cần cảnh báo nếu tài xế đang gắn với vehicle/dispatch_order.

##### 3.4.4. Đặc tả giao diện (UI Specification)

Giống hệt Thêm tài xế (mục 3.2.4) với:

| # | Khác biệt | Mô tả |
|---|---|---|
| 1 | Tiêu đề | "Sửa tài xế" |
| 2 | Dữ liệu form | Pre-fill từ dữ liệu hiện tại |
| 3 | Hình GPLX | Hiển thị hình đã upload (thumbnail + nút xoá). Có thể thêm mới. |
| 4 | Toggle | Phản ánh is_active hiện tại |

##### 3.4.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-DRV-021 | Mã tài xế có thể sửa, phải duy nhất. (Confirm PO — khoá mã?) |
| BR-DRV-022 | Khi tắt hoạt động tài xế đang gắn vehicle/dispatch_order → cảnh báo. (Confirm PO) |
| BR-DRV-023 | Hình GPLX: xoá hình cũ → xoá record item_image. Thêm hình mới → tạo record mới. |
| BR-DRV-024 | modified_at, modified_by cập nhật tự động. search_* regenerate. |

##### 3.4.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/drivers/{id} | PUT | Cập nhật tài xế |
| 2 | /api/v1/drivers/{id}/images | POST | Upload hình mới |
| 3 | /api/v1/drivers/{id}/images/{imageId} | DELETE | Xoá hình |

Error Codes:

| HTTP Code | Error Code | Message | Trường hợp |
|---|---|---|---|
| 400 | ERR_VALIDATION | Dữ liệu không hợp lệ | Thiếu bắt buộc, ngày hết hạn ≤ ngày cấp |
| 404 | ERR_NOT_FOUND | Tài xế không tồn tại | ID không tồn tại/đã xoá |
| 409 | ERR_DUPLICATE_CODE | Mã tài xế đã tồn tại | Trùng code |
| 401 | ERR_UNAUTHORIZED | Phiên đăng nhập hết hạn | Token không hợp lệ |
| 500 | ERR_INTERNAL | Lỗi hệ thống | Lỗi server |

### 4. YÊU CẦU DỮ LIỆU (Data Requirements)

#### 4.1. Mô hình dữ liệu (Data Model)

[driver] 1 ←——— N [item_image]       (item_id = driver.id)

[driver] 1 ←——— N [vehicle]          (driver_id FK)

[driver] 1 ←——— N [dispatch_order]   (driver_id FK)

#### 4.2. Từ điển dữ liệu (Data Dictionary)

Bảng: driver (đã tồn tại)

| Trường | Kiểu dữ liệu | Bắt buộc | Default | Mô tả |
|---|---|---|---|---|
| id | varchar (PK) | Có | — | UUID |
| tenant_id | varchar | Có | — | ID tenant |
| code | varchar | Có | — | Mã tài xế. Unique per tenant. |
| name | varchar | Có | — | Họ và tên tài xế |
| identity_number | varchar | Có | — | Số CMND/CCCD |
| birthday | timestamptz | Không | NULL | Ngày sinh |
| phone | varchar | Có | '' | Số điện thoại liên hệ |
| description | varchar | Có | '' | Mô tả |
| province | varchar | Không | NULL | Mã tỉnh/TP (hành chính VN) |
| commune | varchar | Không | NULL | Mã phường/xã |
| address | varchar | Không | NULL | Địa chỉ chi tiết |
| license_class | varchar | Có | — | Hạng GPLX (VD: "C1", "FC", "E,FC") |
| license_number | varchar | Có | — | Số GPLX |
| license_date | timestamptz | Không | NULL | Ngày cấp GPLX |
| license_expiration_date | timestamptz | Không | NULL | Ngày hết hạn GPLX |
| search_code | varchar | Có | — | Mã chuẩn hoá tìm kiếm |
| search_name | varchar | Có | — | Tên chuẩn hoá tìm kiếm |
| search_identity_number | varchar | Có | — | CCCD chuẩn hoá tìm kiếm |
| search_phone | varchar | Có | — | SĐT chuẩn hoá tìm kiếm |
| is_active | boolean | Có | true | Trạng thái hoạt động |
| is_deleted | boolean | Có | false | Soft delete flag |
| created_at | timestamptz | Có | — | Thời điểm tạo |
| created_by | varchar | Không | NULL | User tạo |
| modified_at | timestamptz | Có | — | Thời điểm cập nhật |
| modified_by | varchar | Không | NULL | User cập nhật |

Bảng: item_image (dùng chung cho nhiều entity — lưu hình GPLX tài xế)

| Trường | Kiểu dữ liệu | Bắt buộc | Default | Mô tả |
|---|---|---|---|---|
| id | varchar (PK) | Có | — | UUID |
| tenant_id | varchar | Có | — | ID tenant |
| item_id | varchar | Có | — | ID entity sở hữu hình (= driver.id cho GPLX tài xế) |
| type | bigint | Có | 0 | Loại hình. Giá trị quy ước: 0 và 1 hiện có trong DB. (Cần confirm mapping: 0 = mặt trước, 1 = mặt sau?) |
| name | varchar | Có | — | Tên file gốc |
| url | varchar | Có | — | URL hình trên storage |
| created_at | timestamptz | Có | — | Thời điểm upload |
| created_by | varchar | Không | NULL | User upload |
| modified_at | timestamptz | Có | — | Thời điểm cập nhật |
| modified_by | varchar | Không | NULL | User cập nhật |

### 5. YÊU CẦU PHI CHỨC NĂNG (Non-Functional Requirements)

| Mã | Nhóm | Yêu cầu | Tiêu chí đo lường |
|---|---|---|---|
| NFR-001 | Performance | Load danh sách tài xế | ≤ 2 giây (95% request) |
| NFR-002 | Performance | Response time API | ≤ 500ms (P95) |
| NFR-003 | Performance | Upload hình ảnh | ≤ 5 giây cho file ≤ 5MB |
| NFR-004 | Security | Xác thực & phân quyền | JWT, role-based, data isolation per tenant |
| NFR-005 | Security | Storage hình ảnh | URL hình không public, cần token để truy cập (hoặc signed URL) |
| NFR-006 | Usability | Responsive | Desktop (≥ 1280px) |
| NFR-007 | Compatibility | Trình duyệt | Chrome, Edge (2 phiên bản gần nhất) |
| NFR-008 | Audit | Logging | Log Create / Update / Delete + upload/xoá hình |
| NFR-009 | Localization | Ngôn ngữ | Tiếng Việt |