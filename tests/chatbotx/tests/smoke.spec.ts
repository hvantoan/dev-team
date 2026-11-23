import { expect, test } from '@playwright/test';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3123';
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@example.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo@1234';

test('sign-in demo → vào dashboard/inbox', async ({ page }) => {
  await page.goto('/auth/sign-in');

  // Trang sign-in mặc định là bộ chọn phương thức; email/password nằm sau nút này.
  await page.getByRole('button', { name: /continue with email/i }).click();
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('form button[type="submit"]').click();

  // Sau sign-in: workspace picker ở "/"; vào workspace → landing section.
  await expect(page).not.toHaveURL(/\/auth\/sign-in/, { timeout: 45_000 });
  await page.locator('a[href^="/space/"]').first().click();
  await expect(page).toHaveURL(/\/space\/[^/]+\/(dashboard|inbox)/, { timeout: 45_000 });
});

test('API sign-in trả token', async ({ request }) => {
  const res = await request.post(`${APP_URL}/api/auth/sign-in/email`, {
    data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });

  expect(res.status()).toBe(200);
  const body = (await res.json()) as { token?: unknown; user?: { email?: string } };
  expect(typeof body.token).toBe('string');
  expect((body.token as string).length).toBeGreaterThan(10);
  expect(body.user?.email).toBe(DEMO_EMAIL);
});
