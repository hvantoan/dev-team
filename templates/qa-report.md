# QA Verdict — <KEY>

- **Ticket/Key:** <ITMS-xxx | slug>
- **Branch/commit BE:** <repo>@<commit>
- **Branch/commit FE:** <repo>@<commit> (nếu có)
- **Stack:** local — <env, DB version, service phụ thuộc>
- **Ngày chạy:** <YYYY-MM-DD>

## Verdict: PASS | FAIL | BLOCKED

## Tài khoản test

| Vai trò | User | Quyền trên endpoint |
|---|---|---|
| Có quyền | | |
| Không quyền | | |

## Done-conditions

| # | Điều kiện | Kết quả | Evidence |
|---|---|---|---|
| 1 | | PASS/FAIL | evidence/<file> hoặc đường dẫn tuyệt đối |

## Đối chiếu

- Output ↔ mẫu ticket: <kết quả>
- Output ↔ DB: <query đã chạy, count, giá trị khóa>
- Merge cell / layout (nếu export): <vùng merge, BR tham chiếu>

## Regression đã kiểm

- 401/403: <kết quả>
- Endpoint/nghiệp vụ liền kề: <kết quả>

## Phát hiện ngoài phạm vi

<bug/vấn đề không thuộc ticket — Điều phối quyết định tách issue>

## Ghi chú

<điều kiện môi trường khi BLOCKED; lần retry nếu có>
