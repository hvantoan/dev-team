// Probe cấu trúc form phân quyền của role Manager (chỉ đọc)
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
  await p.goto(`${BASE}/roles/01KNB7PXPNDPER0AP0DPYTYT18`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(7000);
  await p.screenshot({ path: '/tmp/role-form.png', fullPage: true });
  const lis = await p.locator('[role="treeitem"]').evaluateAll((els) =>
    els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 60))
  );
  console.log('TREEITEMS', JSON.stringify(lis));
  const t = await p.locator('main').innerText();
  console.log('PAGE_TEXT_HEAD', t.replace(/\s+/g, ' ').slice(0, 1500));
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
