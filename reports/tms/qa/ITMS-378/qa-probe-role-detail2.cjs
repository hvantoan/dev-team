// Probe: role.detail với input là JSON-string lồng (double-encoded)
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
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

  const attempts = [
    `?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: JSON.stringify(ID) } }))}`,
    `?input=${encodeURIComponent(JSON.stringify(JSON.stringify(ID)))}`
  ];
  for (const q of attempts) {
    const res = await p.evaluate(async (u) => {
      const r = await fetch(u);
      return { status: r.status, body: (await r.text()).slice(0, 900) };
    }, `${BASE}/api/trpc/role.detail${q}`);
    console.log('>>', q.slice(0, 60), res.status, res.body.slice(0, 800), '\n');
  }
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
