---
name: tms-delivery-coordination
description: Điều phối một ticket TMS trọn vòng đời — pick ticket hợp lệ → mở plan.md → BA spec.md → PO clear → giao Dev → Dev handoff.md → QA verdict.md PASS → Dev tạo PR → (user duyệt) merge → READY TO STAGING. Dùng khi Điều phối TMS giao task cho BA/Dev/QA TMS theo quy trình tuần tự và artifact-gated của anh Văn Toàn.
---

# TMS Delivery Coordination

Một ticket chỉ đi qua các cổng theo đúng thứ tự. Không bao giờ nhảy cổng, không gộp task, **không giao bước tiếp theo nếu artifact của bước trước chưa tồn tại trên đĩa**.

## Cổng artifact bắt buộc (hard gate)

Trước mỗi lần chuyển bước, tự kiểm tra file trên đĩa (không tin lời kể trong chat):

- Mở run → phải tạo `test -f /home/vif/tuanvu/dev-team/reports/tms/orchestrator/<RUN-id>/plan.md` trước khi giao BA.
- Giao Dev (sau khi PO clear) → phải có `test -f /home/vif/tuanvu/dev-team/reports/tms/ba/<KEY>/spec.md` và xác nhận PO đã duyệt spec.
- Giao QA → phải có `test -f /home/vif/tuanvu/dev-team/reports/tms/dev/<KEY>/handoff.md` (ghi đủ branch, commit, lệnh verify) và `./scripts/stack.sh status` không còn giữ lock bởi Dev (`stopped`).
- Cho Dev tạo PR / chuyển BA cập nhật SRS & báo PO → phải có `test -f /home/vif/tuanvu/dev-team/reports/tms/qa/<KEY>/verdict.md` với kết quả `PASS` cho mọi done-condition.
- Chốt run → ghi `test -f /home/vif/tuanvu/dev-team/reports/tms/orchestrator/<RUN-id>/status.md`.

Thiếu file bước trước = **chặn tại cổng**, yêu cầu bot sở hữu ghi đủ artifact trước khi chuyển tiếp; tuyệt đối không nhờ PO nhắc hay làm người chuyển tin.

## 1. Pick ticket & chuẩn hóa spec

- Chỉ pick ticket ở trạng thái **READY TO DEVELOP** hoặc **IN DEVELOP**, và phải **assign cho Văn Toàn**. Ticket assign cho người khác → bỏ qua, báo user (không tự re-assign trừ khi user bảo).
- KHÔNG đụng ticket ON STAGING.
- Mở `reports/tms/orchestrator/<RUN-id>/plan.md` từ `templates/orchestrator-run.md`, giao BA viết `reports/tms/ba/<KEY>/spec.md` từ `templates/ba-spec.md`, rồi trình anh Văn Toàn (PO) clear trước khi giao Dev.

## 2. Bắt đầu implement (chỉ sau khi PO clear & có `spec.md`)

- Kiểm tra `test -f /home/vif/tuanvu/dev-team/reports/tms/ba/<KEY>/spec.md`.
- Kéo ticket sang **IN DEVELOP** ngay khi giao (không để ở READY TO DEVELOP).
- Giao Dev TMS kèm: ticket id + link Jira, đường dẫn `spec.md`, scope allow/deny theo từng repo, `done_when`, nhánh `fix/ITMS-<n>-<slug>`, yêu cầu dùng `scripts/stack.sh up dev-tms <KEY> <commit|worktree> --dev` nếu cần chạy stack (và `stack.sh down` trước khi bàn giao QA), ghi `reports/tms/dev/<KEY>/handoff.md`. Ghi rõ: **không tạo PR trước QA PASS**.
- Nếu ticket có file mẫu đính kèm (Excel, mockup): nhắc Dev file mẫu là chuẩn output; khi file mẫu và text ticket lệch nhau, Dev làm theo text và **flag điểm lệch** để QA/user quyết.

## 3. Gate QA (chỉ sau khi có `handoff.md` & stack đã nhả lock)

- Kiểm tra `test -f /home/vif/tuanvu/dev-team/reports/tms/dev/<KEY>/handoff.md` và `./scripts/stack.sh status` không còn bận.
- Giao QA TMS verify **độc lập** trên `scripts/stack.sh up qa-tms <KEY> <commit>` — tự đăng nhập, tự xuất/chạy, không dùng file hay lời Dev. Brief QA nêu rõ từng điều kiện kiểm (đủ cột, từng BR merge, format, regression quyền 401/403, regression các export/màn khác) và done = PASS/FAIL từng điều kiện kèm bằng chứng trong `reports/tms/qa/<KEY>/verdict.md` + `evidence/`, xong phải chạy `scripts/stack.sh down`.
- QA FAIL/blocked → giao lại Dev fix theo lỗi QA báo (Dev commit mới, tăng "Lần bàn giao" trong `handoff.md`). Chỉ qua task tiếp khi task hiện tại code xong và `verdict.md` PASS.

## 4. PR (chỉ sau `verdict.md` PASS & BA cập nhật SRS/ADR)

- Kiểm tra `test -f /home/vif/tuanvu/dev-team/reports/tms/qa/<KEY>/verdict.md` (PASS) và yêu cầu BA cập nhật `docs/tms/srs/*.md` / `docs/tms/adr/*.md`.
- Cho Dev tạo PR. **PR title tiếng Anh đầy đủ** mô tả thay đổi (không viết tắt ticket-slug); **các heading trong description tiếng Anh** (Scope / What Changed / How QA Verified / Known Deviations / Tickets / Out of Scope); thân theo template cũ. Nêu QA PASS + điểm lệch file mẫu nếu có.

## 5. Merge & chốt

- User bảo merge → Dev squash merge, xoá nhánh, báo merge commit.
- Sau khi có PR (hoặc merge): comment bằng chứng QA + link PR lên Jira, kéo ticket → **READY TO STAGING**.
- Cập nhật `reports/tms/orchestrator/<RUN-id>/status.md`.
- Không thay PO phê duyệt; chỉ user (Văn Toàn) duyệt merge và quyết điểm lệch spec.

## Báo cáo

- Mỗi bước báo user gọn: trạng thái ticket, số/link PR, kết quả QA dạng bảng, đường dẫn artifact, điểm cần user quyết (nếu có).
- Track artifacts: mỗi run ghi `plan.md`/`status.md` tại `/home/vif/tuanvu/dev-team/reports/tms/orchestrator/<YYYY-MM-DD-muc-tieu>/`; spec ở `reports/tms/ba/<KEY>/`, handoff ở `reports/tms/dev/<KEY>/`, verdict ở `reports/tms/qa/<KEY>/` — xem `FLOW.md`.

Nguồn: đúc kết từ vòng đời ITMS-381 (export đơn vận chuyển, PR #130, merge 4d1531b) — session Điều phối TMS 2026-11-19/20.
