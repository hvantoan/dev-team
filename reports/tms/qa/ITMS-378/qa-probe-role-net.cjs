// Probe: xem role.modules trả gì + lỗi console
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const BASE = 'http://tuanvudev.localhost:4700/tms';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1'] });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  p.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE_ERR', m.text().slice(0, 200));
  });
  p.on('response', async (r) => {
    if (/role\.(modules|detail)/.test(r.url())) {
      const body = await r.text().catch(() => '');
      console.log('RESP', r.status(), r.url().slice(0, 120), body.slice(0, 400));
    }
  });
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('admin');
  await p.getByRole('textbox', { name: 'Mật khẩu' }).fill('123');
  await p.getByRole('button', { name: 'Đăng Nhập' }).click();
  await p.waitForTimeout(6000);
  await p.goto(`${BASE}/roles/01KNB7PXPNDPER0AP0DPYTYT18`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(8000);
  const permsField = await p.evaluate(() => {
    const el = document.querySelector('form');
    return el ? el.innerText.replace(/\s+/g, ' ').slice(0, 300) : null;
  });
  console.log('FORM_TEXT', permsField);
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
