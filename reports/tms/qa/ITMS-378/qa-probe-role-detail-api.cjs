// Probe: tìm đúng định dạng input cho role.detail (chỉ đọc)
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

  const variants = [
    { name: 'nonbatch-raw', url: `${BASE}/api/trpc/role.detail?input=${encodeURIComponent(JSON.stringify(ID))}` },
    {
      name: 'nonbatch-json',
      url: `${BASE}/api/trpc/role.detail?input=${encodeURIComponent(JSON.stringify({ json: ID }))}`
    },
    {
      name: 'batch-string',
      url: `${BASE}/api/trpc/role.detail?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: ID } }))}`
    }
  ];
  for (const v of variants) {
    const res = await p.evaluate(async (u) => {
      const r = await fetch(u);
      return { status: r.status, body: (await r.text()).slice(0, 500) };
    }, v.url);
    console.log(v.name, res.status, res.body.slice(0, 400));
  }
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
