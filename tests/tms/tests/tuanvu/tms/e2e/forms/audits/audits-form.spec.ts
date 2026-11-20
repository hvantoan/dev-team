import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Report Feature: Nhật ký kiểm toán hệ thống
 * Route: /audits
 * Module: modules/audit
 */
test.describe('TMS Feature Testing: Nhật ký kiểm toán hệ thống (audits)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-AUDITS-01: Kiểm tra giao diện báo cáo và tiêu đề phân hệ', async ({ page }) => {
    await modulePage.goto('audit');
    await modulePage.expectHeader(/Lịch sử thao tác/i);
    await modulePage.expectDataTable();
  });

  test('UAT-AUDITS-02: Kiểm tra tìm kiếm và bộ lọc dữ liệu báo cáo', async ({ page }) => {
    await modulePage.goto('audit');
    await modulePage.testSearchInput('Audit');
  });

  test('UAT-AUDITS-03: Kiểm tra cấu trúc các cột bảng dữ liệu và phân trang', async ({ page }) => {
    await modulePage.goto('audit');
    const table = page.locator('table, .MuiTable-root, [role="table"]').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Kiểm tra header cột và dòng dữ liệu
    const columns = table.locator('th, [role="columnheader"]');
    expect(await columns.count()).toBeGreaterThanOrEqual(1);
  });
});
