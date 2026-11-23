# tests/chatbotx

Harness QA Playwright (Chromium) cho ChatbotX builder + probe API sign-in.

## Cài

```bash
cd tests/chatbotx
pnpm install
pnpm exec playwright install chromium
cp .env.example .env   # điền APP_URL / DEMO_EMAIL / DEMO_PASSWORD thật
```

## Chạy

Stack phải sẵn sàng ở `APP_URL` (mặc định `http://localhost:3123`) — hoặc docker
stack của owner đang chạy, hoặc host dev qua:

```bash
./scripts/stack-chatbotx.sh up qa-tms CB-1
```

```bash
cd tests/chatbotx
pnpm test            # headless
pnpm test:headed
```

Kết quả: `test-results/html-report` (report), `test-results/artifacts` (screenshot/trace khi fail).

## Nội dung

- `tests/smoke.spec.ts` — sign-in demo trên UI → dashboard/inbox; probe API
  `POST /api/auth/sign-in/email` trả `token`.

## BLOCKED

Không cài được browser hoặc không login được → ghi **BLOCKED** kèm lý do thật
(output lỗi, HTTP code, URL), không fake PASS.
