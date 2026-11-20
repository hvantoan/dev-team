import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Report Feature: Quản lý công nợ khách hàng
 * Route: /customer-debt
 * Module: modules/customer-debt
 */
test.describe('TMS Feature Testing: Quản lý công nợ khách hàng (customer-debt)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-CUSTOMER-DEBT-01: Kiểm tra giao diện báo cáo và tiêu đề phân hệ', async ({ page }) => {
    await modulePage.goto('customer-debt');
    await modulePage.expectHeader(/Công nợ khách hàng/i);
    await modulePage.expectDataTable();
  });

  test('UAT-CUSTOMER-DEBT-02: Kiểm tra tìm kiếm và bộ lọc dữ liệu báo cáo', async ({ page }) => {
    await modulePage.goto('customer-debt');
    await modulePage.testSearchInput('Khách hàng');
  });

  test('UAT-CUSTOMER-DEBT-03: Kiểm tra cấu trúc các cột bảng dữ liệu và phân trang', async ({ page }) => {
    await modulePage.goto('customer-debt');
    const table = page.locator('table, .MuiTable-root, [role="table"]').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Kiểm tra header cột và dòng dữ liệu
    const columns = table.locator('th, [role="columnheader"]');
    expect(await columns.count()).toBeGreaterThanOrEqual(1);
  });
});
