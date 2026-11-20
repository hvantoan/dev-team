// Probe: dump toàn bộ action rows của module khớp từ khóa "công nợ"
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

  const dump = async (tag) => {
    const rows = await p.locator('tbody tr').evaluateAll((trs) =>
      trs.map((tr) => ({
        t: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 70),
        n: tr.querySelectorAll('input[type="checkbox"]').length,
        checked: tr.querySelector('input[type="checkbox"]')?.checked ?? null
      }))
    );
    console.log(tag, JSON.stringify(rows));
  };

  await dump('DEFAULT_ROWS');

  const search = p.locator('input[placeholder="Tìm kiếm chức năng"]');
  await search.fill('công nợ');
  await p.waitForTimeout(1500);
  const items = p.locator('[role="treeitem"]');
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    const label = (await items.nth(i).innerText()).replace(/\s+/g, ' ').trim();
    // click vào phần nhãn (tránh icon mở rộng)
    await items.nth(i).getByText(/./).first().click().catch(async () => items.nth(i).click());
    await p.waitForTimeout(2500);
    const rows = await p.locator('tbody tr').evaluateAll((trs) =>
      trs.map((tr) => ({ t: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 70), checked: tr.querySelector('input[type="checkbox"]')?.checked ?? null }))
    );
    console.log('AFTER_CLICK', JSON.stringify({ i, label, rowCount: rows.length, rows: rows.slice(0, 40) }));
  }
  await p.screenshot({ path: '/tmp/role-after-click.png', fullPage: true });
  await b.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
