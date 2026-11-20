// Probe: click đúng phần content của treeitem, xem bảng action có render không
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const BASE = 'http://tuanvudev.localhost:4700/tms';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1'] });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)));
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('admin');
  await p.getByRole('textbox', { name: 'Mật khẩu' }).fill('123');
  await p.getByRole('button', { name: 'Đăng Nhập' }).click();
  await p.waitForTimeout(6000);
  await p.goto(`${BASE}/roles/01KNB7PXPNDPER0AP0DPYTYT18`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(8000);

  const items = p.locator('[role="treeitem"]');
  const n = await items.count();
  console.log('treeitem count', n, 'ids', JSON.stringify(await items.evaluateAll((els) => els.map((e) => e.id))));

  for (let i = 0; i < n; i++) {
    const content = items.nth(i).locator('.MuiTreeItem-content').first();
    await content.click({ force: true }).catch(async () => items.nth(i).click({ force: true }));
    await p.waitForTimeout(2000);
    const rows = await p.locator('tbody tr').count();
    const sel = await p.locator('[role="treeitem"][aria-selected="true"]').evaluateAll((els) => els.map((e) => e.innerText.trim().slice(0, 30)));
    console.log('click', i, 'tbody_rows', rows, 'selected', JSON.stringify(sel));
    if (rows > 0) {
      console.log('SAMPLE', (await p.locator('tbody').last().innerText()).replace(/\s+/g, ' ').slice(0, 400));
      break;
    }
  }
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
