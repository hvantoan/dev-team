---
name: tms-delivery-coordination
description: Điều phối một ticket trọn vòng đời — pick ticket hợp lệ → mở plan.md → BA spec.md → PO clear → giao Dev → Dev handoff.md → QA verdict.md PASS → Dev tạo PR → (user duyệt) merge → READY TO STAGING. Dùng khi Điều phối giao task cho BA/Dev/QA theo quy trình tuần tự và artifact-gated của anh Văn Toàn; project suy từ ticket key (`ITMS-` → tms, `CB-` → chatbotx).
---

# Delivery Coordination

Một ticket chỉ đi qua các cổng theo đúng thứ tự. Không bao giờ nhảy cổng, không gộp task, **không giao bước tiếp theo nếu artifact của bước trước chưa tồn tại trên đĩa**.

`<proj>` suy từ ticket key hoặc brief: `ITMS-` → `tms`, `CB-` → `chatbotx`. Mọi đường dẫn và lệnh stack lấy theo `projects/<proj>.json`.

## Cổng artifact bắt buộc (hard gate)

Trước mỗi lần chuyển bước, tự kiểm tra file trên đĩa (không tin lời kể trong chat):

- Mở run → phải tạo `test -f /home/vif/tuanvu/dev-team/reports/<proj>/orchestrator/<RUN-id>/plan.md` trước khi giao BA.
- Giao Dev (sau khi PO clear) → phải có `test -f /home/vif/tuanvu/dev-team/reports/<proj>/ba/<KEY>/spec.md` và xác nhận PO đã duyệt spec.
- Giao QA → phải có `test -f /home/vif/tuanvu/dev-team/reports/<proj>/dev/<KEY>/handoff.md` (ghi đủ branch, commit, lệnh verify) và stack của project không còn giữ lock bởi Dev (`stopped`).
- Cho Dev tạo PR / chuyển BA cập nhật SRS & báo PO → phải có `test -f /home/vif/tuanvu/dev-team/reports/<proj>/qa/<KEY>/verdict.md` với kết quả `PASS` cho mọi done-condition.
- Chốt run → ghi `test -f /home/vif/tuanvu/dev-team/reports/<proj>/orchestrator/<RUN-id>/status.md`.

Thiếu file bước trước = **chặn tại cổng**, yêu cầu bot sở hữu ghi đủ artifact trước khi chuyển tiếp; tuyệt đối không nhờ PO nhắc hay làm người chuyển tin.

## 1. Pick ticket & chuẩn hóa spec

- Chỉ pick ticket ở trạng thái **READY TO DEVELOP** hoặc **IN DEVELOP**, và phải **assign cho Văn Toàn**. Ticket assign cho người khác → bỏ qua, báo user (không tự re-assign trừ khi user bảo).
- KHÔNG đụng ticket ON STAGING.
- Mở `reports/<proj>/orchestrator/<RUN-id>/plan.md` từ `templates/orchestrator-run.md`, giao BA viết `reports/<proj>/ba/<KEY>/spec.md` từ `templates/ba-spec.md`, rồi trình anh Văn Toàn (PO) clear trước khi giao Dev.

## 2. Bắt đầu implement (chỉ sau khi PO clear & có `spec.md`)

- Kiểm tra `test -f /home/vif/tuanvu/dev-team/reports/<proj>/ba/<KEY>/spec.md`.
- Kéo ticket sang **IN DEVELOP** ngay khi giao (không để ở READY TO DEVELOP).
- Giao Dev kèm: ticket id + link Jira, đường dẫn `spec.md`, scope allow/deny theo từng repo, `done_when`, nhánh theo repo, lệnh stack nếu cần chạy (và lệnh dừng trước khi bàn giao QA), ghi `reports/<proj>/dev/<KEY>/handoff.md`. Ghi rõ: **không tạo PR trước QA PASS**.
- Nhánh: TMS `fix/ITMS-<n>-<slug>`; ChatbotX `feat|fix/CB-<n>-<slug>` (theo `.agents/rules/git.md` của repo).
- Nếu ticket có file mẫu đính kèm (Excel, mockup): nhắc Dev file mẫu là chuẩn output; khi file mẫu và text ticket lệch nhau, Dev làm theo text và **flag điểm lệch** để QA/user quyết.

## 3. Gate QA (chỉ sau khi có `handoff.md` & stack đã nhả lock)

- Kiểm tra `test -f /home/vif/tuanvu/dev-team/reports/<proj>/dev/<KEY>/handoff.md` và stack không còn bận.
- Giao QA verify **độc lập** bằng `stack.run` của project (TMS: `scripts/stack.sh up qa-tms <KEY> <commit>`; ChatbotX: `./scripts/dev-up.sh`) — tự đăng nhập, tự xuất/chạy, không dùng file hay lời Dev. Brief QA nêu rõ từng điều kiện kiểm và done = PASS/FAIL từng điều kiện kèm bằng chứng trong `reports/<proj>/qa/<KEY>/verdict.md` + `evidence/`, xong phải dừng stack.
- QA FAIL/blocked → giao lại Dev fix theo lỗi QA báo (Dev commit mới, tăng "Lần bàn giao" trong `handoff.md`). Chỉ qua task tiếp khi task hiện tại code xong và `verdict.md` PASS.

## 4. PR (chỉ sau `verdict.md` PASS & BA cập nhật SRS/ADR)

- Kiểm tra `test -f /home/vif/tuanvu/dev-team/reports/<proj>/qa/<KEY>/verdict.md` (PASS) và yêu cầu BA cập nhật `docs/<proj>/srs/*.md` / `docs/<proj>/adr/*.md`.
- Cho Dev tạo PR. **PR title tiếng Anh đầy đủ** mô tả thay đổi (không viết tắt ticket-slug); **các heading trong description tiếng Anh** (Scope / What Changed / How QA Verified / Known Deviations / Tickets / Out of Scope). ChatbotX theo `.agents/rules/git.md`: title `<type>(<scope>): <subject>`, reference issue trong title/body, không commit thẳng `main`.
- Nêu QA PASS + điểm lệch file mẫu nếu có.

## 5. Merge & chốt

- User bảo merge → Dev squash merge, xoá nhánh, báo merge commit.
- Sau khi có PR (hoặc merge): comment bằng chứng QA + link PR lên Jira, kéo ticket → **READY TO STAGING**.
- Cập nhật `reports/<proj>/orchestrator/<RUN-id>/status.md`.
- Không thay PO phê duyệt; chỉ user (Văn Toàn) duyệt merge và quyết điểm lệch spec.

## Báo cáo

- Mỗi bước báo user gọn: trạng thái ticket, số/link PR, kết quả QA dạng bảng, đường dẫn artifact, điểm cần user quyết (nếu có).
- Track artifacts: mỗi run ghi `plan.md`/`status.md` tại `reports/<proj>/orchestrator/<YYYY-MM-DD-muc-tieu>/`; spec ở `reports/<proj>/ba/<KEY>/`, handoff ở `reports/<proj>/dev/<KEY>/`, verdict ở `reports/<proj>/qa/<KEY>/` — xem `FLOW.md`.

Nguồn: đúc kết từ vòng đời ITMS-381 (export đơn vận chuyển, PR #130, merge 4d1531b) — session Điều phối TMS 2026-11-19/20; mở rộng đa project cho ChatbotX (CB) 2026-11-23.
