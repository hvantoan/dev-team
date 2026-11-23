// Debug AC11: tìm bộ lọc nào của màn Công nợ NCC trả về dòng dữ liệu để mở dialog.
const { chromium } = require('/home/vif/tuanvu/dev-team/tests/tms/node_modules/@playwright/test');
const APP_URL = (process.env.APP_URL || 'http://tuanvudev.localhost:4700/tms').replace(/\/?$/, '/');

(async () => {
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } });
  const page = await ctx.newPage();
  await page.goto(`${APP_URL}login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByLabel('Tên đăng nhập').or(page.locator('input[type="text"]').first()).fill('qa-supdeb-rc');
  await page.getByLabel('Mật khẩu').or(page.locator('input[type="password"]').first()).fill(process.env.QA_PW);
  for (let i = 0; i < 3; i++) {
    await page.locator('button:has-text("Đăng nhập")').click();
    await page.waitForTimeout(4000);
    if (!page.url().includes('/login')) break;
  }
  await page.goto(`${APP_URL}supplier-debt`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  const info = { url: page.url(), combos: [] };
  const combos = page.locator('.MuiInputBase-root, [role="combobox"]');
  const n = await combos.count();
  info.comboCount = n;
  for (let i = 0; i < Math.min(n, 6); i++) {
    const el = combos.nth(i);
    const text = (await el.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 60);
    info.combos = info.combos || [];
    info.combos.push({ i, text });
  }
  // thử mở từng combobox và chọn option khác, đếm số dòng bảng
  for (let i = 0; i < Math.min(n, 6); i++) {
    try {
      await combos.nth(i).click();
      await page.waitForTimeout(600);
      const opts = page.locator('[role="option"]');
      const count = await opts.count();
      for (let j = 0; j < count; j++) {
        const label = (await opts.nth(j).innerText().catch(() => '')).replace(/\s+/g, ' ');
        await opts.nth(j).click();
        await page.waitForTimeout(1500);
        const rows = await page.locator('table tbody tr').count();
        const empty = await page.locator('text=Không tìm thấy kết quả').count();
        info.combos[i] = { ...(info.combos[i] || { i }), option: label, rows, empty };
        if (rows > 1 || empty === 0) {
          info.hit = { combo: i, option: label, rows, empty };
          await page.screenshot({ path: 'debug-supplier-debt-rows.png' });
          console.log(JSON.stringify(info, null, 2));
          await browser.close();
          return;
        }
        await combos.nth(i).click().catch(() => {});
        await page.waitForTimeout(400);
      }
    } catch (e) {
      info.combos[i] = { ...(info.combos[i] || { i }), error: String(e).slice(0, 120) };
    }
  }
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
