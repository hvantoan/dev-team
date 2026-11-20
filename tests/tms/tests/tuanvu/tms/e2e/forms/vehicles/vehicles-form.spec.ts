import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Quản lý phương tiện xe
 * Route: /vehicles
 * Module: modules/vehicle
 */
test.describe('TMS Feature Testing: Quản lý phương tiện xe (vehicles)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-VEHICLES-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('vehicles');
    await modulePage.expectHeader(/Danh sách phương tiện/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-VEHICLES-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('vehicles');
    await modulePage.testSearchInput('Xe');
    await modulePage.testStatusTabs();
  });

  test('UAT-VEHICLES-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('vehicles/new', /Thêm phương tiện/i);
    await modulePage.expectFieldLabels(['Mã phương tiện', 'Biển số']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-VEHICLES-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('vehicles/new', /Thêm phương tiện/i);

    const inputField = page
      .getByLabel(/Mã phương tiện/i)
      .or(page.locator('input[placeholder*="Mã phương tiện"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/vehicles/);
  });
});
