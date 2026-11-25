# Impediments — tms

Sổ chặn của project, không reset theo sprint.

| Ngày | KEY | Chặn gì | Gỡ bởi / điều kiện | Trạng thái |
|---|---|---|---|---|
| 2026-11-23 → 2026-11-25 | ITMS-382/384/385/408/409/410/411 | QA verdict FAIL 2026-11-23 (AC12 nửa FE: session flush → HTTP 500 thay vì redirect `/login`; AC11 BLOCKED: seed local 0 dòng công nợ NCC). Dev được giao retry nhưng 2 ngày không có commit mới: BE `#138` head `db69aef`, FE `#193` head `0a448dd`, worktree sạch, home Dev không có agent mở. | SM gửi lại retry qua chat mới 2026-11-25 → Dev ACK, dispatch 3 worker: FE `dispatch:ctx_6678fcb86891` (AC12 redirect), BE `dispatch:ctx_0c2a3ce2c4ea` (balance_type_invalid), dev-team `dispatch:ctx_ff6f76b1a312` (seed `002-supplier-debt.sql` cho AC11). Gỡ khi: commit mới + `handoff.md` cập nhật + QA chạy lại 12 AC | đang gỡ |
