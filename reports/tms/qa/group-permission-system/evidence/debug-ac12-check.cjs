// Kiểm chi tiết sau flush: request bằng cookie cũ tới nhiều route, ghi status + URL cuối + text.
const { chromium } = require('/home/vif/tuanvu/dev-team/tests/tms/node_modules/@playwright/test');
const APP_URL = (process.env.APP_URL || 'http://tuanvudev.localhost:4700/tms').replace(/\/?$/, '/');
const STATE = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1','--no-sandbox'] });
  const out = {};
  for (const route of ['supplier-debt', 'roles', 'dashboard']) {
    const c = await b.newContext({ storageState: STATE, viewport: { width: 1400, height: 900 } });
    const p = await c.newPage();
    const resp = await p.goto(`${APP_URL}${route}`, { waitUntil: 'domcontentloaded' }).catch((e) => null);
    await p.waitForLoadState('networkidle').catch(()=>{});
    await p.waitForTimeout(3000);
    out[route] = {
      status: resp ? resp.status() : null,
      finalUrl: p.url(),
      loginInputs: await p.locator('input[type="password"]').count(),
      bodyText: (await p.locator('body').innerText().catch(()=>'')).replace(/\s+/g,' ').slice(0,200),
    };
    await p.screenshot({ path: `debug-ac12-${route}.png` });
    await c.close();
  }
  // so sánh: context sạch (chưa đăng nhập) vào cùng route
  const c2 = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p2 = await c2.newPage();
  const r2 = await p2.goto(`${APP_URL}roles`, { waitUntil: 'domcontentloaded' }).catch(() => null);
  await p2.waitForTimeout(2500);
  out.cleanContext_roles = { status: r2 ? r2.status() : null, finalUrl: p2.url(), loginInputs: await p2.locator('input[type="password"]').count() };
  await c2.close();
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})();
