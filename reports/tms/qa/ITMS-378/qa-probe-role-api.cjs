// Probe: gọi thẳng tRPC role.modules để xem shape permissions (không ghi gì)
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

  const out = await p.evaluate(async (base) => {
    const variants = [
      `${base}/api/trpc/role.modules?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D`,
      `${base}/api/trpc/role.modules?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%7D%7D%7D`,
      `${base}/api/trpc/role.modules?batch=1&input=%7B%7D`
    ];
    const res = [];
    for (const u of variants) {
      const r = await fetch(u);
      const t = await r.text();
      res.push({ u: u.slice(-60), status: r.status, body: t.slice(0, 700) });
    }
    // role.detail
    const r2 = await fetch(`${base}/api/trpc/role.detail?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%2201KNB7PXPNDPER0AP0DPYTYT18%22%7D%7D`);
    res.push({ u: 'role.detail', status: r2.status, body: (await r2.text()).slice(0, 700) });
    return res;
  }, BASE);

  for (const r of out) console.log(r.status, r.u, '\n  ', r.body, '\n');
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
