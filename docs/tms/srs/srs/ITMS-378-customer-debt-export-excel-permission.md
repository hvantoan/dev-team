# SRS — ITMS-378: Phân quyền hiển thị nút Xuất Excel Công nợ khách hàng

| Trường | Giá trị |
|---|---|
| Mã ticket | ITMS-378 |
| Loại | Bug (defect phân quyền UI) |
| Module | TMS — Công nợ khách hàng (Customer Debt) |
| Màn hình | Công nợ khách hàng; popup Lịch sử giao dịch |
| Nguồn | Jira ITMS-378 (nguyên văn do Điều phối TMS chuyển) |
| Người soạn | BA TMS |
| Ngày soạn | 2026-11-18 |
| Trạng thái | **Draft — chờ PO (anh Văn Toàn) duyệt scope** |
| Phiên bản | v0.1 |

---

## 1. Bối cảnh & vấn đề

Chức năng xuất Excel công nợ khách hàng đã được phân quyền ở tầng server: người dùng không có quyền
vẫn bấm được nút và chỉ nhận thông báo *"Bạn không có quyền xuất Excel công nợ khách hàng"*.

Về mặt nghiệp vụ đây là lỗi hiển thị (permission leak ở UI): hệ thống đang **mời** người dùng thực hiện
một hành động mà họ chắc chắn không được phép, gây hiểu nhầm là lỗi hệ thống và phát sinh yêu cầu hỗ trợ
không cần thiết. Nguyên tắc đúng: **quyền quyết định sự tồn tại của hành động trên UI; server vẫn là
lớp chặn cuối cùng.**

Lỗi xuất hiện đồng thời ở 2 vị trí có cùng một hành động xuất Excel:

- **VT1** — nút Xuất Excel trên thanh filter của màn hình Công nợ khách hàng.
- **VT2** — nút Xuất Excel trên header popup Lịch sử giao dịch (mở từ mã khách hàng).

## 2. Phạm vi

**Trong phạm vi**

- Sửa điều kiện hiển thị nút Xuất Excel ở VT1 và VT2 theo quyền của người dùng đang đăng nhập.
- Giữ nguyên toàn bộ hành vi xuất file cho người dùng **có** quyền (không đổi nội dung, không đổi filter,
  không đổi định dạng file).
- Giữ nguyên thông báo lỗi ở tầng server khi bị gọi trực tiếp (không có quyền) — đây là fallback, không
  được gỡ bỏ.

**Ngoài phạm vi**

- Thiết kế lại thanh filter hoặc popup Lịch sử giao dịch.
- Thay đổi nội dung/định dạng file Excel, thay đổi công thức tính công nợ.
- Thêm/xoá/chia nhỏ mã quyền; thay đổi cơ chế gán quyền cho người dùng.
- Các nút xuất Excel khác trong module Công nợ (công nợ nhà cung cấp, công nợ nội bộ…) — nếu phát hiện
  cùng lỗi thì tách ticket riêng (xem §9 câu hỏi mở Q3).

## 3. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Quyền xuất Excel công nợ KH | Quyền cho phép tải file Excel công nợ khách hàng theo bộ lọc hiện tại |
| VT1 | Nút Xuất Excel trên thanh filter màn hình Công nợ khách hàng |
| VT2 | Nút Xuất Excel trên header popup Lịch sử giao dịch |
| Người dùng không có quyền | Tài khoản đăng nhập thành công nhưng **không** được gán quyền xuất Excel công nợ KH |
| Fallback server | Cơ chế chặn ở API: trả lỗi kèm thông báo *"Bạn không có quyền xuất Excel công nợ khách hàng"* khi bị gọi trực tiếp |

## 4. Quy tắc nghiệp vụ

| Mã | Quy tắc |
|---|---|
| **BR-CDEBT-001** | Nút Xuất Excel công nợ KH chỉ tồn tại trên UI khi người dùng đang đăng nhập **có** quyền xuất Excel công nợ KH. Không có quyền → không render nút (không chỉ làm mờ, không chỉ disable). |
| **BR-CDEBT-002** | BR-CDEBT-001 áp dụng thống nhất cho **mọi** vị trí có cùng hành động xuất Excel trong module, tối thiểu gồm VT1 và VT2. Một nguồn quyền, một cách kiểm tra. |
| **BR-CDEBT-003** | Ẩn nút trên UI **không thay thế** kiểm tra quyền ở server. API export vẫn phải từ chối request không có quyền bằng đúng thông báo hiện hành. |
| **BR-CDEBT-004** | Sự hiển thị của nút **không phụ thuộc dữ liệu**: filter không có kết quả, danh sách rỗng, hay đang tải dữ liệu đều không làm nút biến mất với người dùng có quyền. |

## 5. Tiền điều kiện & dữ liệu kiểm thử

| Mã | Điều kiện |
|---|---|
| P1 | Tài khoản A: **không** có quyền xuất Excel công nợ KH, có quyền xem màn hình Công nợ KH. |
| P2 | Tài khoản B: **có** quyền xuất Excel công nợ KH. |
| P3 | Có dữ liệu công nợ của khách hàng KH-05 (Kiwi) trong kỳ 16/10/2026 – 16/11/2026, loại "Phát sinh trong kỳ". |
| P4 | Có ít nhất một khách hàng **không** phát sinh giao dịch trong kỳ (để kiểm tra BR-CDEBT-004). |

## 6. Acceptance Criteria (chuẩn hoá)

### 6.1. Nhóm KHÔNG có quyền (tài khoản A)

**AC-01 — Ẩn nút ở VT1 (thanh filter)**
Given người dùng đăng nhập bằng tài khoản **không** có quyền xuất Excel công nợ KH
And người dùng mở màn hình Công nợ khách hàng
When màn hình tải xong (đã chọn Ngày bắt đầu 16/10/2026, Ngày kết thúc 16/11/2026, Loại "Phát sinh trong kỳ")
Then **không** hiển thị nút Xuất Excel trên thanh filter
And **không** có phần tử nút này trong DOM/accessible tree ở trạng thái idle (khuyến nghị: dùng cơ chế
không render, không phải `visibility`/`opacity`)
And không có vùng trống/chỗ trống bất thường làm lệch layout thanh filter.

**AC-02 — Ẩn nút ở VT2 (popup Lịch sử giao dịch)**
Given người dùng là tài khoản A, đang ở màn hình Công nợ khách hàng
When người dùng nhấn mã khách hàng KH-05 - Kiwi để mở popup Lịch sử giao dịch
Then popup mở bình thường
And **không** hiển thị nút Xuất Excel trên header popup
And không có phần tử nút này trong DOM/accessible tree của popup
And các thành phần khác của header popup (tiêu đề, nút đóng) hiển thị và hoạt động bình thường.

**AC-03 — Server vẫn chặn (fallback)**
Given người dùng là tài khoản A
When người dùng gọi trực tiếp API xuất Excel (không qua UI, ví dụ dán URL/curl với token hợp lệ)
Then API trả về từ chối kèm thông báo *"Bạn không có quyền xuất Excel công nợ khách hàng"*
And **không** tạo/không tải file Excel
And không lộ dữ liệu công nợ trong response.

**AC-04 — Không điều hướng được tới hành động bị ẩn**
Given người dùng là tài khoản A
When người dùng dùng bàn phím (Tab) hoặc trình đọc màn hình duyệt qua thanh filter và header popup
Then không có điểm dừng focus nào trỏ tới hành động xuất Excel
And không có tooltip/nhãn ẩn nào mô tả hành động này.

### 6.2. Nhóm CÓ quyền (tài khoản B) — chống hồi quy

**AC-05 — Hiển thị và xuất được ở VT1**
Given người dùng là tài khoản B
And đã chọn filter Ngày bắt đầu 16/10/2026, Ngày kết thúc 16/11/2026, Loại "Phát sinh trong kỳ"
When người dùng bấm Xuất Excel trên thanh filter
Then file Excel được tải về thành công
And dữ liệu trong file khớp đúng bộ lọc và khớp số liệu hiển thị trên màn hình
And trong lúc xử lý, nút chuyển trạng thái loading/disable và không tạo được nhiều file do bấm lặp.

**AC-06 — Hiển thị và xuất được ở VT2**
Given người dùng là tài khoản B
When người dùng mở popup Lịch sử giao dịch của KH-05 - Kiwi
And bấm Xuất Excel trên header popup
Then file Excel lịch sử giao dịch của đúng khách hàng đó được tải về thành công.

**AC-07 — Không phụ thuộc dữ liệu (BR-CDEBT-004)**
Given người dùng là tài khoản B
When người dùng chọn kỳ lọc trả về **0 bản ghi** (khách hàng không phát sinh giao dịch)
Then nút Xuất Excel vẫn hiển thị ở VT1
And khi bấm, hệ thống xử lý theo hành vi hiện hành (file rỗng có header cột, hoặc thông báo không có dữ liệu) —
ghi nhận hành vi thực tế để PO chốt, không tự thay đổi trong ticket này.

**AC-08 — Thu hồi quyền giữa phiên**
Given người dùng là tài khoản B đang mở sẵn màn hình Công nợ khách hàng
When quản trị thu hồi quyền xuất Excel của tài khoản này
Then sau khi người dùng tải lại trang/đăng nhập lại, nút ẩn ở cả VT1 và VT2 (theo AC-01, AC-02)
And nếu trước khi tải lại người dùng bấm xuất, hệ thống vẫn từ chối theo fallback server (AC-03) — không
phát sinh file.

### 6.3. Ma trận hiển thị

| Quyền xuất Excel công nợ KH | VT1 (thanh filter) | VT2 (header popup) | Gọi API trực tiếp |
|---|---|---|---|
| Không có | Ẩn | Ẩn | Từ chối + thông báo hiện hành |
| Có | Hiện, xuất được | Hiện, xuất được | Thành công, trả file |

## 7. Phạm vi màn hình ảnh hưởng

| # | Màn hình / thành phần | Ảnh hưởng |
|---|---|---|
| 1 | Công nợ khách hàng — thanh filter | Điều kiện hiển thị nút Xuất Excel (VT1) |
| 2 | Công nợ khách hàng — bảng dữ liệu, phân trang, tổng hợp | Không đổi (kiểm tra hồi quy) |
| 3 | Popup Lịch sử giao dịch — header | Điều kiện hiển thị nút Xuất Excel (VT2) |
| 4 | Popup Lịch sử giao dịch — nội dung, cuộn, đóng popup | Không đổi (kiểm tra hồi quy) |
| 5 | API export công nợ KH và API export lịch sử giao dịch | Không đổi hành vi; giữ nguyên kiểm tra quyền |
| 6 | Các màn hình Công nợ khác có nút Xuất Excel | **Không** thuộc ticket này; nếu cùng lỗi thì tách ticket |

## 8. Điểm QA cần chụp bằng chứng

| Mã | Bằng chứng | Định dạng |
|---|---|---|
| E1 | Màn hình Công nợ KH với tài khoản A: thanh filter **không** có nút Xuất Excel, kèm ảnh chụp vùng filter phóng to | Ảnh |
| E2 | Popup Lịch sử giao dịch KH-05 với tài khoản A: header **không** có nút Xuất Excel | Ảnh |
| E3 | Cùng 2 vị trí với tài khoản B: nút hiển thị đầy đủ (đối chứng) | Ảnh |
| E4 | Video luồng tài khoản A: đăng nhập → mở màn hình → mở popup → Tab qua filter/header, chứng minh không có điểm dừng focus vào nút | Video ≤ 60s |
| E5 | Gọi API export trực tiếp bằng token tài khoản A: log/response 403 + thông báo, không có file tải về (che token khi chụp) | Ảnh/log |
| E6 | File Excel tải về của tài khoản B: mở file, đối chiếu số liệu với màn hình theo filter 16/10/2026 – 16/11/2026 | Ảnh + file đính kèm |
| E7 | Trường hợp 0 bản ghi: nút vẫn hiển thị và hành vi khi bấm (ghi nhận để PO chốt) | Ảnh |
| E8 | DevTools/DOM của cả 2 vị trí với tài khoản A: không tồn tại node nút (khuyến nghị) | Ảnh |

**Definition of Done của ticket:** AC-01 → AC-08 PASS; E1 → E7 đầy đủ (E8 khuyến nghị); không phát sinh
lỗi hồi quy ở các mục "Không đổi" trong §7.

## 9. Câu hỏi mở (cần PO / Điều phối chốt trước khi Dev làm)

| # | Câu hỏi | Đề xuất của BA |
|---|---|---|
| Q1 | VT1 và VT2 dùng **cùng một mã quyền** xuất Excel công nợ KH, hay popup Lịch sử giao dịch có mã quyền riêng? | Giả định: cùng một mã quyền (BR-CDEBT-002). Nếu khác, cần bổ sung AC riêng cho từng mã. |
| Q2 | Kỳ lọc 0 bản ghi: xuất file rỗng có header hay chặn bằng thông báo? | Giữ nguyên hành vi hiện tại, ghi nhận ở AC-07, không mở rộng scope. |
| Q3 | Các màn hình công nợ khác (nhà cung cấp, nội bộ) có cùng lỗi ẩn/hiện nút? | Tách ticket riêng để không phình scope ITMS-378. |
| Q4 | Mã quyền thực tế trong hệ thống để Dev tham chiếu? | Cần Điều phối TMS hoặc anh Toàn cung cấp; BA không có quyền Jira/repo để xác nhận. |

## 10. Truy vết Jira → AC

| Bước Jira | AC tương ứng |
|---|---|
| (1) Đăng nhập tài khoản không có quyền | P1 |
| (2) Vào màn hình Công nợ khách hàng | AC-01 |
| (3) Chọn kỳ 16/10/2026 – 16/11/2026, "Phát sinh trong kỳ" | AC-01, AC-05 |
| (4) Quan sát nút Xuất Excel trên thanh filter | AC-01 |
| (5) Nhấn KH-05 - Kiwi mở popup Lịch sử giao dịch | AC-02 |
| (6) Quan sát nút Xuất Excel ở header popup | AC-02 |
| Actual: bấm mới báo không có quyền | AC-01, AC-02, AC-03 |
| Expected: ẩn khi không có quyền; hiện và export được khi có quyền | AC-01 → AC-08 |
