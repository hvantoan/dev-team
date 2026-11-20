## TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

Tên dự án: TMS – Transportation Management System

Module: Phương thức thanh toán (Payment mento)

### Lịch sử thay đổi (Revision History)

| Phiên bản | Ngày | Người thực hiện | Nội dung thay đổi |
|---|---|---|---|
| v1.0 | 25/07/2026 | Thư | Khởi tạo tài liệu |

### 1. GIỚI THIỆU (Introduction)

#### 1.1. Mục đích tài liệu

Tài liệu này đặc tả yêu cầu chức năng và phi chức năng cho màn hình Phương thức thanh toán trong hệ thống TMS. Tài liệu phục vụ làm cơ sở cho team Dev (FE/BE), QC và các bên liên quan trong quá trình phát triển, kiểm thử và nghiệm thu.

#### 1.2. Phạm vi hệ thống (Scope)

In-scope:

Quản lý danh sách phương thức chuyển khoản (CRUD: tạo, xem, sửa, xoá)

Cấu hình bật/tắt cho phép thanh toán của từng phương thức chuyển khoản

Cấu hình bật/tắt phương thức thanh toán tiền mặt toàn hệ thống

Tìm kiếm phương thức chuyển khoản theo tên gợi nhớ

Phân trang danh sách phương thức chuyển khoản

Out-of-scope:

Xử lý giao dịch thanh toán thực tế (chuyển tiền, ghi nhận thu/chi)

Tích hợp cổng thanh toán bên thứ 3 (VNPay, MoMo, ZaloPay...)

Quản lý danh mục ngân hàng (Bank master data)

Báo cáo / thống kê thanh toán

#### 1.3. Đối tượng sử dụng tài liệu

| Vai trò | Mục đích sử dụng |
|---|---|
| Developer (FE/BE) | Hiểu yêu cầu để implement |
| QC/Tester | Viết test case, kiểm thử |
| PO/Stakeholder | Review và phê duyệt yêu cầu |
| BA/PM | Quản lý thay đổi yêu cầu |

#### 1.4. Thuật ngữ & viết tắt (Glossary)

| Thuật ngữ | Định nghĩa |
|---|---|
| SRS | Software Requirements Specification |
| FE / BE | Frontend / Backend |
| API | Application Programming Interface |
| Phương thức thanh toán | Cách thức thanh toán được cấu hình trong hệ thống (chuyển khoản hoặc tiền mặt) |
| Tên gợi nhớ | Tên do người dùng đặt để dễ nhận diện phương thức chuyển khoản |
| Merchant | Đơn vị kinh doanh / chi nhánh trong hệ thống TMS |
| PaymentMethod | Bảng dữ liệu chứa thông tin phương thức thanh toán |
| Bank | Bảng dữ liệu master chứa danh mục ngân hàng Việt Nam |

#### 1.5. Tài liệu tham chiếu

| Tài liệu | Link / Vị trí | Ghi chú |
|---|---|---|
| Figma Design | [link] | Mockup màn hình Phương thức thanh toán |
| TMS Web Manager | ManV2 | Platform chính |

### 2. MÔ TẢ TỔNG QUAN (Overall Description)

#### 2.1. Bối cảnh & vấn đề (Business Context)

Trong quá trình vận hành, hệ thống TMS cần hỗ trợ quản lý các phương thức thanh toán mà doanh nghiệp sử dụng để thu/chi khi giao dịch với khách hàng và nhà cung cấp. Màn hình Phương thức thanh toán cho phép quản trị viên cấu hình các tài khoản ngân hàng (phương thức chuyển khoản) và bật/tắt thanh toán tiền mặt, phục vụ cho việc ghi nhận phiếu thu, phiếu chi trong module Quỹ.

#### 2.2. Đối tượng người dùng (User Personas)

| Vai trò (Role) | Mô tả | Quyền hạn chính |
|---|---|---|
| Admin / Quản trị viên | Người quản lý cấu hình hệ thống TMS | Toàn quyền: xem, tạo, sửa, xoá phương thức thanh toán; bật/tắt thanh toán tiền mặt |

#### 2.3. Giả định & ràng buộc (Assumptions & Constraints)

Giả định:

Danh mục ngân hàng (Bank) đã được đồng bộ sẵn trong hệ thống (65 ngân hàng)

Mỗi Merchant có phương thức thanh toán riêng, không chia sẻ giữa các Merchant

Ràng buộc:

Hỗ trợ trình duyệt Chrome / Edge (2 phiên bản gần nhất)

Hệ thống chỉ hỗ trợ 2 loại phương thức thanh toán: chuyển khoản (Type = 1) và tiền mặt (Type = 0)

Phụ thuộc (Dependencies):

Module Quỹ (Phiếu thu, Phiếu chi) sử dụng phương thức thanh toán khi tạo phiếu

### 3. YÊU CẦU CHỨC NĂNG (Functional Requirements)

#### 3.1. Module: Danh sách phương thức chuyển khoản

Mã yêu cầu: FR-PM-001 Độ ưu tiên: Must have

##### 3.1.1. Mô tả nghiệp vụ (Business Description)

Màn hình hiển thị danh sách các phương thức chuyển khoản đã được tạo trong hệ thống. Quản trị viên có thể tìm kiếm, xem thông tin chi tiết, bật/tắt trạng thái cho phép thanh toán và xoá phương thức chuyển khoản. Danh sách hỗ trợ phân trang.

##### 3.1.2. User Story

Là quản trị viên, tôi muốn xem danh sách các phương thức chuyển khoản đã cấu hình để quản lý và kiểm soát các tài khoản ngân hàng dùng cho thu/chi trong hệ thống.

##### 3.1.3. Luồng xử lý (User Flow)

Người dùng truy cập menu Quỹ > Phương thức thanh toán từ sidebar

Hệ thống load và hiển thị danh sách phương thức chuyển khoản (Type = 1) theo phân trang, mặc định 20 dòng/trang

Người dùng có thể:

Tìm kiếm theo tên gợi nhớ qua ô "Tìm theo"

Xoá phương thức bằng cách bấm icon thùng rác

Chuyển trang bằng pagination

Bấm nút "+ Tạo" để mở popup tạo mới

Luồng ngoại lệ (Exception Flows):

Nếu không có dữ liệu → hiển thị bảng trống (empty state)

Nếu API lỗi → hiển thị thông báo lỗi hệ thống

##### 3.1.4. Đặc tả giao diện (UI Specification)

Bộ lọc / Tìm kiếm (Filter bar):

| # | Thành phần | Loại | Bắt buộc | Mô tả / Validation |
|---|---|---|---|---|
| 1 | Tìm kiếm | Textbox (search) | Không | Placeholder: "Tìm theo". Tìm kiếm theo tên gợi nhớ (Name). Hỗ trợ tìm không dấu (SearchName). Có nút clear (x) |

Bảng danh sách:

| # | Cột | Kiểu hiển thị | Mô tả |
|---|---|---|---|
| 1 | Tên gợi nhớ | Text (link) | Hiển thị Name của PaymentMethod. Có thể click để mở popup chỉnh sửa |
| 2 | Số tài khoản | Text | Hiển thị tên ngân hàng (Bank.Name) |
| 3 | Sổ tài khoản | Text | Hiển thị loại tài khoản (VD: "Bán hàng") |
| 4 | Tên tài khoản | Text | Hiển thị AccountName |
| 5 | Thực hiện thanh toán | Badge | "CÓ" (badge xanh) khi IsActive = true; "KHÔNG" (badge đỏ) khi IsActive = false |
| 6 | Hành động | Icon button | Icon thùng rác (xoá). Click → hiện confirm dialog |

Phân trang:

| # | Thành phần | Loại | Mô tả |
|---|---|---|---|
| 1 | Số dòng mỗi trang | Dropdown | Giá trị mặc định: 20. Các option: 10, 20, 50 |
| 2 | Navigation | Page buttons | Hiển thị số trang + nút Previous / Next |

Nút hành động:

| # | Nút | Vị trí | Mô tả |
|---|---|---|---|
| 1 | + Tạo | Header (top-right) | Mở popup "Thông tin chung" để tạo phương thức chuyển khoản mới |

#### 3.2. Module: Tạo / Chỉnh sửa phương thức chuyển khoản (Popup)

Mã yêu cầu: FR-PM-002 Độ ưu tiên: Must have

##### 3.2.1. Mô tả nghiệp vụ (Business Description)

Popup "Thông tin chung" cho phép quản trị viên tạo mới hoặc chỉnh sửa thông tin một phương thức chuyển khoản, bao gồm tên gợi nhớ, ngân hàng, số tài khoản, tên tài khoản và trạng thái cho phép thanh toán.

##### 3.2.2. User Story

Là quản trị viên, tôi muốn tạo / chỉnh sửa phương thức chuyển khoản để cấu hình tài khoản ngân hàng phục vụ thu/chi trong hệ thống.

##### 3.2.3. Luồng xử lý (User Flow)

Luồng tạo mới:

Người dùng bấm nút "+ Tạo" trên màn hình danh sách

Hệ thống hiển thị popup "Thông tin chung" với các field trống, toggle "Cho phép thanh toán" mặc định BẬT

Người dùng điền thông tin: Tên gợi nhớ, chọn Ngân hàng, nhập Số tài khoản, Tên tài khoản

Người dùng bấm "Lưu"

Hệ thống validate dữ liệu → nếu hợp lệ: lưu vào DB, đóng popup, refresh danh sách

Nếu không hợp lệ: hiển thị lỗi validation trên field tương ứng

Luồng chỉnh sửa:

Người dùng click vào tên gợi nhớ (link) trên bảng danh sách

Hệ thống hiển thị popup "Thông tin chung" với dữ liệu đã có

Người dùng chỉnh sửa thông tin

Bấm "Lưu" → hệ thống validate và cập nhật

Luồng ngoại lệ:

Nếu người dùng bấm "Đóng" hoặc icon (x) → đóng popup, không lưu

Nếu API lỗi khi lưu → hiển thị thông báo lỗi, giữ popup mở

##### 3.2.4. Đặc tả giao diện (UI Specification)

Form nhập liệu (Popup "Thông tin chung"):

| # | Thành phần | Loại | Bắt buộc | Mô tả / Validation |
|---|---|---|---|---|
| 1 | Tên gợi nhớ | Textbox | Có (*) | Placeholder: "Tên gợi nhớ". <br>Map → PaymentMethod.Name |
| 2 | Ngân hàng | Dropdown (select) | Có (*) | Placeholder: "Ngân hàng". <br>Load danh sách từ bảng Bank. <br>Hiển thị Bank.Name. Map → PaymentMethod.BankId |
| 3 | Số tài khoản | Textbox | Có (*) | Placeholder: "Số tài khoản". <br>Map → PaymentMethod.AccountNo |
| 4 | Tên tài khoản | Textbox | Có (*) | Placeholder: "Tên tài khoản". <br>Map → PaymentMethod.AccountName |
| 5 | Cho phép thanh toán | Toggle switch | Không | Mặc định: BẬT (true) khi tạo mới. Map → PaymentMethod.IsActive |

Nút hành động:

| # | Nút | Mô tả |
|---|---|---|
| 1 | Đóng | Đóng popup, không lưu thay đổi |
| 2 | Lưu | Validate form → gọi API tạo/cập nhật → đóng popup và refresh danh sách |
| 3 | Icon (x) | Góc trên phải popup, đóng popup |

##### 3.2.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-PM-001 | Tên gợi nhớ, Ngân hàng, Số tài khoản, Tên tài khoản là bắt buộc. Không được để trống |
| BR-PM-002 | Khi tạo mới, toggle "Cho phép thanh toán" mặc định BẬT (IsActive = true) |
| BR-PM-003 | Khi lưu thành công, tự động tạo SearchName (dạng không dấu) từ Name để hỗ trợ tìm kiếm |
| BR-PM-004 | Phương thức chuyển khoản luôn có Type = 1 |
| BR-PM-005 | Xoá phương thức thanh toán sử dụng soft delete (IsDelete = true), không xoá vật lý khỏi DB |

Validation Errors:

| Error Code | Field | Message hiển thị | Điều kiện |
|---|---|---|---|
| ERR_PM_001 | Tên gợi nhớ | "Vui lòng nhập tên gợi nhớ" | Tên gợi nhớ bị bỏ trống |
| ERR_PM_002 | Ngân hàng | "Vui lòng chọn ngân hàng" | Chưa chọn ngân hàng |
| ERR_PM_003 | Số tài khoản | "Vui lòng nhập số tài khoản" | Số tài khoản bị bỏ trống |
| ERR_PM_004 | Tên tài khoản | "Vui lòng nhập tên tài khoản" | Tên tài khoản bị bỏ trống |

##### 3.2.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/payment-methods | GET | Lấy danh sách phương thức thanh toán, hỗ trợ filter/paging |
| 2 | /api/v1/payment-methods | POST | Tạo mới phương thức thanh toán |
| 3 | /api/v1/payment-methods/{id} | GET | Lấy chi tiết một phương thức thanh toán |
| 4 | /api/v1/payment-methods/{id} | PUT | Cập nhật phương thức thanh toán |
| 5 | /api/v1/payment-methods/{id} | DELETE | Xoá (soft delete) phương thức thanh toán |
| 6 | /api/v1/banks | GET | Lấy danh sách ngân hàng (cho dropdown) |

Query Params (GET danh sách):

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| type | integer | Không | Loại phương thức: <br>0 = tiền mặt,<br> + 1 = chuyển khoản. <br>Default: 1 |
| search | string | Không | Từ khoá tìm kiếm theo tên gợi nhớ (tìm trên SearchName) |
| page | integer | Không | Trang hiện tại. Default: 1 |
| pageSize | integer | Không | Số dòng mỗi trang. Default: 20 |

Error Codes:

| HTTP Code | Error Code | Message | Trường hợp |
|---|---|---|---|
| 400 | ERR_VALIDATION | Dữ liệu đầu vào không hợp lệ | Thiếu field bắt buộc hoặc dữ liệu sai format |
| 404 | ERR_NOT_FOUND | Không tìm thấy phương thức thanh toán | ID không tồn tại hoặc đã bị xoá (IsDelete = true) |
| 500 | ERR_INTERNAL | Lỗi hệ thống | Lỗi server không xác định |

Lưu ý cho BE:

Field SearchName được generate tự động phía BE bằng cách chuyển Name sang dạng không dấu (unaccented) để phục vụ tìm kiếm

Khi tạo mới, BE tự set Type = 1 (chuyển khoản), IsDelete = false, CreatedDate = timestamp hiện tại, ModifiedDate = timestamp hiện tại

Khi cập nhật, BE cập nhật ModifiedDate = timestamp hiện tại

Xoá sử dụng soft delete: set IsDelete = true

#### 3.3. Module: Cấu hình thanh toán tiền mặt

Mã yêu cầu: FR-PM-003 Độ ưu tiên: Must have

##### 3.3.1. Mô tả nghiệp vụ (Business Description)

Phần "Thanh toán tiền mặt" nằm bên dưới bảng danh sách chuyển khoản, cho phép quản trị viên bật/tắt tính năng thanh toán tiền mặt cho toàn hệ thống của Merchant. Khi tắt, hệ thống sẽ không cho phép sử dụng phương thức tiền mặt trong các phiếu thu/chi.

##### 3.3.2. User Story

Là quản trị viên, tôi muốn bật hoặc tắt phương thức thanh toán tiền mặt để kiểm soát hình thức thu/chi tiền mặt trong toàn bộ hệ thống.

##### 3.3.3. Luồng xử lý (User Flow)

Hệ thống hiển thị section "Thanh toán tiền mặt" với toggle "Cho phép thực hiện thanh toán" và nút "Lưu"

Toggle hiển thị trạng thái hiện tại (BẬT hoặc TẮT)

Người dùng thay đổi toggle → bấm "Lưu"

Hệ thống cập nhật trạng thái IsActive của PaymentMethod có Type = 0 (tiền mặt) thuộc Merchant hiện tại

Luồng ngoại lệ:

Nếu chưa tồn tại PaymentMethod tiền mặt → BE tạo mới record với Type = 0

##### 3.3.4. Đặc tả giao diện (UI Specification)

Form cấu hình:

| # | Thành phần | Loại | Mô tả |
|---|---|---|---|
| 1 | Label | Text | "Thanh toán tiền mặt" (heading) |
| 2 | Cho phép thực hiện thanh toán | Toggle switch | BẬT = cho phép tiền mặt; TẮT = không cho phép |
| 3 | Lưu | Button | Lưu trạng thái toggle. Nằm cùng hàng, bên phải |

##### 3.3.5. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-PM-006 | Phương thức tiền mặt có Type = 0 và tên mặc định "Tiền mặt" |
| BR-PM-007 | Mỗi Merchant chỉ có tối đa 1 record phương thức tiền mặt (Type = 0) |
| BR-PM-008 | Khi toggle TẮT → IsActive = false, hệ thống không hiển thị tiền mặt trong danh sách phương thức thanh toán ở phiếu thu/chi |
| BR-PM-009 | Khi toggle BẬT → IsActive = true, tiền mặt xuất hiện trong danh sách phương thức thanh toán ở phiếu thu/chi |

##### 3.3.6. Đặc tả API (dành cho BE)

| # | Endpoint | Method | Mô tả |
|---|---|---|---|
| 1 | /api/v1/payment-methods/cash | GET | Lấy trạng thái hiện tại của thanh toán tiền mặt |
| 2 | /api/v1/payment-methods/cash | PUT | Cập nhật trạng thái bật/tắt thanh toán tiền mặt |

Request Body mẫu (PUT):

{

"isActive": true

}

Lưu ý cho BE:

Nếu chưa có record tiền mặt (Type = 0) cho Merchant → tự động tạo mới với Name = "Tiền mặt", Type = 0

Không cho phép xoá phương thức tiền mặt, chỉ bật/tắt

### 4. YÊU CẦU DỮ LIỆU (Data Requirements)

#### 4.1. Mô hình dữ liệu (Data Model)

#### 4.2. Từ điển dữ liệu (Data Dictionary)

Bảng: PaymentMethod

| Trường | Kiểu dữ liệu | Nullable | Default | Mô tả |
|---|---|---|---|---|
| Id | varchar | NO | — | Primary key (GUID/UUID dạng hex 32 ký tự) |
| MerchantId | varchar | NO | — | ID Merchant sở hữu phương thức thanh toán |
| Name | varchar | NO | — | Tên gợi nhớ do người dùng đặt |
| SearchName | varchar | NO | — | Tên không dấu, tự generate từ Name để hỗ trợ tìm kiếm |
| Type | bigint | NO | — | Loại phương thức: 0 = Tiền mặt, 1 = Chuyển khoản |
| BankId | varchar | YES | null | FK tham chiếu đến Bank.Id. Null khi Type = 0 (tiền mặt) |
| AccountNo | varchar | YES | null | Số tài khoản ngân hàng. Null khi Type = 0 |
| AccountName | varchar | YES | null | Tên chủ tài khoản. Null khi Type = 0 |
| IsActive | boolean | NO | — | Trạng thái cho phép thanh toán. true = cho phép, false = không |
| IsDelete | boolean | NO | — | Soft delete flag. true = đã xoá |
| IsPrintInInvoice | boolean | NO | — | Có in trên hoá đơn hay không |
| IsPrintInCashInvoice | boolean | NO | false | Có in trên hoá đơn tiền mặt hay không |
| CreatedDate | bigint | NO | — | Timestamp tạo bản ghi (Unix epoch milliseconds) |
| ModifiedDate | bigint | NO | — | Timestamp cập nhật gần nhất (Unix epoch milliseconds) |

Bảng: Bank (master data, read-only)

| Trường | Kiểu dữ liệu | Nullable | Max Length | Mô tả |
|---|---|---|---|---|
| Id | varchar(32) | NO | 32 | Primary key |
| ExternalId | integer | NO | — | ID từ hệ thống nguồn bên ngoài |
| BinCode | integer | NO | — | Mã BIN của ngân hàng |
| Code | varchar(10) | NO | 10 | Mã viết tắt ngân hàng (VD: VCB, STB) |
| Name | varchar(255) | NO | 255 | Tên đầy đủ ngân hàng |
| ShortName | varchar(20) | NO | 20 | Tên viết tắt ngân hàng |
| Logo | text | YES | — | URL logo ngân hàng |
| IsDelete | boolean | NO | false | Soft delete flag |

#### 4.3. Dữ liệu master & migration

Bank: Dữ liệu master gồm 65 ngân hàng, đã tồn tại trong hệ thống. Chỉ đọc (read-only), không cần migration

PaymentMethod: Dữ liệu do người dùng tạo theo từng Merchant, không cần migration

### 5. YÊU CẦU PHI CHỨC NĂNG (Non-Functional Requirements)

| Mã | Nhóm | Yêu cầu | Tiêu chí đo lường |
|---|---|---|---|
| NFR-001 | Performance | Thời gian load danh sách | ≤ 3 giây với 95% request |
| NFR-002 | Performance | Response time API | ≤ 500ms (P95) |
| NFR-003 | Security | Xác thực & phân quyền | JWT, phân quyền theo role + MerchantId |
| NFR-004 | Security | Data isolation | Mỗi Merchant chỉ xem/sửa dữ liệu của mình |
| NFR-005 | Usability | Responsive | Hỗ trợ desktop (Web Manager) |
| NFR-006 | Compatibility | Trình duyệt | Chrome, Edge (2 phiên bản gần nhất) |
| NFR-007 | Audit | Logging | Log toàn bộ hành động Create/Update/Delete trên PaymentMethod |
| NFR-008 | Localization | Ngôn ngữ | Tiếng Việt |

### 6. PHÂN QUYỀN (Authorization Matrix)

| Chức năng | Admin |
|---|---|
| Xem danh sách phương thức thanh toán | ✅ |
| Tạo mới phương thức chuyển khoản | ✅ |
| Chỉnh sửa phương thức chuyển khoản | ✅ |
| Xoá phương thức chuyển khoản | ✅ |
| Bật/tắt thanh toán tiền mặt | ✅ |

### 7. TÍCH HỢP HỆ THỐNG (Integration Requirements)

| # | Hệ thống | Hướng tích hợp | Phương thức | Tần suất | Ghi chú |
|---|---|---|---|---|---|
| 1 | Module Quỹ (Phiếu thu / Phiếu chi) | Internal | Shared DB | Realtime | Phiếu thu/chi reference PaymentMethod khi chọn phương thức thanh toán |
| 2 | Danh mục ngân hàng (Bank) | Inbound | Seed data | One-time | Dữ liệu master được import sẵn |

### 9. RỦI RO & VẤN ĐỀ MỞ (Risks & Open Issues)

| # | Loại | Mô tả | Mức độ | Trạng thái |
|---|---|---|---|---|
| 1 | Open Question | Cột "Sổ tài khoản" trên bảng danh sách hiển thị giá trị "Bán hàng" — cần xác nhận nguồn dữ liệu và ý nghĩa nghiệp vụ của trường này (không tìm thấy trong DB schema hiện tại) | Medium | Open |
| 2 | Open Question | Xác nhận giới hạn ký tự tối đa cho các field: Tên gợi nhớ, Số tài khoản, Tên tài khoản | Low | Open |
| 3 | Open Question | Khi xoá phương thức thanh toán đang được sử dụng trong phiếu thu/chi chưa hoàn tất, hệ thống xử lý như thế nào? Có chặn xoá hay không? | High | Open |

### PHÊ DUYỆT (Sign-off)

| Vai trò | Họ tên | Chữ ký / Xác nhận | Ngày |
|---|---|---|---|
| Product Owner |  |  |  |
| BA/PM | Thư |  |  |
| Tech Lead |  |  |  |