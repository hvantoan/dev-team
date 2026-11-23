// Debug: login FE cho 1 user, in ra console/network để tìm lý do kẹt ở /login.
const { chromium } = require('/home/vif/tuanvu/dev-team/tests/tms/node_modules/@playwright/test');
const APP_URL = (process.env.APP_URL || 'http://tuanvudev.localhost:4700/tms').replace(/\/?$/, '/');
const user = process.argv[2] || 'qa-supdeb-rc';

(async () => {
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`console:${m.type()}:${m.text().slice(0, 200)}`));
  page.on('response', async (r) => {
    if (r.url().includes('/api/auth') || r.url().includes('/login')) {
      logs.push(`resp:${r.status()}:${r.request().method()}:${r.url().slice(0, 120)}`);
    }
  });
  page.on('pageerror', (e) => logs.push(`pageerror:${String(e).slice(0, 300)}`));
  await page.goto(`${APP_URL}login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Tên đăng nhập').or(page.locator('input[type="text"]').first()).fill(user);
  await page.getByLabel('Mật khẩu').or(page.locator('input[type="password"]').first()).fill(process.env.QA_PW);
  await page.locator('button:has-text("Đăng nhập")').click();
  await page.waitForTimeout(8000);
  console.log(JSON.stringify({ user, url: page.url(), logs }, null, 2));
  await browser.close();
})();
