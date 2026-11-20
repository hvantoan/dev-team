import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Phân quyền & vai trò
 * Route: /roles
 * Module: modules/role
 */
test.describe('TMS Feature Testing: Phân quyền & vai trò (roles)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-ROLES-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('roles');
    await modulePage.expectHeader(/Phân quyền/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-ROLES-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('roles');
    await modulePage.testSearchInput('Admin');
    await modulePage.testStatusTabs();
  });

  test('UAT-ROLES-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('roles/new', /Thêm mới phân quyền/i);
    await modulePage.expectFieldLabels(['Mã phân quyền', 'Tên phân quyền']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-ROLES-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('roles/new', /Thêm mới phân quyền/i);

    const inputField = page
      .getByLabel(/Mã phân quyền/i)
      .or(page.locator('input[placeholder*="Mã phân quyền"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/roles/);
  });
});
