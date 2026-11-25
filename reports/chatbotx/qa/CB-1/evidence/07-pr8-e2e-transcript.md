# PR #8 — E2E transcript (verify độc lập, stack cô lập qa-cb1)

Repo: https://github.com/hvantoan/ChatbotX/pull/8
Branch: `feat/cb-1-openai-compatible-review-fixes`
Stack: compose project `qa-cb1` (postgres 25433, redis 26380, rustfs 29004/29005), builder `next dev` port 3124
từ worktree `/tmp/qa-cb1-pr8` (worktree tạm của QA, KHÔNG phải worktree PR của dev), mock provider `127.0.0.1:1235/v1`.
Env: `/tmp/qa-cb1/qa.env` — lượt A: `OPENAI_COMPATIBLE_ALLOW_PRIVATE_URLS=true`; lượt B/D: không set (mặc định `false`).
Token: mint trực tiếp vào DB test (`/tmp/qa-cb1/tokens.jsonl`), `full` = `scopes NULL`.

Đầu verify: `3408687934589e70e26ee9328dd2781d44a6b73d` (head SM báo).
Giữa verify: head chuyển sang `ecd9f9127d08cb286add2470a38fea357a5113b1` (`refactor(openai-compatible): mark unreachable with a dedicated error class`, +4/-24, 4 file). Toàn bộ E2E A/B/C chạy ở 340868793, D chạy lại ở ecd9f9127.

```bash
FULL=$(jq -r 'select(.k=="full")|.token' /tmp/qa-cb1/tokens.jsonl)
SAT=$(curl -sS "http://localhost:3124/api/v1/integrations/ai/openaiCompatible" -H "Authorization: Bearer $FULL" | jq -r '.data[0].id')
```

## A. opt-out ON (340868793) — connect vẫn 201

```
POST /api/v1/connections {"provider":"openaiCompatible","config":{"baseURL":"http://127.0.0.1:1235/v1","apiKey":"sk-pr8","name":"PR8 Mock","preset":"custom","defaultModel":"qa-mock-model"}}
→ HTTP 201
  connection.id=11793810211178151 provider=openaiCompatible status=connected
  integrationId=11793810210998168 (parent)  satellite=11793810211079724
```

```
PATCH /api/v1/integrations/ai/openaiCompatible {"integrationId":SAT,"baseURL":"http://127.0.0.1:1235/down/v1"}
→ HTTP 200   # mock trả 200 cho mọi path .../models nên verify pass; KHÔNG phải test unreachable (lỗi thiết kế mock, đã làm lại ở A2b)
```

```
# A2b — unreachable thật (port đóng, cùng loopback; opt-out ON)
PATCH {"integrationId":SAT,"baseURL":"http://127.0.0.1:1236/v1","apiKey":"sk-pr8"}
→ HTTP 400 {"defined":true,"code":"invalidBaseUrl","status":400,
           "message":"OpenAI-compatible base URL could not be verified. (reason=unreachable)"}
DB: baseURL vẫn `http://127.0.0.1:1235/down/v1`  → reject không ghi DB ✔
```

**PHÁT HIỆN (tại 340868793):** message công khai lộ marker nội bộ `(reason=unreachable)` — do `ChatbotXException.data = { reason: "unreachable" }` bị `toDisplayMessage()` (`apps/builder/src/orpc.ts:51-59`) nối vào message. Cùng lớp lỗi với `(code connectionProviderRejected)` mà PR này định dẹp.

## B. opt-out OFF (340868793) — SSRF default-on

```
POST /api/v1/connections {"provider":"openaiCompatible","config":{"baseURL":"http://127.0.0.1:1235/v1","apiKey":"sk-pr8"}}
→ 400 {"code":"ssrfBlocked","status":400,"message":"OpenAI-compatible base URL is not allowed."}       # B1 ✔ không còn "(code ...)"
POST ... baseURL=http://169.254.169.254/latest/meta-data
→ 400 {"code":"ssrfBlocked","message":"OpenAI-compatible base URL is not allowed."}                    # B2 ✔
PATCH ... {"baseURL":"http://127.0.0.1:1235/down/v1"}
→ 400 {"code":"ssrfBlocked","message":"OpenAI-compatible base URL is not allowed."}                    # B3 ✔
POST ... {"provider":"claude","config":{"apiKey":"sk-ant-invalid-qa","model":"claude-sonnet-4-5"}}
→ 400 {"code":"connectionCredentialsRejected","message":"Invalid Claude API key (code connectionProviderRejected)"}  # B4:L tồn tại từ trước, PR này không đổi (stripInternalErrorCode chỉ áp nhánh openaiCompatible+ssrfBlocked)
```

## C. Phân quyền (340868793)

```
POST   /api/v1/connections                              (token read_only) → 403
PATCH  /api/v1/integrations/ai/openaiCompatible         (token read_only) → 403
GET    /api/v1/integrations/ai/openaiCompatible         (token read_only) → 200
```

## D. head `ecd9f9127` — chạy lại toàn bộ điểm lỗi + regression

```
D1  PATCH baseURL=http://127.0.0.1:1236/v1  (private, opt-out OFF)
    → 400 {"code":"ssrfBlocked","message":"OpenAI-compatible base URL is not allowed."}   (guard chặn trước khi probe — đúng thứ tự)
D1b PATCH baseURL=http://203.0.113.1/v1     (TEST-NET-3, reserved)
    → 400 {"code":"ssrfBlocked",...}                                                      (coi là non-public, đúng)
D1c PATCH baseURL=http://example.com:81/v1  (public, port đóng) + apiKey
    → 400 {"code":"invalidBaseUrl","status":400,
           "message":"OpenAI-compatible base URL could not be verified."}                 # ✔ marker (reason=...) ĐÃ BIẾN MẤT
    DB: baseURL vẫn `http://127.0.0.1:1235/down/v1`
D2  PATCH baseURL=http://127.0.0.1:1235/v1 (private) → 400 ssrfBlocked, message sạch
D3  POST connect 127.0.0.1:1235/v1        → 400 ssrfBlocked, message sạch
D4  POST connect claude key sai           → 400 connectionCredentialsRejected (không đổi)
D5  PATCH baseURL="not-a-url"             → 422 invalidRequestData (schema chặn trước service)
D6  PATCH baseURL="http://user:pass@example.com/v1" → 400 invalidBaseUrl "OpenAI-compatible base URL is invalid."
```

## Kết luận E2E

| Yêu cầu PR #8 | Kết quả | Bằng chứng |
|---|---|---|
| 1. connect endpoint private → `ssrfBlocked`, message không lộ `(code ...)` | PASS | B1/B2/D3 |
| 2. UI connect unreachable → `providerUnreachable`; unsafe/invalid → `invalidBaseUrl`; **public PATCH giữ `invalidBaseUrl`** | PASS (API) / unit-only (UI server action) | D1c, D6 + `__tests__/openai-compatible-actions.test.ts` |
| 3. provider legacy vẫn `connectionCredentialsRejected` | PASS (code giữ; message còn `(code connectionProviderRejected)` — có từ trước) | B4/D4 |
| 4. i18n 21 locale, không lẫn tiếng Anh trong value dịch (trừ zh) | PASS (21/21 locale có key; 0 value tiếng Anh ở ja/zh/ar/vi; zh giữ chữ Hán, ja dùng chữ Nhật) | xem 08 |
| 5. test PR xanh đầu-cuối, lint/check-types sạch, CI xanh | PASS tại `ecd9f9127` | 08 |

Ghi chú: `PATCH` unreachable được kiểm bằng endpoint public thật; nhánh UI (server action) không gọi được qua HTTP nên chỉ có unit test + đọc code làm bằng chứng — nêu rõ, không tính là PASS tuyệt đối.
