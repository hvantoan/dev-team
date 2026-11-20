import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Quản lý tài xế
 * Route: /drivers
 * Module: modules/driver
 */
test.describe('TMS Feature Testing: Quản lý tài xế (drivers)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-DRIVERS-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('drivers');
    await modulePage.expectHeader(/Danh sách tài xế/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-DRIVERS-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('drivers');
    await modulePage.testSearchInput('Tài xế');
    await modulePage.testStatusTabs();
  });

  test('UAT-DRIVERS-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('drivers/new', /Thêm tài xế/i);
    await modulePage.expectFieldLabels(['Mã tài xế', 'Họ và tên']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-DRIVERS-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('drivers/new', /Thêm tài xế/i);

    const inputField = page
      .getByLabel(/Mã tài xế/i)
      .or(page.locator('input[placeholder*="Mã tài xế"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/drivers/);
  });
});
