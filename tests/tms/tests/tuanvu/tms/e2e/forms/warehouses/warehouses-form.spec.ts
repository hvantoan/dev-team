import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Quản lý kho bãi
 * Route: /warehouses
 * Module: modules/warehouse
 */
test.describe('TMS Feature Testing: Quản lý kho bãi (warehouses)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-WAREHOUSES-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('warehouses');
    await modulePage.expectHeader(/Danh sách kho/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-WAREHOUSES-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('warehouses');
    await modulePage.testSearchInput('Kho');
    await modulePage.testStatusTabs();
  });

  test('UAT-WAREHOUSES-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('warehouses/new', /Thêm kho/i);
    await modulePage.expectFieldLabels(['Mã kho', 'Tên kho']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-WAREHOUSES-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('warehouses/new', /Thêm kho/i);

    const inputField = page
      .getByLabel(/Mã kho/i)
      .or(page.locator('input[placeholder*="Mã kho"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/warehouses/);
  });
});
