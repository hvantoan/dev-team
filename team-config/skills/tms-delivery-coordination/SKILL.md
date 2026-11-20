---
name: tms-delivery-coordination
description: Điều phối một ticket TMS trọn vòng đời — pick ticket hợp lệ → kéo IN DEVELOP → giao Dev → chờ QA PASS → Dev tạo PR → (user duyệt) merge → READY TO STAGING. Dùng khi Điều phối TMS giao task cho Dev TMS/QA TMS theo quy trình tuần tự của anh Văn Toàn.
---

# TMS Delivery Coordination

Một ticket chỉ đi qua các cổng theo đúng thứ tự. Không bao giờ nhảy cổng, không gộp task.

## 1. Pick ticket
- Chỉ pick ticket ở trạng thái **READY TO DEVELOP** hoặc **IN DEVELOP**, và phải **assign cho Văn Toàn**. Ticket assign cho người khác → bỏ qua, báo user (không tự re-assign trừ khi user bảo).
- KHÔNG đụng ticket ON STAGING.

## 2. Bắt đầu implement
- Kéo ticket sang **IN DEVELOP** ngay khi giao (không để ở READY TO DEVELOP).
- Giao Dev TMS kèm: ticket id + link Jira, scope thay đổi cụ thể (BR ids, cột/file/hành vi), phần giữ nguyên tham chiếu task gốc, yêu cầu dựng/kiểm stack local, nhánh `fix/ITMS-<n>-<slug>`, tự verify bằng chứng trước khi báo lại. Ghi rõ: **không tạo PR trước QA PASS**.
- Nếu ticket có file mẫu đính kèm (Excel, mockup): nhắc Dev file mẫu là chuẩn output; khi file mẫu và text ticket lệch nhau, Dev làm theo text và **flag điểm lệch** để QA/user quyết.

## 3. Gate QA
- Khi Dev báo code xong + bằng chứng: giao QA TMS verify **độc lập** — tự đăng nhập, tự xuất/chạy, không dùng file hay lời Dev. Brief QA nêu rõ từng điều kiện kiểm (đủ cột, từng BR merge, format, regression quyền 401/403, regression các export/màn khác) và done = PASS/FAIL từng điều kiện kèm bằng chứng.
- QA FAIL/blocked → giao lại Dev fix theo lỗi QA báo. Chỉ qua task tiếp khi task hiện tại code xong và QA PASS.

## 4. PR
- Chỉ sau QA PASS mới cho Dev tạo PR. **PR title tiếng Anh đầy đủ** mô tả thay đổi (không viết tắt ticket-slug); **các heading trong description tiếng Anh** (Scope / What Changed / How QA Verified / Known Deviations / Tickets / Out of Scope); thân theo template cũ. Nêu QA PASS + điểm lệch file mẫu nếu có.

## 5. Merge & chốt
- User bảo merge → Dev squash merge, xoá nhánh, báo merge commit.
- Sau khi có PR (hoặc merge): comment bằng chứng QA + link PR lên Jira, kéo ticket → **READY TO STAGING**.
- Không thay PO phê duyệt; chỉ user (Văn Toàn) duyệt merge và quyết điểm lệch spec.

## Báo cáo
- Mỗi bước báo user gọn: trạng thái ticket, số/link PR, kết quả QA dạng bảng, điểm cần user quyết (nếu có).
- Track artifacts: mỗi run ghi `plan.md`/`status.md` tại `/home/vif/tuanvu/dev-team/reports/tms/orchestrator/<YYYY-MM-DD-muc-tieu>/`; spec ở `reports/tms/ba/<KEY>/`, handoff ở `reports/tms/dev/<KEY>/`, verdict ở `reports/tms/qa/<KEY>/` — xem FLOW.md.

Nguồn: đúc kết từ vòng đời ITMS-381 (export đơn vận chuyển, PR #130, merge 4d1531b) — session Điều phối TMS 2026-11-19/20.
