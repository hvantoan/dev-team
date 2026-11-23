# Run — 2026-11-23-nhom-phan-quyen

- **RUN-id:** 2026-11-23-nhom-phan-quyen
- **Project:** tms
- **Ngày mở:** 2026-11-23
- **Trạng thái:** Đang chạy
- **Item Orca:** 2

## Mục tiêu

Đóng nhóm `group-permission-system` (ITMS-382, 384, 385, 408, 409, 410, 411) bằng cách chốt matrix quyền làm nguồn sự thật duy nhất, rồi qua 2 PR đang mở: BE [tms_application#138](https://github.com/FMS-Software-Team/tms_application/pull/138), FE [tms-web#193](https://github.com/FMS-Software-Team/tms-web/pull/193).

## Quyết định của PO (anh Văn Toàn, 2026-11-23)

| # | Vấn đề | Chốt |
|---|---|---|
| 1 | allowAnyOf mở rộng (Partner list chấp 12 quyền) | **Siết lại theo WithCheck**: endpoint chỉ khai quyền module sở hữu; nhu cầu cross-module khai thành dependency trong registry |
| 2 | `ResourceService/ListAdUnit` | `(authenticated)` — danh mục hành chính công khai, dùng bởi CommuneSelect ở form tài xế/đối tác/tuyến/kho |
| 3 | Matrix nguồn lệch code (`CustomerDebt/Get` bỏ `rec_r`, action 10304 đã xoá) | **Cập nhật bản BA theo code**, một nguồn duy nhất |
| 4 | UI giữ quyền cũ sau backfill `000024` | **Flush toàn bộ session** sau migration (mọi user đăng xuất một lần), không dùng token version hay revoke theo role |
| 5 | `CustomerDebtService/Get` giữ 2 quyền (E1) hay 1 quyền | **Siết tuyệt đối 1 quyền** = `cusdeb_hx`, kèm cạnh `rec_debt_balance → cusdeb_hx`; thay thế BR-PQ-007 và một phần chốt ITMS-383 |

PO clear spec ngày 2026-11-23 (item 2, e15). Matrix phải lên v3 trước khi giao Dev.

## Task briefs

| # | KEY | Nội dung | Trạng thái | Spec | Handoff | Verdict |
|---|---|---|---|---|---|---|
| 1 | group-permission-system | BA dựng matrix v3 (1 quyền/endpoint + 90 cạnh dependency) + spec | ✅ spec + matrix v3, PO clear | `reports/tms/ba/group-permission-system/spec.md` | — | — |
| 2 | group-permission-system | Dev sửa BE #138 + FE #193 | 🔁 retry 1 — FE chặn unauthenticated → /login, seed NCC, xác minh `balance_type_invalid` | | `reports/tms/dev/group-permission-system/handoff.md` | — |
| 3 | group-permission-system | QA verify 12 AC trên stack local (BE `db69aee` / FE `0a448dd`) | ❌ FAIL — AC12 nửa FE (500 thay vì /login), AC11 BLOCKED thiếu seed; 10 AC PASS | | | `reports/tms/qa/group-permission-system/verdict.md` |

Trạng thái: ⏳ chờ clear → 📋 BA spec → 💻 Dev → 🔍 QA → ✅ PASS / ❌ FAIL / 🚫 BLOCKED

## Điểm đã rà, phải có trong spec/PR

1. **Closure phải đệ quy**: `rec_debt_balance → rec_r → cus_r`; migration `000024` hiện chạy 1 lượt nên không đóng được bắc cầu.
2. **FE thiếu key**: `modules/role/enums/action-type.ts` chưa có `supdeb_rc`, `supdeb_open`; nút "Tính lại công nợ NCC" chưa bọc `ProtectedElement`.
3. **`dashboard` không bọc `ProtectedViewServer`** (78/80 page đã bọc) — chốt có bảo vệ hay không.
4. **Bắt buộc đăng nhập lại**: UI lấy quyền từ token lúc sign-in + `staleTime: Infinity`; cần cơ chế revoke session sau migration (không chỉ ghi chú deploy).
5. **`user.save` + `roleId` cần `role_cu`** áp cả nhánh tạo mới — QA phải có case này.

## Quy tắc điều phối

- Chỉ giao task khi PO (anh Toàn) đã clear spec.
- Tuần tự: task kế tiếp chỉ mở khi task trước `verdict.md` PASS.
- FAIL → Dev retry trên cùng folder KEY; BLOCKED → báo PO quyết định.

## Kiểm tra của Điều phối trên spec + matrix v2 (2026-11-23)

- 118/118 endpoint, 6 endpoint ngoại lệ E1/E2/E3 đều có lý do; 0 `needs_decision` còn hiệu lực (dòng ListAdUnit còn sót chữ needs_decision cũ — BA sửa khi clear).
- 89 cạnh dependency, 25 cạnh `missing` (đều cross-module). Kiểm độc lập: mọi quyền bị bỏ khỏi endpoint đều có đường đi trong dependency tới quyền sở hữu, trừ `supdeb_hx → pmt_r` trên `GetSupplierPayableAmount` — BA đã ghi rõ lý do bỏ (không caller), chấp nhận.
- Số đếm lệch nhỏ: BA báo 33 endpoint đổi, thực tế 35 dòng khác bản 22/11 (2 dòng là ListAdUnit + CustomerDebt/Get, BA xếp vào ngoại lệ).
- Chờ PO clear spec (item Orca 2) + chốt cơ chế buộc đăng nhập lại và E1.

## Kết quả / báo cáo PO

Đang chạy — báo cáo tại `status.md` khi có verdict.
