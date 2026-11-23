// ITMS-402 E2E: after session revoked (redis auth:token deleted), every list must return HTTP 401.
const { chromium } = require('playwright');
const { execSync } = require('child_process');

const BASE = 'http://tuanvudev.localhost:4700/tms';
const ADMIN_ID = '01JX4Y4HPGJVS08S6YPJ995MZW';
const RPASS = process.env.REDIS_PASS;
const RCLI = `docker exec tms-local-redis redis-cli -h services.fumydatacenter.com -p 49282 -a ${RPASS} -n 1`;

const LISTS = [
  'product.list','warehouse.list','partner.list','driver.list','vehicle.list',
  'vehicleRoute.list','fuelTank.list','fuelReceipt.list','fuelIssue.list',
  'fuelAdjustment.list','cost.list','user.list','role.list','paymentMethod.list',
  'notification.list','dispatchOrder.list',
  // control group (were already 401)
  'customerDebt.list','paymentVoucher.list','deliveryOrder.list','deliveryInstruction.list'
];

async function call(page, proc) {
  return page.evaluate(async ({ proc }) => {
    const url = `/tms/api/trpc/${proc}?batch=1&input=` + encodeURIComponent(JSON.stringify({ '0': { json: {} } }));
    const r = await fetch(url, { credentials: 'include' });
    let err = '';
    try { const j = await r.json(); err = j?.[0]?.error?.json?.code ?? j?.[0]?.error?.code ?? ''; } catch {}
    return { proc, status: r.status, err };
  }, { proc });
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('admin');
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForFunction(() => !location.pathname.endsWith('/login'), null, { timeout: 30000, polling: 300 });
  console.log('LOGIN OK', page.url());

  // sanity before revoke: product.list should NOT be 401
  const before = await call(page, 'product.list');
  console.log('BEFORE revoke product.list:', JSON.stringify(before));

  // revoke session
  execSync(`${RCLI} DEL auth:token:${ADMIN_ID}`);

  for (const p of LISTS) {
    const r = await call(page, p);
    console.log(`${r.status}\t${r.proc}\t${r.err}`);
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
