// Probe: quét mọi module trong form role, tìm action liên quan "Xuất Excel công nợ khách hàng"
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
  await p.waitForTimeout(8000);

  const items = p.locator('[role="treeitem"]');
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    const label = (await items.nth(i).innerText()).replace(/\s+/g, ' ').trim();
    await items.nth(i).locator('.MuiTreeItem-content').first().click({ force: true });
    await p.waitForTimeout(1800);
    // mở rộng module để lộ các module con
    await items.nth(i).locator('.MuiTreeItem-iconContainer').first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(800);
    const rows = await p.locator('tbody tr').evaluateAll((trs) =>
      trs
        .map((tr) => ({
          t: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 60),
          checked: tr.querySelector('input[type="checkbox"]')?.checked ?? null
        }))
        .filter((r) => /xuất|excel/i.test(r.t))
    );
    console.log('MODULE', i, label, 'export_rows', JSON.stringify(rows));
  }
  // liệt kê tất cả item sau khi mở rộng
  console.log('ALL_ITEMS', JSON.stringify(await items.evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g,' ').trim().slice(0,30)))));
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
