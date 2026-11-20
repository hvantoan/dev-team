// Probe: tìm action Xuất Excel công nợ KH trong cây quyền (dùng id treeitem ổn định)
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const BASE = 'http://tuanvudev.localhost:4700/tms';
const ROLE = '01KNB7PXPNDPER0AP0DPYTYT18';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1'] });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('admin');
  await p.getByRole('textbox', { name: 'Mật khẩu' }).fill('123');
  await p.getByRole('button', { name: 'Đăng Nhập' }).click();
  await p.waitForTimeout(6000);
  await p.goto(`${BASE}/roles/${ROLE}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(8000);

  // mở rộng tất cả module cha
  for (const id of [10000, 20000, 30000, 40000, 50000, 60000, 70000]) {
    const li = p.locator(`[role="treeitem"][id$="-module-${id}"]`);
    if ((await li.count()) === 0) continue;
    await li.first().locator('.MuiTreeItem-iconContainer').first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(500);
  }
  const all = await p.locator('[role="treeitem"]').evaluateAll((els) =>
    els.map((e) => ({ id: e.id.replace('mui-tree-view-1-', ''), text: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 40) }))
  );
  console.log('ALL', JSON.stringify(all));

  for (const item of all) {
    const li = p.locator(`[role="treeitem"][id$="-${item.id}"]`).first();
    await li.locator('.MuiTreeItem-content').first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(1200);
    const rows = await p.locator('tbody tr').evaluateAll((trs) =>
      trs
        .map((tr) => ({
          t: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 55),
          checked: tr.querySelector('input[type="checkbox"]')?.checked ?? null
        }))
        .filter((r) => /xuất|excel|công nợ/i.test(r.t))
    );
    if (rows.length) console.log('HIT', item.id, item.text, JSON.stringify(rows));
  }
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
