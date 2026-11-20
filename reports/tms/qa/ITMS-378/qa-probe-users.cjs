// Probe: liệt kê user gần đây trên tenant (tìm tk thường vừa được cấp)
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const BASE = 'http://tuanvudev.localhost:4700/tms';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1'] });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('admin');
  await p.getByRole('textbox', { name: 'Mật khẩu' }).fill('123');
  await p.getByRole('button', { name: 'Đăng Nhập' }).click();
  await p.waitForTimeout(6000);
  await p.goto(`${BASE}/users`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('table', { timeout: 60000 });
  await p.waitForTimeout(3000);
  const rows = await p.locator('table tbody tr').evaluateAll((trs) =>
    trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 120))
  );
  console.log('USERS', JSON.stringify(rows, null, 1).slice(0, 2500));
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
