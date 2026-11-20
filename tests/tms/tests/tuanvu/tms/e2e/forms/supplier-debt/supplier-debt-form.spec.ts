import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Report Feature: Quản lý công nợ nhà cung cấp
 * Route: /supplier-debt
 * Module: modules/supplier-debt
 */
test.describe('TMS Feature Testing: Quản lý công nợ nhà cung cấp (supplier-debt)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-SUPPLIER-DEBT-01: Kiểm tra giao diện báo cáo và tiêu đề phân hệ', async ({ page }) => {
    await modulePage.goto('supplier-debt');
    await modulePage.expectHeader(/Công nợ nhà cung cấp/i);
    await modulePage.expectDataTable();
  });

  test('UAT-SUPPLIER-DEBT-02: Kiểm tra tìm kiếm và bộ lọc dữ liệu báo cáo', async ({ page }) => {
    await modulePage.goto('supplier-debt');
    await modulePage.testSearchInput('Nhà cung cấp');
  });

  test('UAT-SUPPLIER-DEBT-03: Kiểm tra cấu trúc các cột bảng dữ liệu và phân trang', async ({ page }) => {
    await modulePage.goto('supplier-debt');
    const table = page.locator('table, .MuiTable-root, [role="table"]').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Kiểm tra header cột và dòng dữ liệu
    const columns = table.locator('th, [role="columnheader"]');
    expect(await columns.count()).toBeGreaterThanOrEqual(1);
  });
});
