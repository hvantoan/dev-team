---
name: tms-excel-export-verify
description: Implement và verify chức năng export Excel theo file mẫu đính kèm ticket Jira trong repo tms_application (Go). Dùng khi task yêu cầu thêm/sửa cột export xlsx có merge cells, BR (BR-DOEX-*) và phải tự chứng minh trên stack local trước khi QA/PR. Covers: đọc ticket + file mẫu, nhánh fix/, build/test, verify qua scripts/stack.sh gọi API thật, đối chiếu merge/format với file mẫu, báo bằng chứng, PR title/headings tiếng Anh, squash merge.
---

# TMS — Export Excel theo file mẫu, verify trên stack local

Quy trình đã dùng thành công cho ITMS-381 (export danh sách đơn vận chuyển, repo `tms_application`, Go). Nguồn: session làm việc ITMS-381 ngày 2026-11-19.

## Nguyên tắc

- File mẫu đính kèm ticket là spec hình; text ticket (BR-*) là spec luật. Khi hai cái lệch nhau, **làm theo text/BR và flag rõ điểm lệch** cho QA/PO quyết (ví dụ ITMS-381: mẫu merge tiêu đề `A1:J1`, BR-DOEX-009 bắt merge đến cột cuối → chọn theo BR, báo lại).
- Không tự sửa ticket, không suy đoán BR còn thiếu.
- Ticket phải ở **IN DEVELOP** ngay khi bắt đầu implement; nếu còn READY TO DEVELOP thì báo Điều phối kéo status.
- Chỉ dựng stack local qua `/home/vif/tuanvu/dev-team/scripts/stack.sh`; **không** tự chạy tiến trình nền, `go run`, `next` trực tiếp hoặc mở port riêng.
- PR chỉ tạo **sau khi QA PASS**; title và mọi heading trong description **tiếng Anh đầy đủ** (quy định team từ PR #127).
- Merge: squash merge như các PR trước + xoá nhánh. Chỉ merge khi có chỉ đạo/duyệt merge.

## Các bước

1. **Đọc ticket kỹ**: `reports/tms/ba/<KEY>/spec.md`, text BR + tải file mẫu xlsx đính kèm. Mở file mẫu (python `openpyxl` hoặc unzip đọc `xl/worksheets/sheet*.xml`) để xem: thứ tự cột, dòng tiêu đề, **vùng merge cells** (`mergedCells`), format số/ngày, ví dụ dữ liệu. Đây là bước dễ bỏ sót nhất — đừng chỉ đọc text.
2. **Tìm code export hiện tại**: repo `tms_application`, thường `internal/application/service/*.export.go`. Kiểm tra query `Filter`/load dữ liệu có đủ bảng con không (ITMS-381: thiếu `delivery_order_item` + `delivery_order_price_range` nên không có dữ liệu sản phẩm/giá cước).
3. **Nhánh** `fix/ITMS-<id>-<slug>` từ `origin/main` mới nhất. Implement gọn (hoặc qua Orca worker `orca orchestration worker-start` — worker chỉ build/test trong worktree, không gọi `stack.sh`): sửa service + thêm test `*_export_test.go` cover đủ từng BR + header/format.
4. **Build + test**: `go build ./...` clean; `go test ./internal/application/service` ok.
5. **Verify thật trên stack local qua `scripts/stack.sh`** (bắt buộc, không chỉ unit test):
   ```bash
   cd /home/vif/tuanvu/dev-team
   ./scripts/stack.sh up dev-tms <KEY> <commit|worktree> --dev
   ```
   - Gọi thật endpoint export trên gateway `:8081` (VD `POST http://localhost:8081/api/v1/delivery-orders/export`), kỳ vọng HTTP 200 và file xlsx hợp lệ.
   - Mở file xuất được bằng `openpyxl`, đối chiếu từng BR: số dòng mỗi đơn (= sản phẩm × khoảng giá), thứ tự, **từng vùng merge** (`ws.merged_cells.ranges`), format (`#,##0`, `dd/mm/yyyy`).
   - Chọn đơn test có đủ biến thể (nhiều sản phẩm, nhiều khoảng giá, giá trị trùng nhau để kiểm merge xuyên suốt).
   - **Bắt buộc chạy `./scripts/stack.sh down` sau khi verify xong** để trả lock trước khi bàn giao QA.
6. **Ghi artifact bàn giao & báo bằng chứng**: ghi đầy đủ `reports/tms/dev/<KEY>/handoff.md` (template `templates/dev-handoff.md`), đính kèm file xlsx xuất thật, liệt kê từng BR → kết quả đo được (số dòng, ranges merge cụ thể), commit, diff, điểm lệch ticket-vs-mẫu nếu có. Nêu rõ chưa tạo PR (chờ QA).
7. **Sau QA PASS**: tạo PR → `main`. Title tiếng Anh đầy đủ mô tả change (không slug ticket); headings trong description tiếng Anh (Summary, Changes, Verification, …); body theo template đã dùng.
8. **Merge (khi được duyệt)**: `gh pr merge <n> --squash --delete-branch`; xác nhận state MERGED + commit trên main.

## Checklist bàn giao QA

- [ ] `reports/tms/dev/<KEY>/handoff.md` đã ghi đầy đủ branch, commit, lệnh verify
- [ ] File xlsx xuất thật từ stack local đính kèm
- [ ] Bảng BR → kết quả verify (dòng, merge ranges, format)
- [ ] Build/test pass, diff gọn, nhánh đã push
- [ ] Điểm lệch spec/file mẫu đã flag
- [ ] Đã chạy `./scripts/stack.sh down` để giải phóng lock cho QA
