# QA Report — ITMS-378 (Xuất Excel công nợ KH khi không có quyền)

| Trường | Giá trị |
|---|---|
| Ticket | ITMS-378 |
| Branch kiểm | `origin/fix/ITMS-378` @ `055e4fb6608de5e99c2800e6de25a1e70821c541` (base `origin/dev` @ `4713efb`) |
| Người kiểm | QA TMS |
| Thời điểm chạy UI | 2026-11-18 13:57–14:11 (UTC+7); bổ sung ca có quyền trên user thường 15:29–15:31 |
| Cách kiểm | `next dev -p 4700` trên chính worktree `tms-web` ở nhánh `fix/ITMS-378`, `GRPC_HOST` → staging API, tenant `tuanvudev`; script riêng của QA + ảnh + video + file Excel tải thật |
| Verdict tổng | **PASS toàn bộ AC-01→07** trên user thường (`hvantoan`, `isAdmin=false`): ca âm (không `cusdeb_ex`) và ca dương (sau khi tick tạm `cusdeb_ex` vào role Manager — đã revert, có bằng chứng persisted). AC-08: **known limitation đã chốt** — chấp nhận trễ tối đa ~120s do `revalidate` cache quyền, không sửa trong ticket này |

## 1. Stack và cách chạy

| Thành phần | Giá trị thực tế |
|---|---|
| FE | `/home/vif/tuan-vu/tms-web` @ `fix/ITMS-378` (`055e4fb`), `npx next dev --turbopack -p 4700` |
| BE | `GRPC_HOST=https://staging-tms-api.fumydatacenter.com` (đúng giá trị trong `.env.sample` của repo) |
| Tenant / URL | `tuanvudev` — `http://tuanvudev.localhost:4700/tms`, Chromium chạy với `--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1` |
| Tài khoản | `hvantoan` — role Manager, `isAdmin=false`: ca âm (mặc định không `cusdeb_ex`) + ca dương (tick tạm `cusdeb_ex` vào role Manager trên staging, xác nhận persisted rồi revert); `admin` — `isAdmin=true` (bằng chứng bổ sung) |
| Bằng chứng | `evidence/qa-run/` (ảnh, `*-result.json`, file `.xlsx` tải thật, `video/hvantoan-run.webm` 61s, `video/admin-run.webm` 65s) |
| Script | `qa-verify-itms-378.cjs` (luồng UI đầy đủ) + `qa-ac03-probe.cjs` (gọi thẳng tRPC, replay đúng payload UI) |

Ghi chú môi trường: `.env` của máy QA vẫn trỏ `GRPC_HOST` về `127.0.0.1:50051`; QA **không sửa** `.env` mà override biến môi trường khi boot server (Next ưu tiên biến môi trường của tiến trình). Nếu muốn chạy lại được mà không cần override, cần sửa `.env` theo `.env.sample`.

## 2. Verdict từng AC (bằng chứng runtime)

### 2.1 `hvantoan` — user thường, không có `cusdeb_ex`

| AC | Nội dung | Kết quả | Bằng chứng |
|---|---|---|---|
| AC-01 | Không có quyền → nút VT1 (thanh filter) không còn trong DOM | **PASS** | `hvantoan-01-customer-debt.png`; `hvantoan-result.json` → `vt1_export_buttons_in_dom: 0` trong khi bảng có **2 dòng dữ liệu thật** (KH-05 Kiwi, KH-10 Công Ty ANh Thư) — tức là nút vắng mặt không phải do bảng rỗng |
| AC-02 | Không có quyền → nút VT2 (header popup Lịch sử giao dịch) không còn trong DOM | **PASS** | `hvantoan-02-history-dialog.png` mở đúng `Lịch sử giao dịch 15/10/2026 - 20/11/2026 (KH-05 - Kiwi)`; `vt2_export_buttons_in_dom: 0`; các nút còn lại trong dialog chỉ là phân trang |
| AC-03 | Gọi API trực tiếp vẫn bị chặn ở server | **PASS** | `qa-ac03-probe.cjs` replay **đúng payload tRPC mà UI gửi** (bắt từ phiên admin) bằng session `hvantoan`: cả `customerDebt.exportExcel` và `customerDebt.exportDetail` trả `success:false`, message `Bạn không có quyền truy cập` (`hvantoan-ac03-result.json`) |
| AC-04 | Không còn điểm dừng focus vào hành động xuất | **PASS** | Tab 40 lần trên màn công nợ: `tab_focus_export_hits: []`. Đối chứng trên `admin`: cùng phép thử cho **2 hit "Xuất Excel"** → phép thử thật sự bắt được nút khi nó tồn tại |
| AC-07 | Kỳ lọc 0 bản ghi → điều kiện hiển thị không phụ thuộc dữ liệu | **PASS** | `hvantoan-07-empty-result.png`: lọc 0 dòng → 0 nút, không lỗi, không wrapper rỗng. Ca "0 bản ghi mà nút **vẫn** hiện" là hành vi phía có quyền — kiểm ở `admin` bên dưới |

### 2.2 `hvantoan` + `cusdeb_ex` (tick tạm vào role Manager) — ca có quyền trên user thường

Quyền `cusdeb_ex` được tick tạm vào role Manager trên tenant staging bằng chính UI phân quyền (`qa-toggle-cusdeb-ex.cjs`, login `admin`): trước `checked:false`, sau tick + Lưu → reload vẫn `checked:true` (`grant-cusdeb-ex-2/grant-04-role-manager-persisted.png`, `grant-result.json`). `hvantoan` (`isAdmin=false`) đăng nhập lại và nhận quyền qua role — **không đi đường tắt IsAdmin**.

| AC | Nội dung | Kết quả | Bằng chứng |
|---|---|---|---|
| AC-05 | Có quyền → VT1 hiện + export đúng dữ liệu | **PASS** | `hvantoan-granted-05-vt1-filter-bar.png` → bấm → tải thật `hvantoan-granted-05-vt1-export.xlsx` (**6.953 bytes**, `CongNoVanChuyen_20261118153020.xlsx`) |
| AC-06 | Có quyền → VT2 hiện + export đúng | **PASS** | `hvantoan-granted-02-history-dialog.png` → bấm trong dialog → tải thật `hvantoan-granted-06-vt2-export.xlsx` (**8.054 bytes**, `CongNoKhachHangChiTiet_KH-05_20261118152948.xlsx`) |
| AC-07 | 0 bản ghi → nút vẫn hiện | **PASS** | `hvantoan-granted-07-empty-result.png`: bộ lọc không khớp → `vt1_export_buttons_when_empty: 1` |
| AC-03 (đối chứng) | Có quyền → server cho qua | **PASS** | Call export thật của UI trả **HTTP 200** (`hvantoan-granted-result.json` → `export_calls`) kèm file tải về |

Đã **revert**: bỏ tick `cusdeb_ex`, Lưu, reload → `checked:false` persisted (`revert-cusdeb-ex/revert-04-role-manager-persisted.png`, `revert-result.json`).

### 2.2b `admin` — bằng chứng bổ sung ca có quyền

| AC | Nội dung | Kết quả | Bằng chứng |
|---|---|---|---|
| AC-05 | VT1 hiện + export | **PASS** | `admin-05-vt1-export.xlsx` (**6.953 bytes**) |
| AC-06 | VT2 hiện + export | **PASS** | `admin-06-vt2-export.xlsx` (**8.054 bytes**) |
| AC-07 | 0 bản ghi → nút vẫn hiện | **PASS** | `admin-07-empty-result.png` |
| AC-03 (đối chứng) | Server cho qua | **PASS** | `admin-ac03-result.json` — 2 procedure `success:true` |

File Excel tải về là file thật (`PK` zip của xlsx, mở được); QA không chỉnh sửa nội dung — nội dung số liệu thuộc phạm vi kiểm của BA/PO nếu cần.

### 2.3 AC-08 — known limitation (đã chốt)

**Quyết định:** Điều phối TMS chốt trong phạm vi điều phối — chấp nhận trễ tối đa ~120s sau khi thu hồi quyền, ghi known limitation vào report/SRS, **không** sửa cache trong ticket này.

Bằng chứng code: `shared/helpers/get-user-permissions.ts:8` — `PERMISSION_CACHE_REVALIDATE_SECONDS = 120`, dùng `unstable_cache(..., { revalidate: 120 })` theo `username`. Hệ quả: thu hồi quyền xong reload ngay thì danh sách quyền cũ còn hiệu lực **tới ~2 phút**, nút vẫn hiện. Đây là hành vi có sẵn từ trước, không do branch ITMS-378. Vòng verify của QA thực tế cũng thấy quyền mới có hiệu lực ngay cho `hvantoan` sau grant (cache theo username đã hết hạn sau >120s).

Nếu sau này PO yêu cầu "reload là ẩn ngay": mở ticket riêng — hạ `revalidate` hoặc gọi `revalidateTag` khi lưu role.

## 3. Phát hiện ngoài phạm vi ITMS-378 (không chặn ticket, cần ticket riêng)

**F1 — Màn Công nợ khách hàng gửi `startDate` rỗng ở lần load đầu.** Server staging trả `[invalid_argument] customer_debt.start_date_required`; bảng trống cho tới khi người dùng mở lịch và chọn lại ngày (đúng như thao tác QA phải làm để có dữ liệu). Nguyên nhân: `debt-list-filter.tsx` không truyền `requiredDefaultValue={false}` + default ngày của module như `supplier-debt` và `delivery-orders` đang làm, nên `startDate/endDate` trong form là `null` dù ô ngày **hiển thị** 18/10–18/11. Branch ITMS-378 chỉ đổi 2 file (`debt-list.tsx`, `customer-debt-detail-dialog.tsx`, 17 dòng thêm / 30 dòng xoá) nên đây là lỗi có sẵn trên `dev`.

**F2 — tRPC export trả HTTP 200 kèm `success:false`** khi thiếu quyền (thay vì lỗi HTTP 4xx). Client hiện xử lý được, nhưng nếu sau này có lớp cache/giám sát chỉ nhìn status code thì sẽ tưởng là thành công.

## 4. Giới hạn bằng chứng

- Ca có quyền được kiểm trên **`hvantoan` — user thường `isAdmin=false`**, quyền `cusdeb_ex` đi qua role Manager (tick tạm trên staging theo phê duyệt của Điều phối TMS, đã revert với bằng chứng persisted). Không còn phụ thuộc đường tắt IsAdmin.
- AC-07 dùng bộ lọc tìm kiếm không khớp để tạo **0 bản ghi** (kỳ ngày vẫn 15/10–20/11), không phải một kỳ không có phát sinh. Điều kiện hiển thị nút trong code chỉ phụ thuộc `hasPermission`, nên kết luận không đổi.
- Đăng nhập: app đôi khi không redirect sau `signIn` (màn login đứng yên dù session đã tạo) — script QA phải retry; đây là quan sát môi trường, chưa đủ bằng chứng để mở ticket.

## 5. Bằng chứng (đường dẫn tương đối trong `evidence/qa-run/`)

`hvantoan-01-customer-debt.png`, `hvantoan-02-history-dialog.png`, `hvantoan-07-empty-result.png`, `hvantoan-result.json`, `hvantoan-ac03-result.json`,
`hvantoan-granted-01-customer-debt.png`, `hvantoan-granted-02-history-dialog.png`, `hvantoan-granted-05-vt1-filter-bar.png`, `hvantoan-granted-05-vt1-export.xlsx`, `hvantoan-granted-05-vt1-after-export.png`, `hvantoan-granted-06-vt2-export.xlsx`, `hvantoan-granted-06-vt2-after-export.png`, `hvantoan-granted-07-empty-result.png`, `hvantoan-granted-result.json`,
`admin-01-customer-debt.png`, `admin-02-history-dialog.png`, `admin-07-empty-result.png`, `admin-05-vt1-filter-bar.png`, `admin-05-vt1-export.xlsx`, `admin-05-vt1-after-export.png`, `admin-06-vt2-export.xlsx`, `admin-06-vt2-after-export.png`, `admin-result.json`, `admin-ac03-result.json`,
`grant-cusdeb-ex-2/` (ảnh + `grant-result.json` + video), `revert-cusdeb-ex/` (ảnh toggle/save/persisted + `revert-result.json` + video),
`video/hvantoan-run.webm` (61s), `video/admin-run.webm` (65s), `video/hvantoan-granted-run.webm` (ca có quyền trên `hvantoan`).

## 6. Câu hỏi còn lại

1. F1 (thiếu ngày mặc định ở màn Công nợ khách hàng → server trả `start_date_required`, bảng trống tới khi chọn lại ngày) — mở ticket riêng?
2. F2 (tRPC trả HTTP 200 kèm `success:false` khi thiếu quyền) — mở ticket riêng?
3. `tms_application/config.yaml` đang chứa credential thật và được track trong git — đề xuất ticket riêng (đưa sang biến môi trường + rotate), không gộp ITMS-378.

Hai điểm trước đây chờ chốt đã giải quyết: AC-08 → chấp nhận trễ ~120s (known limitation, §2.3); AC-05/06 → đã verify trên user thường `hvantoan` sau khi tick tạm `cusdeb_ex` vào role Manager và revert (§2.2).
