// Probe (chỉ đọc): mở rộng cây, chọn module 20300 (Công nợ khách hàng), đọc trạng thái checkbox cusdeb_ex
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const BASE = 'http://tuanvudev.localhost:4700/tms';
const ID = '01KNB7PXPNDPER0AP0DPYTYT18';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1'] });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('admin');
  await p.getByRole('textbox', { name: 'Mật khẩu' }).fill('123');
  await p.getByRole('button', { name: 'Đăng Nhập' }).click();
  await p.waitForTimeout(6000);
  await p.goto(`${BASE}/roles/${ID}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(7000);

  const list = async (tag) =>
    console.log(
      tag,
      JSON.stringify(
        await p.locator('[role="treeitem"]').evaluateAll((els) =>
          els.map((e) => ({
            id: e.id.replace('mui-tree-view-1-', ''),
            expanded: e.getAttribute('aria-expanded')
          }))
        )
      )
    );
  await list('BEFORE');

  // mở rộng mọi node có aria-expanded
  for (let round = 0; round < 3; round++) {
    const nodes = p.locator('[role="treeitem"][aria-expanded="false"]');
    const n = await nodes.count();
    if (!n) break;
    for (let i = 0; i < n; i++) {
      await nodes.nth(i).locator('.MuiTreeItem-iconContainer').first().click({ force: true }).catch(() => {});
      await p.waitForTimeout(300);
    }
  }
  await list('AFTER_EXPAND');

  const target = p.locator('[role="treeitem"][id$="-module-20300"]');
  console.log('module_20300_count', await target.count());
  if ((await target.count()) > 0) {
    await target.first().locator('.MuiTreeItem-content').first().click({ force: true });
    await p.waitForTimeout(2000);
    const rows = await p.locator('tbody tr').evaluateAll((trs) =>
      trs.map((tr) => ({
        t: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 60),
        checked: tr.querySelector('input[type="checkbox"]')?.checked ?? null,
        disabled: tr.querySelector('input[type="checkbox"]')?.disabled ?? null
      }))
    );
    console.log('ROWS', JSON.stringify(rows));
  }
  await p.screenshot({ path: '/tmp/role-20300.png', fullPage: true });
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
