# ITMS-383 evidence (dev TMS)
repo: FMS-Software-Team/tms_application
worktree: /tmp/tms-be-383   base: origin/main cec62f4
branch: fix/ITMS-383-debt-balance-perm
commit: cdbbabc1a68b24033123a6e8ed0dcc270d64265d  (pushed, no PR)
stack: binary from same commit (only listener ports 15052/18082 patched) + DB tms_itms383 (clone) + Redis DB 3

## before fix (cec62f4)
USRPRD383 [prd_r]        -> 403 {"code":7,"message":"Bạn không có quyền truy cập"}
USRREC383 [rec_r]        -> 403 {"code":7,"message":"Bạn không có quyền truy cập"}
USRHX383  [cusdeb_hx]    -> 200 {"customerId":"01K2V3R1DYQHZN50PYQ0ZXAB6D","closingDebt":0,"closingBalance":0}

## after fix (cdbbabc)
USRPRD383 [prd_r]        -> 403
USRREC383 [rec_r]        -> 200
USRRCU383 [rec_cu]       -> 200
USRHX383  [cusdeb_hx]    -> 200

## checks
go build ./...                                        -> exit 0
go test ./internal/interceptor ./internal/application/permission -> ok
warehouse worktree /tmp/tms-be-do-wh unchanged at 57fd284 (fix/group-do-warehouse-labels)

> Ghi chú lưu trữ (2026-11-23): worktree /tmp/tms-be-383 và DB tms_itms383 đã dọn; nội dung trên là bằng chứng lịch sử của PR #136 (đã merge), không verify lại.
