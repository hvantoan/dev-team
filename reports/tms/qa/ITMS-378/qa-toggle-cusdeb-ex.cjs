// QA TMS — bật/tắt tạm quyền cusdeb_ex (Xuất Excel công nợ KH) trên role Manager, tenant tuanvudev (staging).
// Dùng: node qa-toggle-cusdeb-ex.cjs <grant|revert> <outDir> [--keep-open]
// Không đụng tới code; chỉ thao tác qua UI phân quyền của tenant.
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const MODE = process.argv[2];
const OUT = process.argv[3] || '/tmp/qa-toggle';
const BASE = 'http://tuanvudev.localhost:4700/tms';
const ROLE_URL = `${BASE}/roles/01KNB7PXPNDPER0AP0DPYTYT18`; // role Manager
const ACTION_NAME = 'Xuất Excel công nợ khách hàng'; // tên hành động trong bảng quyền của module
const MODULE_TREE_ID = 'mui-tree-view-1-child-20300'; // treeitem 'Công nợ' trong nhóm Quản lý quỹ

if (!['grant', 'revert'].includes(MODE)) {
  console.error('usage: node qa-toggle-cusdeb-ex.cjs <grant|revert> <outDir>');
  process.exit(2);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1']
  });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    recordVideo: { dir: path.join(OUT, 'video'), size: { width: 1600, height: 1000 } }
  });
  const page = await ctx.newPage();
  const report = { mode: MODE, role: 'Manager', action: ACTION_NAME, steps: [] };
  const note = (k, v) => {
    report.steps.push({ [k]: v });
    console.log(`${MODE} | ${k}: ${JSON.stringify(v)}`);
  };

  // ---------- login admin (retry: form cần hydrate xong mới submit được) ----------
  let session = null;
  for (let attempt = 1; attempt <= 3 && !session?.user; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    await page.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('admin');
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('123');
    await page.getByRole('button', { name: 'Đăng Nhập' }).click();
    await page.waitForTimeout(5000);
    await page
      .waitForFunction(() => !location.pathname.endsWith('/login'), null, { timeout: 40000, polling: 500 })
      .catch(() => {});
    session = await page.evaluate(() => fetch('/tms/api/auth/session').then((r) => r.json()).catch(() => null));
    console.log(`login attempt ${attempt}: user=${session?.user?.username ?? 'null'} url=${page.url()}`);
  }
  note('login', session?.user?.username ?? null);
  if (!session?.user) throw new Error('login admin thất bại');
  report.session_user = { username: session.user.username, isAdmin: session.user.isAdmin ?? null };

  // ---------- mở form sửa role Manager ----------
  await page.goto(ROLE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder="Tìm kiếm chức năng"]', { timeout: 60000 });
  await page.waitForTimeout(3000);
  note('role_form_title', (await page.locator('h4').first().innerText().catch(() => '')).trim());

  // ---------- chọn module Công nợ (con của nhóm Quản lý quỹ) ----------
  const groupItem = page.getByRole('treeitem', { name: /Quản lý quỹ/ }).first();
  if ((await groupItem.getAttribute('aria-expanded')) !== 'true') {
    await groupItem.click();
    await page.waitForTimeout(1200);
  }
  const moduleItem = page.locator(`#${MODULE_TREE_ID}`);
  await moduleItem.click();
  await page.waitForTimeout(2000);

  const row = page.locator('tbody tr', { hasText: ACTION_NAME }).first();
  await row.waitFor({ timeout: 30000 });
  const checkbox = row.locator('input[type="checkbox"]').first();
  const readState = async () => ({
    checked: await checkbox.isChecked(),
    rowText: (await row.innerText()).replace(/\s+/g, ' ').trim(),
    checked_rows_in_module: await page
      .locator('tbody tr')
      .evaluateAll((trs) => trs.filter((tr) => tr.querySelector('input[type="checkbox"]')?.checked).length)
  });
  const before = await readState();
  note('before', before);
  await page.screenshot({ path: path.join(OUT, `${MODE}-01-role-manager-before.png`), fullPage: false });

  const want = MODE === 'grant';
  if (before.checked === want) {
    note('noop', `đã ở trạng thái ${before.checked} — không cần đổi`);
    report.result = 'noop';
  } else {
    await checkbox.click();
    await page.waitForTimeout(800);
    const after = await readState();
    note('after_toggle_before_save', after);
    await page.screenshot({ path: path.join(OUT, `${MODE}-02-role-manager-toggled.png`) });

    await page.getByRole('button', { name: 'Lưu', exact: true }).click();
    const toastText = await page
      .locator('.Toastify__toast')
      .first()
      .innerText({ timeout: 45000 })
      .catch(() => '(không đọc được toast)');
    note('save_toast', toastText.replace(/\s+/g, ' ').trim().slice(0, 120));
    await page.waitForTimeout(4000);
    report.result = 'saved';
    await page.screenshot({ path: path.join(OUT, `${MODE}-03-role-manager-saved.png`) });
  }

  // ---------- đọc lại từ server để chứng minh trạng thái đã ghi ----------
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder="Tìm kiếm chức năng"]', { timeout: 60000 });
  const groupItem2 = page.getByRole('treeitem', { name: /Quản lý quỹ/ }).first();
  for (let i = 0; i < 3 && (await groupItem2.getAttribute('aria-expanded')) !== 'true'; i++) {
    await groupItem2.click();
    await page.waitForTimeout(1200);
  }
  await page.locator(`#${MODULE_TREE_ID}`).waitFor({ state: 'visible', timeout: 30000 });
  await page.locator(`#${MODULE_TREE_ID}`).click();
  await page.waitForTimeout(2500);
  const persisted = await readState();
  note('after_reload_persisted', persisted);
  await page.screenshot({ path: path.join(OUT, `${MODE}-04-role-manager-persisted.png`) });
  report.persisted = persisted;

  fs.writeFileSync(path.join(OUT, `${MODE}-result.json`), JSON.stringify(report, null, 1));
  await ctx.close();
  await browser.close();
  console.log(JSON.stringify(report));
})().catch(async (e) => {
  console.error('ERR', e.message);
  try {
    fs.writeFileSync(path.join(OUT, `${MODE}-error.txt`), String(e.stack || e));
  } catch {}
  process.exit(1);
});
