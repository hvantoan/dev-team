// QA TMS independent runtime check for ITMS-378 (export Excel button visibility).
// Own assertions + own screenshots + video. Not derived from Dev's evidence script.
// Usage: node qa-verify-itms-378.cjs <outDir> <username> <password> <label>
const { chromium } = require('/home/vif/tuan-vu/tms-test/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.QA_BASE || 'http://tuanvudev.localhost:4700/tms';
const OUT = process.argv[2] || '/home/vif/tuanvu/tms-team/reports/qa/ITMS-378/evidence/qa-run';
const USER = process.argv[3] || 'hvantoan';
const PASS = process.argv[4] || '123';
const LABEL = process.argv[5] || USER;

const EXPORT_SEL =
  'button:has-text("Xuất"),button:has-text("Excel"),[data-testid*="export" i],[aria-label*="Xuất" i],[aria-label*="Excel" i]';
const DAY_CELLS = '[role="dialog"] [role="gridcell"] button, [role="dialog"] button[role="gridcell"]';

const results = [];
const log = (k, v) => {
  results.push({ check: k, value: v });
  console.log(`[${LABEL}] ${k}: ${JSON.stringify(v)}`);
};

/** Mở lịch của 2 ô ngày và chọn ngày theo index (form chỉ commit khi người dùng tương tác). */
async function pickDateRange(page, startCell, endCell) {
  const icons = page.locator('main button[aria-label*="date" i], main button[aria-label*="ngày" i]');
  for (const [nth, cell] of [
    [0, startCell],
    [1, endCell]
  ]) {
    await icons.nth(nth).click();
    await page.waitForTimeout(700);
    const cells = page.locator(DAY_CELLS);
    await cells.nth(cell).click();
    await page.waitForTimeout(1200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(4000);
}

function attachVideo(ctx, dir) {
  return ctx; // video do Playwright tự ghi vào dir khi đóng context
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--host-resolver-rules=MAP tuanvudev.localhost 127.0.0.1']
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: path.join(OUT, 'video'), size: { width: 1440, height: 900 } }
  });
  attachVideo(ctx, path.join(OUT, 'video'));
  const page = await ctx.newPage();
  const trpcErrors = [];
  const exportCalls = [];
  page.on('response', async (r) => {
    if (r.url().includes('customerDebt') && r.status() >= 400) {
      trpcErrors.push({ proc: r.url().split('/api/trpc/')[1]?.split('?')[0], status: r.status() });
    }
    if (/customerDebt\.export/.test(r.url())) {
      exportCalls.push({
        proc: r.url().split('/api/trpc/')[1],
        status: r.status(),
        payload: r.request().postData()
      });
    }
  });

  // ---------- login (retry: form cần hydrate xong mới submit được) ----------
  let session = null;
  for (let attempt = 1; attempt <= 3 && !session?.user; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    await page.getByRole('textbox', { name: 'Tên đăng nhập' }).fill(USER);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(PASS);
    await page.getByRole('button', { name: 'Đăng Nhập' }).click();
    await page.waitForTimeout(5000);
    await page
      .waitForFunction(() => !location.pathname.endsWith('/login'), null, { timeout: 40000, polling: 500 })
      .catch(() => {});
    session = await page.evaluate(() => fetch('/tms/api/auth/session').then((r) => r.json()).catch(() => null));
    console.log(`login attempt ${attempt}: user=${session?.user?.username ?? 'null'} url=${page.url()}`);
  }
  log('login', { user: session?.user ?? null });
  if (!session?.user) throw new Error('Đăng nhập thất bại: không có session');

  // ---------- vào màn công nợ, đặt kỳ lọc hợp lệ ----------
  await page.goto(`${BASE}/customer-debt`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table', { timeout: 120000 });
  await page.waitForTimeout(2000);
  await pickDateRange(page, 14, 19); // 15/10/2026 -> 20/11/2026
  log('filter_dates', await page.locator('main input.MuiPickersInputBase-input').evaluateAll((is) => is.map((i) => i.value)));

  await page.screenshot({ path: path.join(OUT, `${LABEL}-01-customer-debt.png`) });
  log('AC-01 vt1_export_buttons_in_dom', await page.locator(EXPORT_SEL).count());
  log('AC-01 rows', await page.locator('table tbody tr').count());
  log(
    'AC-01 main_buttons',
    await page.locator('main button').evaluateAll((bs) =>
      bs.map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 40)).filter(Boolean)
    )
  );

  // ---------- AC-04: Tab 40 lần, không điểm dừng nào vào hành động xuất ----------
  await page.locator('main').first().click({ position: { x: 5, y: 5 } }).catch(() => {});
  const tabHits = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return '';
      return [el.getAttribute('aria-label'), el.getAttribute('title'), el.textContent]
        .filter(Boolean)
        .join(' ')
        .trim()
        .slice(0, 40);
    });
    if (/xuất|excel/i.test(info)) tabHits.push(info);
  }
  log('AC-04 tab_focus_export_hits', tabHits);

  // ---------- AC-07: bộ lọc 0 bản ghi ----------
  const search = page.getByPlaceholder('Tìm theo tên khách hàng').first();
  await search.fill('ZZZ_KHONG_CO_KHACH_HANG_NAY');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(OUT, `${LABEL}-07-empty-result.png`) });
  log('AC-07 rows_when_empty_filter', await page.locator('table tbody tr').count());
  log('AC-07 vt1_export_buttons_when_empty', await page.locator(EXPORT_SEL).count());
  await search.fill('');
  await page.waitForTimeout(4000);

  // ---------- AC-02: popup Lịch sử giao dịch KH-05 ----------
  const kh05 = page.getByText('KH-05', { exact: true }).first();
  const hasKh05 = (await kh05.count()) > 0;
  log('AC-02 kh05_row_present', hasKh05);
  if (hasKh05) {
    await kh05.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 30000 });
    await page.waitForTimeout(2000);
    const dlg = page.locator('[role="dialog"]').first();
    await dlg.screenshot({ path: path.join(OUT, `${LABEL}-02-history-dialog.png`) });
    log('AC-02 dialog_title', (await dlg.innerText()).replace(/\s+/g, ' ').slice(0, 80));
    log('AC-02 vt2_export_buttons_in_dom', await dlg.locator(EXPORT_SEL).count());
    log(
      'AC-02 vt2_dialog_buttons',
      await dlg.locator('button').evaluateAll((bs) =>
        bs.map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 40)).filter(Boolean)
      )
    );

    // ---------- AC-06: VT2 với người có quyền ----------
    if ((await dlg.locator(EXPORT_SEL).count()) > 0) {
      const dl = page.waitForEvent('download', { timeout: 45000 }).catch(() => null);
      await dlg.locator(EXPORT_SEL).first().click();
      const file = await dl;
      if (file) {
        const saved = path.join(OUT, `${LABEL}-06-vt2-export.xlsx`);
        await file.saveAs(saved);
        log('AC-06 vt2_download', { name: file.suggestedFilename(), bytes: fs.statSync(saved).size });
      } else {
        log('AC-06 vt2_download', 'none');
      }
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(OUT, `${LABEL}-06-vt2-after-export.png`) });
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(1200);
  }

  // ---------- AC-05: VT1 với người có quyền ----------
  await page.goto(`${BASE}/customer-debt`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table', { timeout: 120000 });
  await page.waitForTimeout(2000);
  await pickDateRange(page, 14, 19);
  await page.screenshot({ path: path.join(OUT, `${LABEL}-05-vt1-filter-bar.png`) });
  if ((await page.locator(EXPORT_SEL).count()) > 0) {
    const dl = page.waitForEvent('download', { timeout: 45000 }).catch(() => null);
    await page.locator(EXPORT_SEL).first().click();
    const file = await dl;
    if (file) {
      const saved = path.join(OUT, `${LABEL}-05-vt1-export.xlsx`);
      await file.saveAs(saved);
      log('AC-05 vt1_download', { name: file.suggestedFilename(), bytes: fs.statSync(saved).size });
    } else {
      log('AC-05 vt1_download', 'none');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, `${LABEL}-05-vt1-after-export.png`) });
  }

  // ---------- AC-03: gọi thẳng tRPC export bằng session hiện tại ----------
  for (const proc of ['customerDebt.exportExcel', 'customerDebt.exportDetail']) {
    const probe = await page.evaluate(
      async ({ base, p }) => {
        const res = await fetch(`${base}/api/trpc/${p}?batch=1`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            0: {
              json: {
                startDate: '2026-10-15T00:00:00+07:00',
                endDate: '2026-11-20T23:59:59+07:00',
                customerId: '',
                customerCode: 'KH-05',
                type: 'in_period',
                isAll: true
              }
            }
          })
        });
        const text = (await res.text()).slice(0, 300);
        return { status: res.status, body: text };
      },
      { base: BASE, p: proc }
    );
    log(`AC-03 direct_${proc}`, { status: probe.status, body: probe.body.slice(0, 200) });
  }
  log('failed_trpc_calls', trpcErrors.slice(0, 8));
  log('export_calls', exportCalls.slice(0, 4));

  await ctx.close();
  await browser.close();
  fs.writeFileSync(path.join(OUT, `${LABEL}-result.json`), JSON.stringify(results, null, 1));
  console.log('QA-DONE');
})().catch((e) => {
  console.error('QA-FAIL', e.message);
  process.exit(1);
});
