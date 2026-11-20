## TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

Tên dự án: TMS – Transportation Management System Module: Đơn vận chuyển (Delivery Order) Phiên bản tài liệu: v1.1 Ngày cập nhật: 15/08/2026 Người soạn thảo: Thư (BA) Người phê duyệt: [Tên PO / Lead]

### Lịch sử thay đổi (Revision History)

| Phiên bản | Ngày | Người thực hiện | Nội dung thay đổi |
|---|---|---|---|
| v1.0 | 15/08/2026 | Thư | Khởi tạo tài liệu |

### 1. GIỚI THIỆU (Introduction)

#### 1.1. Mục đích tài liệu

Tài liệu SRS này đặc tả yêu cầu chức năng cho module Đơn vận chuyển (Delivery Order) thuộc hệ thống TMS – Transportation Management System. Tài liệu tập trung mô tả chi tiết từng field trên giao diện, quy tắc nghiệp vụ, và luồng xử lý — làm cơ sở cho team Dev (FE/BE), QC và các bên liên quan.

#### 1.2. Phạm vi hệ thống (Scope)

In-scope:

Màn hình Danh sách đơn vận chuyển

Màn hình Thêm mới đơn vận chuyển

Màn hình Chi tiết đơn vận chuyển (tab Thông tin chung, Chi thị giao hàng, Lịch sử điều xe)

Chỉnh sửa / Xóa đơn vận chuyển

Quản lý trạng thái đơn vận chuyển

Out-of-scope:

Module Chỉ thị giao hàng (DI) — SRS riêng

Module Điều xe (Dispatch Order) — SRS riêng

Quản lý danh mục Master Data (Khách hàng, Tuyến đường, Sản phẩm, Kho)

#### 1.3. Thuật ngữ & viết tắt (Glossary)

| Thuật ngữ | Định nghĩa |
|---|---|
| DGH | Đơn giao hàng — mã đơn vận chuyển trên hệ thống, format DGH-YYYYMMDD-XXXX |
| DI | Delivery Instruction — Chỉ thị giao hàng |
| Tuyến đường | Lộ trình vận chuyển từ kho giao đến kho nhận, bao gồm khoảng cách và thời gian dự kiến |
| Cước vận chuyển | Bảng giá cước theo khoảng thời gian áp dụng cho đơn vận chuyển |
| SL đăng ký DI | Số lượng sản phẩm đã được đăng ký vào các Chỉ thị giao hàng |
| SL giao hàng | Số lượng sản phẩm đã giao thực tế |
| SL còn lại | Số lượng chưa giao = Số lượng − SL giao hàng |

### 2. MÔ TẢ TỔNG QUAN (Overall Description)

#### 2.1. Bối cảnh nghiệp vụ

Trong quy trình vận tải phân bón của VitaDairy, mỗi lô hàng cần được lập thành một Đơn vận chuyển trước khi tiến hành giao hàng. Đơn vận chuyển ghi nhận thông tin khách hàng, tuyến đường (nơi giao – nơi nhận), danh sách sản phẩm cần vận chuyển, và cước phí.

Luồng nghiệp vụ tổng quan: Đơn vận chuyển → Chỉ thị giao hàng (DI) → Điều xe → Hoàn thành.

#### 2.2. Đối tượng người dùng

| Vai trò | Mô tả | Quyền hạn chính |
|---|---|---|
| Admin | Quản trị viên hệ thống | Full quyền: xem, tạo, sửa, xóa |
| Nhân viên điều phối | Tạo và quản lý đơn vận chuyển | Xem, tạo, sửa |
| Nhân viên cấp lệnh | Được gán vào đơn vận chuyển | Chỉ xem |

#### 2.3. Trạng thái đơn vận chuyển

| Trạng thái | Giá trị DB | Màu badge | Mô tả |
|---|---|---|---|
| Đơn hàng mới | New | — | Đơn vừa được tạo |
| Đã tiếp nhận | Acknowledged | Xanh dương | Đơn đã được tiếp nhận (Đã có tạo DI) |
| Đang xử lý | InProgress | Cam | Đơn đang trong quá trình giao hàng |
| Đã hoàn thành | Completed | Xanh lá | Đơn đã giao xong toàn bộ |
| Đã hủy | Canceled | Đỏ | Đơn bị hủy |

Luồng chuyển trạng thái: New → Acknowledged → InProgress → Completed. Có thể chuyển sang Canceled từ New hoặc Acknowledged.

#### 2.4. Giả định & ràng buộc

Dữ liệu master (Khách hàng, Tuyến đường, Sản phẩm, Kho) đã được thiết lập trước khi tạo đơn.

Mỗi tuyến đường đã được cấu hình sẵn kho giao (origin) và kho nhận (destination).

Mã đơn vận chuyển sinh tự động phía server theo format DGH-YYYYMMDD-XXXX.

Phương thức giao nhận mapping: Giao trực tiếp → DirectDelivery, Khách hàng tự lấy → CustomerDelivery, Nhập kho → WarehouseImport, Chưa xác định → Unspecified.

### 3. YÊU CẦU CHỨC NĂNG (Functional Requirements)

#### 3.1. Màn hình: Danh sách Đơn vận chuyển

Mã yêu cầu: FR-DGH-001 · Độ ưu tiên: Must have

##### 3.1.1. Mô tả nghiệp vụ

Hiển thị danh sách tất cả đơn vận chuyển, cho phép lọc theo trạng thái, khoảng thời gian, và tìm kiếm theo mã đơn. Từ đây người dùng truy cập chi tiết hoặc tạo mới đơn.

##### 3.1.2. User Story

Là nhân viên điều phối, tôi muốn xem danh sách đơn vận chuyển với bộ lọc trạng thái và thời gian để nhanh chóng tìm và theo dõi tiến độ các đơn hàng.

##### 3.1.3. Luồng xử lý

Người dùng truy cập menu Đơn Hàng trên sidebar.

Hệ thống hiển thị danh sách với filter mặc định: tab "Tất cả", ngày bắt đầu = 1 tháng trước, ngày kết thúc = hôm nay.

Người dùng thao tác filter: chuyển tab trạng thái, thay đổi khoảng ngày, nhập mã đơn tìm kiếm → hệ thống reload danh sách.

Click mã đơn giao hàng (link xanh) → chuyển đến Chi tiết.

Click "+ Thêm Mới" → chuyển đến Thêm đơn vận chuyển.

Luồng ngoại lệ: Không có dữ liệu phù hợp → hiển thị bảng rỗng, thông báo "Không có dữ liệu".

##### 3.1.4. Đặc tả giao diện (UI Specification)

Bộ lọc (Filter Bar):

| # | Field | Loại component | Bắt buộc | Giá trị mặc định | Mô tả chi tiết |
|---|---|---|---|---|---|
| 1 | Tab trạng thái | Tab bar | — | "Tất cả" | 6 tab: Tất cả<br> · Mới <br>· Đã tiếp nhận <br>· Đang xử lý<br>· Đã hoàn thành <br>· Đã hủy. <br> |
| 2 | Ngày bắt đầu | Date picker | — | Ngày hiện tại − 30 ngày | Format hiển thị: DD/MM/YYYY. <br>Chọn ngày → filter các đơn có ngày cấp (issue_date) ≥ giá trị chọn |
| 3 | Ngày kết thúc | Date picker | — | Ngày hiện tại | Format hiển thị: DD/MM/YYYY. <br>Chọn ngày → filter các đơn có ngày cấp (issue_date) ≤ giá trị chọn |
| 4 | Tìm kiếm | Textbox | — | Trống | Placeholder: "Nhập mã đơn vận chuyển". <br>Tìm kiếm dạng contains, không phân biệt hoa/thường. |

Bảng danh sách (Table):

| # | Tên cột | Format hiển thị | Mô tả chi tiết |
|---|---|---|---|
| 1 | Ngày cấp | DD/MM/YYYY HH:mm | Ngày cấp đơn vận chuyển |
| 2 | Mã đơn giao hàng | Text link màu xanh | Format: DGH-YYYYMMDD-XXXX. Click → navigate đến màn Chi tiết đơn tương ứng |
| 3 | Khách hàng | Text | Tên khách hàng liên kết với đơn |
| 4 | Tuyến đường | Nhiều dòng | Dòng 1: Tên tuyến đường (bold). <br>Dòng 2: 🟢 Địa chỉ nơi giao (origin). <br>Dòng 3: 🟠 Địa chỉ nơi nhận (destination) |
| 5 | Trạng thái | Badge màu | Badge theo trạng thái: Đang xử lý (cam), Đã tiếp nhận (xanh dương), Đã hoàn thành (xanh lá), Đã hủy (đỏ) |

Sắp xếp mặc định: Ngày cấp giảm dần (mới nhất trước). Phân trang server-side.

Nút hành động:

| Nút | Vị trí | Mô tả |
|---|---|---|
| + Thêm Mới | Góc trên bên phải | Nút primary xanh lá, navigate đến màn Thêm đơn vận chuyển |

##### 3.1.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-DGH-001 | Danh sách mặc định lọc 1 tháng gần nhất (ngày bắt đầu = today − 30 ngày, ngày kết thúc = today) |
| BR-DGH-002 | Tab trạng thái chỉ hiển thị đơn có status tương ứng. Tab "Tất cả" không filter status |
| BR-DGH-003 | Tìm kiếm mã đơn: contains, case-insensitive |
| BR-DGH-004 | Mỗi cột hỗ trợ column filter (icon ⫶) cho phép lọc nâng cao theo giá trị |

#### 3.2. Màn hình: Thêm đơn vận chuyển

Mã yêu cầu: FR-DGH-002 · Độ ưu tiên: Must have

##### 3.2.1. Mô tả nghiệp vụ

Cho phép tạo mới đơn vận chuyển bằng cách nhập thông tin chung, chọn khách hàng và tuyến đường, thêm danh sách sản phẩm, và cấu hình cước vận chuyển. Đơn sau khi tạo có trạng thái mặc định "Đơn hàng mới" (New).

##### 3.2.2. User Story

Là nhân viên điều phối, tôi muốn tạo mới đơn vận chuyển với đầy đủ thông tin khách hàng, tuyến đường, sản phẩm và cước phí để làm cơ sở cho việc lập chỉ thị giao hàng và điều xe.

##### 3.2.3. Luồng xử lý

Click "+ Thêm Mới" từ danh sách → hiển thị form "Thêm đơn vận chuyển".

Hệ thống tự động điền: Ngày bắt đầu = Ngày kết thúc = Ngày cấp = ngày hiện tại. Mã đơn giao hàng để trống (sinh tự động khi lưu).

Người dùng nhập Thông tin chung, chọn Khách hàng + Tuyến đường, thêm Sản phẩm, thêm Cước vận chuyển.

Nhấn "Lưu" → hệ thống validate → tạo đơn mới trạng thái New → redirect về danh sách.

Luồng ngoại lệ:

Thiếu trường bắt buộc → highlight trường lỗi, hiển thị message validation.

Ngày kết thúc < Ngày bắt đầu → "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu".

Số lượng sản phẩm ≤ 0 → "Số lượng phải lớn hơn 0".

##### 3.2.4. Đặc tả giao diện (UI Specification)

Section: Thông tin chung

| # | Field | Loại component | Bắt buộc | Giá trị mặc định | Mô tả chi tiết |
|---|---|---|---|---|---|
| 1 | Mã đơn giao hàng | Textbox (readonly, disabled) | — | Trống | Placeholder: "Mã đơn giao hàng". <br>Cho người dùng nhập. <br>Nếu bỏ trống hệ thống sinh tự động khi lưu theo format DGH-YYYYMMDD-XXXX (XXXX là số thứ tự tăng dần trong ngày, bắt đầu 0001) |
| 2 | Ngày bắt đầu | Date picker | Có (*) | Ngày hiện tại | Format: DD/MM/YYYY. Validation: bắt buộc chọn |
| 3 | Ngày kết thúc | Date picker | Có (*) | Ngày hiện tại | Format: DD/MM/YYYY.<br>Validation: bắt buộc chọn, phải ≥ Ngày bắt đầu |
| 4 | Ngày cấp | Date picker | Không | Ngày hiện tại | Format: DD/MM/YYYY. Ngày cấp đơn, có thể chỉnh sửa |
| 5 | Phương thức giao nhận | Dropdown (single select) | Không | Trống | Placeholder: "Phương thức giao nhận". Options: Giao trực tiếp · Khách hàng tự lấy · Nhập kho · Chưa xác định. Nếu không chọn, default lưu giá trị Unspecified |
| 6 | Nhân viên cấp lệnh | Textbox (free text) | Không | Trống | Placeholder: "Nhân viên cấp lệnh". <br>Nhập tên nhân viên được gán cấp lệnh cho đơn này |
| 7 | Hợp đồng số | Textbox (free text) | Không | Trống | Placeholder: "Hợp đồng số".<br> Nhập số hợp đồng liên quan (nếu có) |
| 8 | Ghi chú | Textarea (multiline) | Không | Trống | Placeholder: "Ghi chú". Ghi chú tự do cho đơn vận chuyển |

Section: Thông tin đơn nhận lệnh

| # | Field | Loại component | Bắt buộc | Giá trị mặc định | Mô tả chi tiết |
|---|---|---|---|---|---|
| 1 | Khách hàng | Dropdown (searchable) | Có (*) | Trống | Placeholder: "Khách hàng". <br>Load danh sách từ master data Khách hàng. Hỗ trợ search theo tên/mã khách hàng |
| 2 | Tuyến đường | Dropdown (searchable) | Có (*) | Trống | Placeholder: "Tuyến đường".<br>Load danh sách từ master data Tuyến đường. <br>Hỗ trợ search theo tên/mã tuyến. <br> |
| 3 | Mã tuyến | Label (readonly) | — | "-" (link xanh) | Tự động hiển thị route.code sau khi chọn Tuyến đường |
| 4 | Khoảng cách | Label (readonly) | — | "0km" | Tự động hiển thị route.length sau khi chọn Tuyến đường. <br>VD: "120km" |
| 5 | Thời gian dự kiến | Label (readonly) | — | "-" | Tự động hiển thị route.time sau khi chọn Tuyến đường. <br>VD: "3h" |

Section: Danh sách sản phẩm (Sub-table, có thể thêm/xóa dòng)

| # | Cột | Loại component | Bắt buộc | Giá trị mặc định | Mô tả chi tiết |
|---|---|---|---|---|---|
| 1 | Mã sản phẩm | Dropdown (searchable) | Có | Trống | Placeholder: "Chọn sản phẩm". <br>Load danh sách từ master data Sản phẩm. <br>Search theo tên/mã. Khi chọn → auto-fill cột Tên sản phẩm |
| 2 | Tên sản phẩm | Label (readonly) | — | "-" | Tự động hiển thị product.name khi chọn sản phẩm ở cột 1 |
| 3 | Số lượng | Number input | Có | 0 | Chỉ nhận số nguyên ≥ 0. Validation: phải > 0 khi lưu đơn |
| 4 | Xóa | Icon button (🗑) | — | — | Click → xóa dòng sản phẩm khỏi danh sách. Không cần confirm |

Mặc định hiển thị 1 dòng trống. Có thể thêm nhiều dòng sản phẩm. Phải có ít nhất 1 dòng sản phẩm hợp lệ (đã chọn sản phẩm + số lượng > 0) khi lưu.

Section: Danh sách cước vận chuyển (Sub-table, có thể thêm/xóa dòng)

| # | Cột | Loại component | Bắt buộc | Giá trị mặc định | Mô tả chi tiết |
|---|---|---|---|---|---|
| 1 | Từ ngày | Date picker | Có | Trống | Ngày bắt đầu áp dụng mức cước. <br>Format: DD/MM/YYYY |
| 2 | Đến ngày | Date picker | Có | Trống | Ngày kết thúc áp dụng mức cước. <br>Format: DD/MM/YYYY.<br>Phải ≥ Từ ngày cùng dòng |
| 3 | Đơn giá | Number input | Có | Trống | Đơn giá cước vận chuyển (VNĐ). <br>Hiển thị format số có dấu phân cách hàng nghìn |
| 4 | Xóa | Icon button (🗑) | — | — | Click → xóa dòng cước khỏi danh sách |

Tổng đơn

| # | Cột | Loại component | Mô tả chi tiết |
|---|---|---|---|
| 1 | Tổng số lượng giao hàng | Label (readonly)<br> | Tổng cộng cột "Số lượng giao hàng" của tất cả các dòng trong bảng Nhật ký thuê vận chuyển. <br><br>Format: số nguyên có dấu phân cách nghìn |
| 2 | Tổng thành tiền | Label (readonly)<br> | Tổng cộng cột "Thành tiền" của tất cả các dòng trong bảng Nhật ký thuê vận chuyển. <br><br>Format: số có dấu phân cách nghìn |

Nút hành động:

| Nút | Vị trí | Mô tả |
|---|---|---|
| ← (Back) | Góc trên bên trái (icon mũi tên) | Quay lại danh sách. Nếu có thay đổi chưa lưu → hiển thị confirm trước khi thoát |
| Lưu | Góc trên bên phải | Nút primary. Validate toàn bộ form → tạo mới → redirect về danh sách |

##### 3.2.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-DGH-005 | Mã đơn sinh tự động phía server: DGH-YYYYMMDD-XXXX (XXXX tăng dần trong ngày, bắt đầu 0001) |
| BR-DGH-006 | Ngày kết thúc phải ≥ Ngày bắt đầu |
| BR-DGH-007 | Bắt buộc chọn Khách hàng và Tuyến đường |
| BR-DGH-008 | Khi chọn Tuyến đường → auto-fill Mã tuyến, Khoảng cách, Thời gian dự kiến |
| BR-DGH-009 | Phải có ít nhất 1 sản phẩm với số lượng > 0 |
| BR-DGH-010 | Đơn sau khi tạo có trạng thái mặc định New |
| BR-DGH-011 | Cước vận chuyển: Đến ngày phải ≥ Từ ngày trong cùng dòng |

Validation Errors:

| Error Code | Trường liên quan | Message hiển thị |
|---|---|---|
| VAL-DGH-001 | Ngày bắt đầu | Vui lòng chọn ngày bắt đầu |
| VAL-DGH-002 | Ngày kết thúc | Vui lòng chọn ngày kết thúc |
| VAL-DGH-003 | Ngày kết thúc | Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu |
| VAL-DGH-004 | Khách hàng | Vui lòng chọn khách hàng |
| VAL-DGH-005 | Tuyến đường | Vui lòng chọn tuyến đường |
| VAL-DGH-006 | Số lượng (sản phẩm) | Số lượng phải lớn hơn 0 |
| VAL-DGH-007 | Danh sách sản phẩm | Vui lòng thêm ít nhất 1 sản phẩm |
| VAL-DGH-008 | Đến ngày (cước) | Đến ngày phải lớn hơn hoặc bằng Từ ngày |

#### 3.3. Màn hình: Chi tiết Đơn vận chuyển

##### 3.3.1. Mô tả nghiệp vụ

Hiển thị toàn bộ thông tin chi tiết của một đơn vận chuyển ở chế độ read-only: thông tin chung, đơn vị nhận lệnh (khách hàng, tuyến đường, nơi giao/nhận), danh sách sản phẩm kèm tiến độ giao hàng, và cước vận chuyển. Màn hình hiển thị timeline trạng thái đơn và cho phép chỉnh sửa / xóa.

##### 3.3.2. User Story

Là nhân viên điều phối, tôi muốn xem chi tiết đơn vận chuyển với đầy đủ thông tin và tiến độ giao hàng để theo dõi trạng thái và ra quyết định tiếp theo.

##### 3.3.3. Luồng xử lý

Click mã đơn giao hàng trên danh sách → hiển thị màn Chi tiết.

Hệ thống hiển thị Header (mã đơn + badge trạng thái + ngày tạo), Timeline trạng thái, và 3 tab nội dung.

Tab Thông tin chung (default active): hiển thị read-only toàn bộ thông tin đơn.

Nhấn "Chỉnh Sửa" → chuyển sang mode edit (form tương tự màn Thêm, pre-fill dữ liệu hiện tại).

Nhấn nút Xóa (icon thùng rác đỏ) → hiển thị confirm → xóa đơn → redirect về danh sách.

Luồng ngoại lệ:

Đơn trạng thái Completed hoặc Canceled → disable nút Chỉnh Sửa và Xóa.

Đơn đã có DI liên kết → không cho phép xóa.

##### 3.3.4. Đặc tả giao diện (UI Specification)

Header:

| # | Thành phần | Mô tả chi tiết |
|---|---|---|
| 1 | Tiêu đề | "Chi tiết đơn vận chuyển #[code] –" kèm badge trạng thái (màu theo mapping ở mục 2.3). <br>VD: "Chi tiết đơn vận chuyển #DGH-20260719-0005 – Đang xử lý" |
| 2 | Ngày tạo | Hiển thị ngay dưới tiêu đề, format DD/MM/YYYY HH:mm |
| 3 | Nút Xóa | Icon thùng rác nền đỏ. <br>Disabled khi trạng thái = Canceled |
| 4 | Nút Chỉnh Sửa | "✏ Chỉnh Sửa" nền xanh đậm. <br>Disabled khi trạng thái = Canceled |

Timeline trạng thái:

| Bước | Label hiển thị | Thông tin kèm |
|---|---|---|
| 1 | Đơn hàng mới | Hiển thị ngày cập nhật thành trạng thái |
| 2 | Đã tiếp nhận | Hiển thị ngày cập nhật thành trạng thái |
| 3 | Đang xử lý | Hiển thị ngày cập nhật thành trạng thái |
| 4 | Đã hoàn thành | Hiển thị ngày cập nhật thành trạng thái |

Các bước nối nhau bằng đường line. Bước đã qua → line xanh + icon check. Bước hiện tại → circle xanh có viền. Bước chưa đến → circle xám.

Tab navigation:

| Tab | Mô tả |
|---|---|
| Thông tin chung | Default active. Nội dung chi tiết bên dưới |
| Chi thị giao hàng | Danh sách DI liên quan (ngoài scope SRS này) |
| Lịch sử điều xe | Lịch sử điều xe liên quan (ngoài scope SRS này) |

Section: Thông tin chung (read-only)

| # | Field | Format hiển thị | Mô tả |
|---|---|---|---|
| 1 | Lệnh điều động | Text | Mã đơn vận chuyển, VD: "DGH-20260719-0005" |
| 2 | Ngày bắt đầu | DD/MM/YYYY | Ngày bắt đầu hiệu lực đơn |
| 3 | Ngày kết thúc | DD/MM/YYYY | Ngày kết thúc hiệu lực đơn |
| 4 | Hợp đồng số | Text hoặc trống | Số hợp đồng liên quan |
| 5 | Phương thức giao nhận | Tên tiếng Việt | Mapping: DirectDelivery → "Giao trực tiếp", CustomerDelivery → "Khách hàng tự lấy", WarehouseImport → "Nhập kho", Unspecified → "-" |
| 6 | Nhân viên cấp lệnh | Text hoặc trống | Tên nhân viên cấp lệnh |
| 7 | Ghi chú | Text hoặc trống | Nội dung ghi chú |

Section: Thông tin đơn vị nhận lệnh (read-only)

| # | Field | Mô tả |
|---|---|---|
| 1 | Khách hàng | Tên khách hàng. VD: "NCC Kiwi" |
| 2 | Tuyến đường | Tên tuyến đường. VD: "Đồng Nai" |
| 3 | Nơi giao — Kho | Tên kho giao. VD: "KHO NM BÌNH ĐIỀN" |
| 4 | Nơi giao — Địa chỉ | Địa chỉ đầy đủ kho giao. VD: "Cụm Công Nghiệp Long Định, Xã Long Cang, Tây Ninh" |
| 5 | Nơi nhận — Kho | Tên kho nhận. VD: "KHO VIỆT NHẬT" |
| 6 | Nơi nhận — Địa chỉ | Địa chỉ đầy đủ kho nhận. VD: "KCN Gò Dầu, Xã Phước Thái, Thành Phố Đồng Nai" |

Section: Danh sách sản phẩm (read-only table)

| # | Cột | Format | Mô tả |
|---|---|---|---|
| 1 | Sản phẩm | Dòng 1: Tên sản phẩm. Dòng 2: Mã sản phẩm (text nhỏ, xám) | VD: "16-16-16 NGA 50KG" / "DDN001" |
| 2 | Số lượng | Số nguyên | Tổng số lượng đặt hàng ban đầu |
| 3 | SL đăng ký DI | Số nguyên | Số lượng đã được đăng ký vào các Chỉ thị giao hàng. Cập nhật khi tạo/sửa DI |
| 4 | SL giao hàng | Số nguyên | Số lượng đã giao thực tế. Cập nhật khi hoàn thành giao hàng |
| 5 | SL còn lại | Số nguyên | = quantity − delivered_quantity. Khi = 0 nghĩa là đã giao hết |

Section: Danh sách cước vận chuyển (read-only table)

| # | Cột | Format | Mô tả |
|---|---|---|---|
| 1 | Từ ngày | DD/MM/YYYY | Ngày bắt đầu áp dụng cước |
| 2 | Đến ngày | DD/MM/YYYY | Ngày kết thúc áp dụng cước |
| 3 | Đơn giá | Số có dấu phân cách hàng nghìn + "đ" | Đơn giá cước vận chuyển |

##### 3.3.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-DGH-012 | Timeline lấy timestamp từ bảng delivery_order_history_status, mỗi status hiển thị created_at tương ứng |
| BR-DGH-013 | Nơi giao và Nơi nhận lấy từ thông tin kho qua tuyến đường: route.origin_warehouse_id → kho giao, route.destination_warehouse_id → kho nhận |
| BR-DGH-014 | SL còn lại (remaining_quantity) = quantity − delivered_quantity |
| BR-DGH-015 | Không cho phép chỉnh sửa / xóa đơn trạng thái Completed hoặc Canceled |
| BR-DGH-016 | Không cho phép xóa đơn đã có Chỉ thị giao hàng (DI) liên kết |

### 4. YÊU CẦU DỮ LIỆU (Data Requirements)

#### 4.2. Từ điển dữ liệu (Data Dictionary)

Bảng: delivery_order

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | varchar (PK) | Có | UUID, khóa chính |
| tenant_id | varchar | Có | Mã tenant (multi-tenant) |
| code | varchar (unique) | Có | Mã đơn giao hàng, format DGH-YYYYMMDD-XXXX |
| status | varchar | Có | Enum: New · Acknowledged · InProgress · Completed · Canceled |
| issue_by | varchar | Không | Nhân viên cấp lệnh |
| issue_date | timestamptz | Có | Ngày cấp đơn |
| start_date | timestamptz | Có | Ngày bắt đầu |
| end_date | timestamptz | Có | Ngày kết thúc |
| contract_number | varchar | Không | Số hợp đồng |
| delivery_method | varchar | Có | Enum: DirectDelivery · CustomerDelivery · WarehouseImport · Unspecified |
| price | numeric | Có | Tổng giá trị cước |
| description | varchar | Không | Ghi chú |
| total_item_quantity | numeric | Có | Tổng SL sản phẩm đặt |
| total_item_remaining_quantity | numeric | Có | Tổng SL sản phẩm còn lại |
| total_amount | numeric | Có | Tổng giá trị đơn |
| search_code | varchar | Có | Mã tìm kiếm (lowercase, bỏ dấu) |
| customer_id | varchar (FK) | Có | FK → customer.id |
| route_id | varchar (FK) | Có | FK → route.id |
| created_at | timestamptz | Có | Thời điểm tạo |
| created_by | varchar | Không | Người tạo |
| modified_at | timestamptz | Có | Thời điểm cập nhật cuối |
| modified_by | varchar | Không | Người cập nhật cuối |

Bảng: delivery_order_item

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | varchar (PK) | Có | UUID |
| order_index | bigint | Có | Thứ tự sản phẩm trong đơn |
| product_code | varchar | Có | Mã sản phẩm |
| product_name | varchar | Có | Tên sản phẩm |
| quantity | numeric | Có | SL đặt hàng |
| registered_quantity | numeric | Có | SL đã đăng ký DI |
| delivered_quantity | numeric | Có | SL đã giao |
| remaining_quantity | numeric | Có | SL còn lại |
| delivery_order_id | varchar (FK) | Có | FK → delivery_order.id |
| product_id | varchar (FK) | Có | FK → product.id |
| created_at / created_by | timestamptz / varchar | Có / Không | Audit |
| modified_at / modified_by | timestamptz / varchar | Có / Không | Audit |

Bảng: delivery_order_price_range

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | varchar (PK) | Có | UUID |
| order_index | bigint | Có | Thứ tự dòng cước |
| from_date | timestamptz | Có | Ngày bắt đầu áp dụng cước |
| to_date | timestamptz | Có | Ngày kết thúc áp dụng cước |
| price | numeric | Có | Đơn giá cước |
| delivery_order_id | varchar (FK) | Có | FK → delivery_order.id |
| created_at / created_by | timestamptz / varchar | Có / Không | Audit |
| modified_at / modified_by | timestamptz / varchar | Có / Không | Audit |

Bảng: delivery_order_history_status

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | varchar (PK) | Có | UUID |
| status | varchar | Có | Trạng thái tại thời điểm ghi nhận |
| delivery_order_id | varchar (FK) | Có | FK → delivery_order.id |
| created_at | timestamptz | Có | Thời điểm chuyển trạng thái (dùng hiển thị timeline) |
| created_by | varchar | Không | Người thực hiện |
| modified_at / modified_by | timestamptz / varchar | Có / Không | Audit |