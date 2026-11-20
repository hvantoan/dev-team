const fs = require('fs');
// Probe: quyền hiệu lực của hvantoan (có cusdeb_ex chưa?)
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const BASE = 'http://tuanvudev.localhost:4700/tms';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1'] });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('textbox', { name: 'Tên đăng nhập' }).fill(process.env.QA_USER || 'hvantoan');
  await p.getByRole('textbox', { name: 'Mật khẩu' }).fill(process.env.QA_PASS || '123');
  await p.getByRole('button', { name: 'Đăng Nhập' }).click();
  await p.waitForTimeout(6000);
  const out = await p.evaluate(async (base) => {
    const res = {};
    for (const q of [
      '/api/trpc/permission.permission',
      '/api/trpc/permission.permission?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D',
      '/api/trpc/role.modules?batch=1&input=%7B%7D'
    ]) {
      try {
        const r = await fetch(base + q);
        res[q] = { status: r.status, body: (await r.text()).slice(0, 200) };
      } catch (e) {
        res[q] = String(e);
      }
    }
    const s = await fetch(`${base}/api/auth/session`).then((r) => r.json());
    return { session: { u: s?.user?.username, isAdmin: s?.user?.isAdmin }, res };
  }, BASE);
  const raw = JSON.stringify(out.res["/api/trpc/permission.permission"].body); console.log("has_cusdeb_ex", raw.includes("cusdeb_ex"), "has_cusdeb_hx", raw.includes("cusdeb_hx")); console.log("count_keys_hint", (raw.match(/cusdeb/g) || []).length); fs.writeFileSync("/tmp/hvantoan-perms.json", raw);
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
