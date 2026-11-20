import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Tuyến đường vận chuyển
 * Route: /vehicle-routes
 * Module: modules/vehicle-route
 */
test.describe('TMS Feature Testing: Tuyến đường vận chuyển (vehicle-routes)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-VEHICLE-ROUTES-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('vehicle-routes');
    await modulePage.expectHeader(/Danh sách tuyến xe/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-VEHICLE-ROUTES-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('vehicle-routes');
    await modulePage.testSearchInput('Tuyến');
    await modulePage.testStatusTabs();
  });

  test('UAT-VEHICLE-ROUTES-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('vehicle-routes/new', /Thêm tuyến xe/i);
    await modulePage.expectFieldLabels(['Mã tuyến xe', 'Tên tuyến xe']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-VEHICLE-ROUTES-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('vehicle-routes/new', /Thêm tuyến xe/i);

    const inputField = page
      .getByLabel(/Mã tuyến xe/i)
      .or(page.locator('input[placeholder*="Mã tuyến xe"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/vehicle-routes/);
  });
});
