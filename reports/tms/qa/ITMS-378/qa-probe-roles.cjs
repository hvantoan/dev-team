// Probe: liệt kê role + trạng thái quyền cusdeb_ex trên tenant staging (qua FE local :4700)
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const OUT = process.argv[2] || '/tmp/qa-probe';
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://tuanvudev.localhost:4700/tms';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1']
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('admin');
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('123');
  await page.getByRole('button', { name: 'Đăng Nhập' }).click();
  await page.waitForTimeout(6000);
  await page.goto(`${BASE}/roles`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table', { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/roles.png`, fullPage: true });
  const rows = await page.locator('table tbody tr').evaluateAll((trs) =>
    trs.map((tr) => ({
      text: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 80),
      href: tr.querySelector('a')?.getAttribute('href') || null
    }))
  );
  console.log(JSON.stringify(rows, null, 1));
  await browser.close();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
