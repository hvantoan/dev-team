---
name: ba-ticket-to-srs-br
description: Đúc kết ticket Jira TMS thành rule nghiệp vụ (BR) và section SRS trình PO duyệt. Dùng khi BA TMS nhận ticket cần viết lại AC/BR — đặc biệt ticket có file mẫu đính kèm (Excel/ẩn thị output) hoặc yêu cầu export Excel có merge cell. Bao gồm cách phát hiện và flag mâu thuẫn giữa file mẫu và text ticket.
---

# BA: từ ticket Jira → BR/SRS trình PO

Quy trình chuẩn của BA TMS để biến mô tả ticket Jira thành tài liệu nghiệp vụ
anh Văn Toàn duyệt trước khi Dev implement. BA không có quyền Jira — đầu vào
là text/đính kèm Điều phối TMS chuyển.

## Bước 1 — Đọc SRS module liên quan TRƯỚC

- Mỗi module có một SRS trong `/home/vif/tuanvu/dev-team/docs/tms/srs/`
  (nhiều file là docx → convert sang text bằng pandoc, xem skill
  `ba-srs-docx-env-check`).
- Trích ra: vai trò/quyền của module, các BR đã đánh số (xác định prefix và
  số thứ tự lớn nhất), cấu trúc dữ liệu (bảng/field) mà yêu cầu ticket đụng tới.
- Map yêu cầu ticket vào data model. Ví dụ ITMS-381 ("thêm cột sản phẩm &
  giá cước vào export đơn giao hàng") → nguồn là `delivery_order_item`
  (mã/tên SP, quantity) và `delivery_order_price_range` (from_date, to_date,
  price) — ghi rõ nguồn này vào phân tích để Dev không phải mò.
- Nếu SRS chưa có section cho tính năng ticket đụng (VD SRS Đơn vận chuyển
  v1.1 chưa có mục export) → ghi nhận là gap, sẽ bổ sung section mới thay vì
  nhét vào section sai.

## Bước 2 — Đối chiếu file mẫu đính kèm vs text ticket

Khi ticket đính kèm file mẫu (Excel, ảnh output), hai nguồn này PHẢI được
đối chiếu từng ô:

1. File mẫu là source of truth cho **format output**: tên cột, thứ tự cột,
   merge cell (group header), định dạng số/ngày, dòng tổng.
2. Text ticket là source of truth cho **thay đổi yêu cầu**: thêm/bỏ cột nào,
   đổi hành vi nào.
3. Lập bảng diff: với mỗi cột/mục, ghi "file mẫu có / ticket nói bỏ",
   "ticket thêm / file mẫu không có", "cả hai khác nhau về X".
4. Mọi điểm lệch KHÔNG tự quyết — đưa vào mục Open Questions flag trình PO.
   Ví dụ: ticket nói "bỏ cột địa chỉ lấy/giao" nhưng file mẫu vẫn có, hoặc
   file mẫu merge header nhóm mà text không đề cập → hỏi rõ giữ hay bỏ merge.
5. Kiểm tra hiện trạng code qua Dev: hỏi Dev TMS xác nhận cột export hiện có
   (VD `buildDeliveryOrderExcel` đang có "Nơi giao/Nơi nhận") để diff 3 chiều:
   hiện trạng → ticket → file mẫu.

## Bước 3 — Viết BR

Quy ước đang dùng trong team:

- Tên: `BR-<PREFIX>-<NNN>` — prefix theo module/tính năng (BR-PQ phân quyền,
  BR-CDEBT công nợ KH, BR-DOEX export đơn hàng, BR-CNNCC công nợ NCC,
  BR-DGH đơn giao hàng). Grep SRS tương ứng lấy số tiếp theo, không trùng
  (VD DOEX đã tới 006 → viết 007→009). Dùng `\b` khi grep một rule cụ thể.
- Mỗi BR một câu: điều kiện → hành vi bắt buộc (từ in đậm cho mấu chốt:
  **không**, **phải**, **mọi**). Kèm căn cứ ticket ở cột/ghi chú cuối.
- Rule phân quyền (đúc kết từ nhóm bug ITMS-382→388): không có quyền View →
  403, không phải bảng trống; không có quyền action → **ẩn hoàn toàn** nút,
  không chỉ disable; Add/Edit/Delete phải kèm View cùng module (dep
  cross-module là bổ sung, không thay thế); ẩn nút UI không thay thế check
  quyền server.
- Export Excel đặc thù: BR phải nêu nguồn dữ liệu từng cột mới, hành vi khi
  dữ liệu rỗng (đơn không có item/price range → để trống hay bỏ dòng), cột bị
  bỏ phải nêu tường minh (không mặc định hiểu), merge cell phải có BR riêng
  nếu giữ.

## Bước 4 — Cấu trúc tài liệu trình duyệt

Theo mẫu `ITMS-378-customer-debt-export-excel-permission.md` và
`SRS-PhanQuyen-Permission.md`:

1. Bối cảnh/hiện trạng (đoạn vấn đề).
2. Phạm vi: In scope / Out of scope (liệt kê rõ cái KHÔNG làm).
3. Định nghĩa thuật ngữ/vị trí (VT1, VT2...) và actors/personas (P1, P2 với
   quyền cụ thể để QA dựng user test).
4. Bảng BR: ID | rule | trạng thái (Draft — căn cứ ITMS-xxx / đã duyệt).
5. AC dạng Gherkin (Given/When/Then) cho từng kịch bản QA sẽ verify.
6. Open Questions — bắt buộc có, nơi flag mọi mâu thuẫn file mẫu vs text và
   lựa chọn cần PO chốt.

Bảng rule theo ticket (khi xử lý nhóm ticket): ticket | module | rule đề xuất
| expected | bằng chứng QA | duyệt — để trống cột evidence chờ QA reproduce.

## Bước 5 — Sau QA PASS

Ghi lại vào SRS module: thay đổi hành vi, BR mới (VD BR-DOEX-007→009), link
ticket. Cập nhật changelog SRS (v0.x-draft → ghi ngày, người sửa, tóm tắt).

## Gotchas

- BA không có quyền Jira: mọi thông tin ticket lấy từ brief của Điều phối;
  thiếu gì hỏi lại, không suy đoán nội dung ticket.
- Đừng viết BR trùng số với rule đã có trong SRS — luôn grep prefix trước.
- Ticket nói "bỏ cột X" mà code/file mẫu vẫn có → đây là điểm dễ quên nhất
  trong AC; phải có kịch bản verify "cột X không còn trong file export".
- Rule chạm dữ liệu phải nêu phương án migrate/dọn dữ liệu lỗi (chỉ đạo anh
  Toàn 19/11) trước khi bàn giao QA.
