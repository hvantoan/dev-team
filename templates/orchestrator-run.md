# Run — <RUN-id>

- **RUN-id:** <YYYY-MM-DD-muc-tieu>
- **Project:** <tms | fms | ca-nhan>
- **Ngày mở:** <YYYY-MM-DD>
- **Trạng thái:** Đang chạy | Xong | Dừng

## Mục tiêu

<1-2 câu: đợt chạy này nhằm gì>

## Task briefs

| # | KEY | Nội dung | Trạng thái | Spec | Handoff | Verdict |
|---|---|---|---|---|---|---|
| 1 | | | ⏳ | | | |

Trạng thái: ⏳ chờ clear → 📋 BA spec → 💻 Dev → 🔍 QA → ✅ PASS / ❌ FAIL / 🚫 BLOCKED

## Quy tắc điều phối

- Chỉ giao task khi PO (anh Toàn) đã clear spec.
- Tuần tự: task kế tiếp chỉ mở khi task trước `verdict.md` PASS.
- FAIL → Dev retry trên cùng folder KEY; BLOCKED → báo PO quyết định.

## Kết quả / báo cáo PO

<tổng kết khi run đóng: task pass, issue tách ra, quyết định cần PO>
