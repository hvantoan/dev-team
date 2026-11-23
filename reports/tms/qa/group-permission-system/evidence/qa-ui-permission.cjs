// UI verification (Playwright) cho group-permission-system — FE 0a448dd trên stack local.
// Dùng:
//   node qa-ui-permission.cjs <outDir> <ac10|ac11|ac3|ac12-save|ac12-check>
// Ảnh + JSON kết quả ghi vào <outDir>. Mật khẩu lấy từ env QA_PW (qa-env.sh), không in ra.
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('/home/vif/tuanvu/dev-team/tests/tms/node_modules/@playwright/test');

const APP_URL = (process.env.APP_URL || 'http://tuanvudev.localhost:4700/tms').replace(/\/?$/, '/');
const PW = process.env.QA_PW;
const outDir = process.argv[2] || '.';
const mode = process.argv[3] || 'ac10';
const STATE_FILE = path.join(outDir, 'ac12-browser-state.json');

if (!PW) {
  console.error('QA_PW is required');
  process.exit(2);
}

const shot = async (page, name) => {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
};

async function login(page, username) {
  await page.goto(`${APP_URL}login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  const user = page.getByLabel('Tên đăng nhập').or(page.locator('input[type="text"]').first());
  const pass = page.getByLabel('Mật khẩu').or(page.locator('input[type="password"]').first());
  await user.fill(username);
  await pass.fill(PW);
  const submit = page.locator('button:has-text("Đăng nhập")');
  // Dev server có thể chưa hydrate xong: bấm lại nếu vẫn ở /login.
  for (let attempt = 0; attempt < 3; attempt++) {
    await submit.click();
    try {
      await page.waitForFunction(() => !window.location.pathname.endsWith('/login'), { timeout: 12000 });
      break;
    } catch {
      await page.waitForTimeout(1500);
    }
  }
  try {
    await page.waitForFunction(() => !window.location.pathname.endsWith('/login'), { timeout: 20000 });
  } catch (err) {
    const info = {
      user: username,
      url: page.url(),
      bodyText: (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300),
      screenshot: await shot(page, `debug-login-${username}-${Date.now()}`),
    };
    throw new Error(`login did not leave /login: ${JSON.stringify(info)}`);
  }
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function openSupplierDebtDialog(page) {
  await page.goto(`${APP_URL}supplier-debt`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  const firstCell = page.locator('table tbody tr').first().locator('td').first();
  await firstCell.waitFor({ state: 'visible', timeout: 20000 });
  await firstCell.click();
  const dialog = page.locator('[role="dialog"]').first();
  try {
    await dialog.waitFor({ state: 'visible', timeout: 15000 });
  } catch (err) {
    const debugFile = await shot(page, `debug-dialog-${Date.now()}`);
    const info = {
      url: page.url(),
      rows: await page.locator('table tbody tr').count(),
      bodyText: (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400),
      screenshot: debugFile,
    };
    const e = new Error(`dialog did not open: ${JSON.stringify(info)}`);
    e.debug = info;
    throw e;
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  return dialog;
}

async function checkSupplierDebtButton(page, username, label) {
  await login(page, username);
  const dialog = await openSupplierDebtDialog(page);
  const title = await dialog.locator('h2, .MuiDialogTitle-root').first().innerText().catch(() => '');
  const calcButtons = await dialog.locator('[data-testid="CalculateRoundedIcon"]').count();
  const file = await shot(page, label);
  return { user: username, dialogTitle: title.slice(0, 120), calculateButtonCount: calcButtons, screenshot: file };
}

(async () => {
  const browser = await chromium.launch({
    args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1', '--no-sandbox'],
  });
  const result = { mode, appUrl: APP_URL, generatedAt: new Date().toISOString() };
  let context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 950 } });

  try {
    if (mode === 'ac10') {
      const page = await context.newPage();
      await login(page, 'qa-vehr-cu');
      const resp = await page.goto(`${APP_URL}vehicle-routes`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1500);
      result.httpStatus = resp ? resp.status() : null;
      result.finalUrl = page.url();
      result.heading = await page.locator('h1, h2, .MuiTypography-h5, .MuiTypography-h6').first().innerText().catch(() => '');
      result.hasLoginForm = await page.locator('input[type="password"]').count();
      result.tableRows = await page.locator('table tbody tr').count();
      result.bodyTextSample = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
      result.screenshot = await shot(page, 'ac10-vehr-cu-vehicle-routes');
      result.pass = result.hasLoginForm === 0 && !page.url().includes('/login');
    } else if (mode === 'ac11') {
      const positive = await checkSupplierDebtButton(await context.newPage(), 'qa-supdeb-rc', 'ac11-with-supdeb_rc');
      const ctx2 = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 950 } });
      const negative = await checkSupplierDebtButton(await ctx2.newPage(), 'qa-supdeb-hx-raw', 'ac11-without-supdeb_rc');
      await ctx2.close();
      result.positive = positive;
      result.negative = negative;
      result.pass = positive.calculateButtonCount > 0 && negative.calculateButtonCount === 0;
    } else if (mode === 'ac3') {
      const page = await context.newPage();
      await login(page, process.env.APP_USERNAME);
      await page.goto(`${APP_URL}roles/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      const steps = {};
      // Click từng nhóm module (7 nhóm gốc) để SimpleTreeView mở rộng và render module con.
      const parents = await page.getByRole('treeitem').all();
      for (const parent of parents) {
        const name = await parent.innerText().catch(() => '');
        if (/Sản phẩm|Kho|Đối tác|Tài xế|Phương tiện|Tuyến xe/.test(name)) continue;
        await parent.click().catch(() => {});
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(800);
      // Module Đối tác: tick "Thêm/Sửa" (cus_cu) → "Xem" (cus_r) phải tự tick.
      await page.getByRole('treeitem', { name: /Đối tác/ }).first().click();
      await page.waitForTimeout(800);
      const rowOf = (name) => page.locator('table tbody tr').filter({ hasText: name }).first();
      const checkboxOf = (name) => rowOf(name).locator('input[type="checkbox"]').first();
      steps.before = { cus_r: await checkboxOf('Xem').isChecked(), cus_cu: await checkboxOf('Thêm/Sửa').isChecked() };
      await checkboxOf('Thêm/Sửa').check();
      await page.waitForTimeout(500);
      steps.afterCusCu = { cus_r: await checkboxOf('Xem').isChecked(), cus_cu: await checkboxOf('Thêm/Sửa').isChecked() };
      steps.screenshotDoiTac = await shot(page, 'ac3-tick-cus_cu');
      // Cross-module cùng nhóm: Tuyến xe (vehr_r) cũng phải tự tick.
      await page.getByRole('treeitem', { name: /Tuyến xe/ }).first().click();
      await page.waitForTimeout(800);
      steps.tuyenXe = { vehr_r: await checkboxOf('Xem').isChecked() };
      steps.screenshotTuyenXe = await shot(page, 'ac3-cross-module-vehr_r');
      result.steps = steps;
      result.pass =
        steps.before.cus_r === false &&
        steps.afterCusCu.cus_r === true &&
        steps.afterCusCu.cus_cu === true &&
        steps.tuyenXe.vehr_r === true;
    } else if (mode === 'ac12-save') {
      const page = await context.newPage();
      await login(page, process.env.APP_USERNAME);
      await page.goto(`${APP_URL}supplier-debt`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await context.storageState({ path: STATE_FILE });
      result.savedState = STATE_FILE;
      result.url = page.url();
      result.pass = true;
    } else if (mode === 'ac12-check') {
      await context.close();
      context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: STATE_FILE, viewport: { width: 1600, height: 950 } });
      const page = await context.newPage();
      const resp = await page.goto(`${APP_URL}supplier-debt`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(3000);
      result.httpStatus = resp ? resp.status() : null;
      result.finalUrl = page.url();
      result.hasLoginForm = await page.locator('input[type="password"]').count();
      result.screenshot = await shot(page, 'ac12-after-flush-redirect');
      result.pass = result.finalUrl.includes('/login') || result.hasLoginForm > 0;
    } else {
      throw new Error(`unknown mode ${mode}`);
    }
  } catch (err) {
    result.error = String(err);
    result.pass = false;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  fs.writeFileSync(path.join(outDir, `ui-${mode}-result.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.pass ? 0 : 1);
})();
