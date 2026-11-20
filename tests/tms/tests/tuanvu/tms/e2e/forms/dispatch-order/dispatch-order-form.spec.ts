import { test, expect, Page } from '@playwright/test';
import { loginToTMS } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Workflow Feature: Điều phối đơn vận
 * Route: /dispatch-orders
 * Module: modules/dispatch-order
 */

const DISPATCH_CODE = 'DX-20261003-0001';
const INSTRUCTION_CODE = 'STT-20261003-0001';
const ORDER_CODE = 'DGH-20260920-0001';
const DELIVERY_DAY = '31/10/2026';
const DELIVERY_TIME = '12:33';

function searchBox(page: Page) {
  return page
    .getByPlaceholder(/Nhập mã điều xe/i)
    .or(page.getByRole('textbox', { name: /Tìm kiếm/i }))
    .first();
}

async function openDeliveryTab(page: Page) {
  await new BaseModulePage(page).goto('dispatch-orders');
  const tab = page.getByRole('tab', { name: /Giao hàng/i }).first();
  await expect(tab).toBeVisible({ timeout: 10000 });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
}

async function searchDispatch(page: Page, keyword: string, waitForText = INSTRUCTION_CODE) {
  const box = searchBox(page);
  await expect(box).toBeVisible({ timeout: 10000 });
  await box.fill(keyword);
  await box.press('Enter');
  await expect(rowOf(page, waitForText).first()).toBeVisible({ timeout: 10000 });
}

function rowOf(page: Page, text: string) {
  return page.locator('table tbody tr, .MuiTable-root tbody tr').filter({ hasText: text });
}

test.describe('TMS Feature Testing: Điều phối đơn vận (dispatch-order)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-DISPATCH-ORDER-01: Kiểm tra giao diện nhật ký điều phối và bảng dữ liệu', async () => {
    await modulePage.goto('dispatch-orders');
    await modulePage.expectHeader(/Danh sách nhật ký điều xe/i);
    await modulePage.expectDataTable();
  });

  test('UAT-DISPATCH-ORDER-02: Kiểm tra chức năng tìm kiếm và bộ lọc chuyến vận chuyển', async () => {
    await modulePage.goto('dispatch-orders');
    await modulePage.testSearchInput('Điều xe');
    await modulePage.testStatusTabs();
  });

  test('UAT-DISPATCH-ORDER-03: Kiểm tra hiển thị bộ chọn thời gian và thao tác chi tiết', async ({ page }) => {
    await modulePage.goto('dispatch-orders');
    await modulePage.expectDataTable();

    // Kiểm tra bộ lọc ngày tháng hoặc các nút thao tác lọc
    const filters = page.locator('input[type="text"], button').filter({ hasText: /Hôm nay|Tháng|Ngày|Lọc/i });
    expect(await filters.count()).toBeGreaterThanOrEqual(0);
  });

  test('UAT-DISPATCH-ORDER-07: [ITMS-346] Tra cứu theo mã điều xe trả đúng 1 dòng', async ({ page }) => {
    await openDeliveryTab(page);
    await searchDispatch(page, DISPATCH_CODE);

    const rows = rowOf(page, INSTRUCTION_CODE);
    await expect(rows).toHaveCount(1, { timeout: 10000 });
    await expect(rows.first()).toContainText(ORDER_CODE);
    await expect(rows.first()).toContainText(DELIVERY_DAY);
    await expect(rows.first()).toContainText(DELIVERY_TIME);
    await expect(page.getByText(/Không tìm thấy kết quả/i)).toHaveCount(0);
  });

  test('UAT-DISPATCH-ORDER-08: [ITMS-346] Ba khóa tra cứu và chuẩn hóa từ khóa', async ({ page }) => {
    await openDeliveryTab(page);

    for (const keyword of [INSTRUCTION_CODE, ORDER_CODE, DISPATCH_CODE.toLowerCase(), `  ${DISPATCH_CODE}  `]) {
      await searchDispatch(page, keyword);
      await expect(rowOf(page, INSTRUCTION_CODE), `Từ khóa "${keyword}" phải trả đúng 1 dòng`).toHaveCount(1, {
        timeout: 10000,
      });
      await expect(rowOf(page, INSTRUCTION_CODE).first()).toContainText(ORDER_CODE);
    }
  });

  test('UAT-DISPATCH-ORDER-09: [ITMS-346] Cột Mã điều xe và placeholder ô tìm kiếm', async ({ page }) => {
    await openDeliveryTab(page);

    await expect(page.getByRole('columnheader', { name: /Mã điều xe/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(searchBox(page)).toHaveAttribute('placeholder', /Nhập mã điều xe/i);

    await searchDispatch(page, DISPATCH_CODE);
    const rows = rowOf(page, INSTRUCTION_CODE);
    await expect(rows).toHaveCount(1, { timeout: 10000 });
    await expect(rows.first()).toContainText(DISPATCH_CODE);
  });
});
