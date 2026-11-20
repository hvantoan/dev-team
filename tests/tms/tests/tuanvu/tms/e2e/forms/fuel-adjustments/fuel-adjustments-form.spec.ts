import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Điều chỉnh nhiên liệu
 * Route: /fuel-adjustments
 * Module: modules/fuel-adjustment
 */
test.describe('TMS Feature Testing: Điều chỉnh nhiên liệu (fuel-adjustments)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-FUEL-ADJUSTMENTS-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('fuel-adjustments');
    await modulePage.expectHeader(/Kiểm kê nhiên liệu/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-FUEL-ADJUSTMENTS-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('fuel-adjustments');
    await modulePage.testSearchInput('Kiểm kê');
    await modulePage.testStatusTabs();
  });

  test('UAT-FUEL-ADJUSTMENTS-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('fuel-adjustments/new', /Thêm phiếu kiểm kê/i);
    await modulePage.expectFieldLabels(['Mã phiếu']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-FUEL-ADJUSTMENTS-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('fuel-adjustments/new', /Thêm phiếu kiểm kê/i);

    const inputField = page
      .getByLabel(/Mã phiếu/i)
      .or(page.locator('input[placeholder*="Mã phiếu"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/fuel-adjustments/);
  });
});
