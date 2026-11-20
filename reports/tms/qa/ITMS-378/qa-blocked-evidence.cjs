// QA TMS: capture proof that the branch cannot be booted for UI evidence right now
// (backend gRPC unreachable) - saved as the BLOCKED evidence for ITMS-378.
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const fs = require('fs');
const OUT = '/home/vif/tuanvu/tms-team/reports/qa/ITMS-378/evidence/qa-run/blocked';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const auth = [];
  p.on('response', async (r) => {
    if (r.url().includes('/api/auth/callback')) auth.push({ status: r.status(), body: (await r.text()).slice(0, 300) });
  });
  await p.goto('http://tuanvudev.localhost:4700/tms/login', { waitUntil: 'domcontentloaded' });
  await p.screenshot({ path: `${OUT}/01-login-page.png` });
  await p.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('hvantoan');
  await p.getByRole('textbox', { name: 'Mật khẩu' }).fill('123');
  await p.getByRole('button', { name: 'Đăng Nhập' }).click();
  await p.waitForTimeout(8000);
  await p.screenshot({ path: `${OUT}/02-login-failed.png` });
  fs.writeFileSync(`${OUT}/auth-response.json`, JSON.stringify({ url: p.url(), auth }, null, 1));
  console.log('AUTH:', JSON.stringify(auth));
  await b.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
