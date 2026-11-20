// Probe: trích permissions của role Manager từ payload SSR (đọc HTML, không ghi gì)
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const fs = require('fs');
const BASE = 'http://tuanvudev.localhost:4700/tms';
const ID = '01KNB7PXPNDPER0AP0DPYTYT18';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1'] });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('admin');
  await p.getByRole('textbox', { name: 'Mật khẩu' }).fill('123');
  await p.getByRole('button', { name: 'Đăng Nhập' }).click();
  await p.waitForTimeout(6000);
  await p.goto(`${BASE}/roles/${ID}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);
  const html = await p.content();
  fs.writeFileSync('/tmp/role-page.html', html);
  console.log('html bytes', html.length, 'cusdeb_ex occurrences', (html.match(/cusdeb_ex/g) || []).length);
  const idx = html.indexOf('cusdeb_ex');
  if (idx > 0) console.log('AROUND_CUSDEB', html.slice(idx - 400, idx + 200).replace(/\\"/g, '"'));
  const roles = [...html.matchAll(/"permissions":\[[^\]]{0,4000}\]/g)].map((m) => m[0]);
  console.log('PERM_ARRAYS', roles.length, roles.map((r) => r.length).join(','));
  if (roles.length) fs.writeFileSync('/tmp/role-perms.txt', roles.join('\n\n'));
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
