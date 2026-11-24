---
name: qa-browser-user-test
description: Verify a task as a real user with agent-browser — reproduce each test case defined for the task step by step in the UI, capture screenshots as evidence, and report PASS/FAIL per test case. Use for every QA verification of a feature with a UI, instead of writing Playwright scripts or heavy test suites.
---

# QA test như người dùng bằng agent-browser

Nguyên tắc: đóng vai người dùng, trải nghiệm tính năng đúng theo test case của task.
Không viết script Playwright, không dựng test suite nặng.

## Đầu vào
- Task/ticket + `reports/<proj>/ba/<KEY>/spec.md`: lấy danh sách **test case đã define** (bước, dữ liệu, kết quả mong đợi).
- `reports/<proj>/dev/<KEY>/handoff.md`: commit/branch, URL, tài khoản test.
- Lần đầu dùng CLI trong phiên: `agent-browser skills get core` để nắm cú pháp.

## Quy trình
1. Dựng stack theo SOUL.md (`stack.sh up` / `dev-up.sh`). Luôn dừng stack khi xong.
2. Dùng một session riêng cho QA để không đụng browser của người khác:
   `agent-browser --session qa-<KEY> open <url>`
3. Với từng test case, làm đúng các bước như người dùng:
   - `snapshot` để xem màn hình và lấy ref (`@e12`), rồi `click`/`fill`/`select`/`press`.
   - Đăng nhập bằng form login thật với tài khoản test (user có quyền và, nếu test case đòi, user không quyền).
   - Sau bước then chốt: `screenshot <evidence>/<TC-id>-<step>.png`, đọc lại `snapshot` để so với kết quả mong đợi.
   - File tải xuống: `download <sel> <path>` rồi mở kiểm tra nội dung (skill `qa-verify-export-local` cho xlsx).
4. Chỉ khi test case đòi kiểm dữ liệu hoặc mã lỗi không thấy trên UI: một lệnh curl/SQL ngắn, ghi lệnh + kết quả.
5. Ghi nhận thêm điều bất thường khi trải nghiệm (layout vỡ, thông báo khó hiểu, chậm) thành ghi chú UX; không tính FAIL nếu nằm ngoài test case.
6. Đóng browser: `agent-browser --session qa-<KEY> close`, rồi dừng stack.

## Báo cáo (`verdict.md`)
Bảng theo từng test case: ID · các bước đã làm · kết quả mong đợi · kết quả thấy được · PASS/FAIL/BLOCKED · đường dẫn screenshot.
FAIL ghi rõ expected vs actual và bước tái hiện. Thiếu screenshot/bằng chứng = FAIL.
Task không có test case define → báo `BLOCKED` và nhờ `BA` bổ sung, không tự nghĩ ra bộ test.
