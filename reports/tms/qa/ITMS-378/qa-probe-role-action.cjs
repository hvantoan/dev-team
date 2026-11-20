// Probe: tìm module chứa action "Xuất Excel công nợ khách hàng" trong form phân quyền
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

  const search = p.locator('input[placeholder="Tìm kiếm chức năng"]');
  await search.fill('công nợ');
  await p.waitForTimeout(1500);
  const items = await p.locator('[role="treeitem"]').evaluateAll((els) =>
    els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 60))
  );
  console.log('TREE_FILTERED', JSON.stringify(items));

  for (let i = 0; i < items.length; i++) {
    await p.locator('[role="treeitem"]').nth(i).click();
    await p.waitForTimeout(1800);
    const rows = await p.locator('tbody tr').evaluateAll((trs) =>
      trs
        .map((tr) => ({
          t: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 60),
          checked: tr.querySelector('input[type="checkbox"]')?.checked ?? null
        }))
        .filter((r) => /xuất|excel/i.test(r.t))
    );
    if (rows.length) console.log('MODULE', items[i], JSON.stringify(rows));
  }
  await p.screenshot({ path: '/tmp/role-module-finance.png', fullPage: true });
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
