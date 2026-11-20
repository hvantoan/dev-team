// Probe: bắt toàn bộ response tRPC trong browser khi vào form role + click module
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const BASE = 'http://tuanvudev.localhost:4700/tms';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1'] });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const seen = [];
  p.on('response', async (r) => {
    if (r.url().includes('/api/trpc/')) {
      const body = await r.text().catch(() => '');
      seen.push({ url: r.url().split('/api/trpc/')[1]?.slice(0, 90), status: r.status(), body: body.slice(0, 300) });
    }
  });
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('admin');
  await p.getByRole('textbox', { name: 'Mật khẩu' }).fill('123');
  await p.getByRole('button', { name: 'Đăng Nhập' }).click();
  await p.waitForTimeout(6000);
  // điều hướng client-side từ danh sách role để query chạy trong browser
  await p.goto(`${BASE}/roles`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('table', { timeout: 60000 });
  await p.waitForTimeout(2500);
  await p.locator('a[href="/tms/roles/01KNB7PXPNDPER0AP0DPYTYT18"]').first().click();
  await p.waitForTimeout(8000);
  console.log('RESPONSES', JSON.stringify(seen, null, 1).slice(0, 3000));

  // click module "Quản lý tài chính" rồi dump tbody
  const item = p.getByText('Quản lý tài chính', { exact: true }).first();
  await item.click();
  await p.waitForTimeout(2500);
  const rows = await p.locator('tbody').last().innerText();
  console.log('TBODY_AFTER_CLICK_FINANCE', rows.replace(/\s+/g, ' ').slice(0, 800));
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
