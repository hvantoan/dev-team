import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Quản lý chi phí
 * Route: /costs
 * Module: modules/cost
 */
test.describe('TMS Feature Testing: Quản lý chi phí (costs)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-COSTS-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('costs');
    await modulePage.expectHeader(/Danh sách chi phí/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-COSTS-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('costs');
    await modulePage.testSearchInput('Chi phí');
    await modulePage.testStatusTabs();
  });

  test('UAT-COSTS-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('costs/new', /Thêm chi phí/i);
    await modulePage.expectFieldLabels(['Mã chi phí', 'Tên chi phí']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-COSTS-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('costs/new', /Thêm chi phí/i);

    const inputField = page
      .getByLabel(/Mã chi phí/i)
      .or(page.locator('input[placeholder*="Mã chi phí"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/costs/);
  });
});
