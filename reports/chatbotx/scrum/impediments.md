# Impediments — chatbotx

Sổ chặn của project, không reset theo sprint.

| Ngày | KEY | Chặn gì | Gỡ bởi / điều kiện | Trạng thái |
|---|---|---|---|---|
| 2026-11-23 | — | MCP `jira-vtx` lỗi certifi ở phiên SM (`uv` cache archive bị xoá) — không đọc trực tiếp ticket CB | Workaround: Chef xuất toàn văn vào run plan `2026-11-23-cb2-refine-cb1/jira-context.md`; MCP vẫn lỗi cho phiên SM, cần restart/reinstall | đã gỡ chặn (workaround) |
| 2026-11-23 | CB-1 | Sau `backfill --apply` trên prod, `auth` chuyển `{}` + ciphertext; không có script reverse (PO chốt không làm, item 4 e129) → rollback code cũ mất apiKey plaintext | PO chấp nhận rủi ro; nếu cần rollback prod thì viết reverse tại thời điểm đó (decrypt encryptedAuth → auth) | chấp nhận (không chặn) |
