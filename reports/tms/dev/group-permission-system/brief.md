# Brief Dev — group-permission-system (BE #138 + FE #193)

- **Ngày:** 2026-11-23
- **Từ:** Orchestrator (PO anh Văn Toàn đã clear spec)
- **Nguồn sự thật:** `/home/vif/tuanvu/dev-team/docs/tms/analysis/permission-matrix-2026-11-23.json` (v3, **thay hẳn** bản 2026-11-22)
- **Spec:** `/home/vif/tuanvu/dev-team/reports/tms/ba/group-permission-system/spec.md` (12 AC)
- **Run:** `/home/vif/tuanvu/dev-team/reports/tms/orchestrator/2026-11-23-nhom-phan-quyen/plan.md`

PR đang mở — làm tiếp trên đúng 2 nhánh `fix/group-permission-system` (không mở PR mới):
- BE: https://github.com/FMS-Software-Team/tms_application/pull/138
- FE: https://github.com/FMS-Software-Team/tms-web/pull/193

## Điều PO chốt, khác PR hiện tại

1. **Bỏ allowAnyOf mở rộng.** Mỗi endpoint chỉ khai quyền module sở hữu. Còn đúng 5 endpoint nhiều quyền: `RoleService/GetModules` = `[role_r, role_cu, usr_cu]`, và 4 method DeliveryInstruction (`GetDeliveryInstruction`, `ListDeliveryInstruction`, `GetLatestDeliveryInstructionByCode`, `ListVehicleByDICode`) = `[do_di, diso_cu, diso_r]`. Mọi endpoint khác đúng 1 quyền.
2. **`CustomerDebtService/Get` = `cusdeb_hx` duy nhất** (bỏ E1). Kèm cạnh `rec_debt_balance → cusdeb_hx`. Hệ quả PO đã chấp nhận: role chỉ làm phiếu thu thấy màn Công nợ KH; thay BR-PQ-007 và một phần chốt ITMS-383.
3. **Buộc đăng nhập lại = flush toàn bộ session** (không token version, không revoke theo role).

## Việc BE (PR #138)

1. Copy `endpoints` (kèm `allOf`/`allowAnyOf`) của matrix v3 vào `internal/application/permission/data/permission_matrix.json`. Lệch = QA FAIL (AC2).
2. **Registry**: bổ sung 26 cạnh `missing` vào `getActionRelations()` (giữ 64 cạnh đã có; tổng 90):
   `audit_r→usr_r`, `cus_cu→vehr_r`, `diso_cu→costs_r`, `diso_cu→cus_r`, `diso_r→cus_r`, `diso_r→do_r`, `do_cu→costs_r`, `do_cu→subcon_r`, `do_cu→wh_r`, `do_di→cus_r`, `fadj_cu→fissue_r`, `fadj_cu→frcp_r`, `fadj_cu→wh_r`, `fissue_cu→wh_r`, `frcp_cu→wh_r`, `pmt_cu→pytmtd_r`, `pmt_r→cus_r`, `rec_cu→cus_r`, `rec_cu→pytmtd_r`, `rec_debt_balance→cus_r`, `rec_debt_balance→cusdeb_hx`, `rec_r→cus_r`, `subcon_cu→cus_r`, `subcon_cu→do_r`, `usr_cu→role_r`, `usr_r→role_r`.
   Mỗi cạnh sinh từ đúng một dòng matrix — không tự thêm cạnh ngoài danh sách; 4 cạnh BA nghi chưa có caller (`do_cu→subcon_r`, `cus_cu→vehr_r`, `fadj_cu→wh_r`, `fissue_cu→wh_r`) vẫn giữ theo matrix, ghi chú lại cho BA, không tự bỏ.
3. **Migration**: sửa `migrations/000024_itms408_backfill_permission_closure.up.sql` ngay trong PR (chưa merge, không cần file mới) thành **closure đệ quy** — lặp áp toàn bộ cạnh tới khi không đổi, hoặc `WITH RECURSIVE`. Bắt buộc đóng được bắc cầu: `rec_debt_balance → rec_r → cus_r`, `diso_d → diso_r → do_r → cus_r`. Idempotent (chạy lần 2 = 0 dòng), cập nhật `down` script, chỉ UPDATE role có thay đổi.
4. **Flush session sau migration**: bước thật, không phải ghi chú deploy. Xoá **đúng prefix session key** trong Redis, tuyệt đối không `FLUSHALL`/`FLUSHDB` (cùng instance còn counter/cache khác — trả lời câu hỏi mở của BA về phạm vi ảnh hưởng). Nêu rõ trong PR: chạy ở đâu, thứ tự (sau migration), cách kiểm không còn key session cũ.
5. Giữ nguyên các chốt đang có trong PR: `supdeb_rc` (20402), `supdeb_open` (20403), `user.save` có `roleId` ⇒ `role_cu` (cả nhánh tạo mới), `DeleteImage` = authenticated + kiểm chủ ảnh, 2 method DI có guard, 10304 đã xoá khỏi catalog.
6. **Lưu ý AC7**: `Get` chỉ nhận `cusdeb_hx`, nên case "user chỉ có `rec_debt_balance` → 200" chỉ đúng **sau khi closure đã cấp `cusdeb_hx`** cho role đó. Test phải chạy qua đường chuẩn hoá role (save role hoặc chạy migration), không test bằng mảng permission thô còn thiếu `cusdeb_hx`.

### Delta spec (Orchestrator gửi sau brief, matrix không đổi)

- **AC7 = 5 request**: `rec_r` đơn → 403; `rec_cu` đơn → 403; `cusdeb_hx` đơn → 200; role gán `rec_debt_balance` rồi lưu role/migration (đã có `cusdeb_hx`) → 200; role thô chỉ `rec_debt_balance` chưa chuẩn hoá → 403. Mỗi case phải kiểm `permissions` của role tại thời điểm gọi.
- **BR-PQ-014/AC12**: flush chỉ trong namespace/prefix session, cấm `FLUSHALL`; không đụng rate-limit counter/cache/queue. PR phải ghi rõ **prefix + lệnh xoá** để QA chụp mẫu key + `DBSIZE` trước deploy rồi đối chiếu key ngoài namespace sau flush.

## Việc FE (PR #193)

1. `modules/role/enums/action-type.ts`: thêm `supdeb_rc`, `supdeb_open`.
2. Bọc `ProtectedElement` (`supdeb_rc`) cho nút "Tính lại công nợ NCC" trong `modules/supplier-debt/components/debt-detail-dialog/supplier-debt-recalculate-dialog.tsx` — role không có quyền thì không render (AC11).
3. **Không đổi `dashboard`** trong PR này (chưa có quyết định PO); ghi vào handoff là follow-up.
4. Giữ nguyên phần đã làm: `ProtectedViewServer` cho các page, ẩn nút theo quyền, `handleApiError` rethrow 403/401, middleware path-permission.

## Done when

- `go test ./internal/...` PASS, gồm `TestPermissionMatrixCoversEveryMethod`, `TestFormPermissionClosure`, `TestWriteImpliesViewWithinModule`; `go build ./...` sạch.
- FE: `pnpm build` (hoặc `pnpm lint && tsc --noEmit` nếu build lâu) PASS.
- Migration chạy được trên DB local 2 lần liên tiếp: lần 2 = 0 dòng đổi; down chạy được.
- `reports/tms/dev/group-permission-system/handoff.md` ghi: commit/branch, cách chạy, 26 cạnh đã thêm, kết quả test, bước flush session, điểm QA cần chú ý (AC7, AC12 cần 2 user khác role).
- Dev sở hữu 2 PR này tới khi sẵn sàng merge: theo dõi checks và review, tự sửa cái fail, rồi báo lại Orchestrator kèm link commit mới nhất.
