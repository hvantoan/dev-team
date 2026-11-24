---
name: qa-verify-export-local
description: Independently verify an export/report feature on the local stack as QA — self-login privileged and unprivileged users, call the real export API, diff the produced xlsx against the ticket sample file and DB, check merge cells per business rule, regression-test 401/403 and sibling exports, then report PASS/FAIL per done-condition with evidence. Use when Dev TMS hands off any Excel/report export task or a ticket says export/xlsx/report.
---

# QA verify độc lập một feature export/report trên stack local

Nguồn: đúc kết từ session verify ITMS-381 (2026-11-19). Nguyên tắc gốc: QA không
tin lời Dev — mọi điều kiện done-when phải có bằng chứng tự tái tạo được.

## Khi nào dùng

- Dev TMS bàn giao một task có export Excel/report (xlsx, csv, pdf) hoặc thay đổi
  quyền truy cập một endpoint export.
- Ticket/UC đòi đối chiếu output với file mẫu hoặc mô tả layout trong UC.

## Đầu vào cần chốt trước

- File `reports/tms/dev/<KEY>/handoff.md`: đọc branch/commit của BE và FE (ghi rõ vào `verdict.md`).
- File mẫu đính kèm ticket hoặc mô tả layout trong UC.
- Danh sách điều kiện done-when (từ `spec.md` / brief bàn giao) — report theo
  từng điều kiện, không gộp.
- Tài khoản test từ `tests/tms/.env` và seed cố định `tests/tms/seed/`: một user CÓ quyền và một user KHÔNG quyền trên endpoint export.

## Quy trình

1. **Dựng stack local qua `scripts/stack.sh`** (tuyệt đối không tự chạy tiến trình nền, `next`, `go` hay `docker compose` trực tiếp):
   ```bash
   cd /home/vif/tuanvu/dev-team
   ./scripts/stack.sh up qa <KEY> <commit từ handoff.md>
   ```
   - Nếu ticket có cả commit FE và BE riêng: truyền `--fe <commit-fe> --be <commit-be>`.
   - Nếu `stack.sh up` báo `busy by <bot>` hoặc port bị chiếm → báo `BLOCKED` (hoặc yêu cầu bot đang giữ chạy `./scripts/stack.sh down`), không tự chuyển sang port khác.
   - Đảm bảo chạy `trap './scripts/stack.sh down' EXIT` hoặc luôn gọi `./scripts/stack.sh down` khi xong (kể cả FAIL hay BLOCKED).
2. **Login thật cả 2 vai trò**: lấy token/cookie của user có quyền lẫn user không
   quyền bằng API login thật trên stack local, không giả lập quyền trong code.
3. **Gọi export API thật** với user có quyền → tải file xlsx thật về máy.
   - Kiểm HTTP status, content-type, tên file (đúng convention ticket).
   - Trigger đủ tham số biên (filter rỗng, filter hẹp, khoảng ngày có/không có
     dữ liệu) nếu ticket yêu cầu.
4. **Đối chiếu 3 chiều**: file xuất ra ↔ file mẫu ticket ↔ dữ liệu DB.
   - Mở xlsx bằng script (python openpyxl hoặc tương đương): so header, thứ tự
     cột, số dòng, giá trị mẫu từng dòng đầu/cuối/ngẫu nhiên.
   - Với DB: query trực tiếp tập dữ liệu kỳ vọng trên Postgres local của stack, so count và giá trị khóa.
   - **Merge cell**: duyệt `worksheet.merged_cells.ranges`, đối chiếu từng BR
     (vùng nào được merge, theo key nào, khi nào KHÔNG được merge). Đây là lỗi
     hay trượt nhất — không đoán bằng mắt.
5. **Regression quyền**:
   - Không token → kỳ vọng 401.
   - Token user không quyền → kỳ vọng 403 (hoặc đúng mã ticket quy định).
   - Gọi lại các export khác cùng module chứng minh không bị vỡ.
6. **Giải phóng stack và báo cáo**:
   - Chạy `./scripts/stack.sh down` ngay sau khi thu thập xong bằng chứng.
   - Lập bảng PASS/FAIL/BLOCKED cho TỪNG điều kiện done-when, mỗi
     dòng kèm bằng chứng (lệnh đã chạy, status code, số dòng merge-cell, giá trị
     so khớp). FAIL phải nêu expected vs actual.
   - Lưu verdict chính thức tại `/home/vif/tuanvu/dev-team/reports/tms/qa/<ITMS-key>/verdict.md` (template `templates/qa-report.md`) kèm `evidence/`, ghi branch/commit/môi trường đầu report — xem `FLOW.md`.

## Quy tắc cứng

- Không tự dựng server bằng tay (tiến trình nền, `next`, `go run`, port phụ); mọi kiểm chứng chạy qua `scripts/stack.sh`.
- Không sửa code để "cho qua" — FAIL thì trả Dev kèm bằng chứng tái hiện.
- Không đánh PASS trên bằng chứng của Dev (ảnh chụp, log Dev gửi); chỉ PASS trên
  kết quả tự chạy.
- Phát hiện ngoài done-when (bug nhỏ không chặn): ghi mục riêng, KHÔNG đổi
  verdict vì nó.
- Nếu chặn vì môi trường (lock đang bận, port bị chiếm, thiếu seed/env): báo BLOCKED kèm điều kiện gỡ chặn, không im lặng.
