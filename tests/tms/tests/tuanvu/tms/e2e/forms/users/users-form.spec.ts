import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Quản lý người dùng
 * Route: /users
 * Module: modules/user
 */
test.describe('TMS Feature Testing: Quản lý người dùng (users)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-USERS-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('users');
    await modulePage.expectHeader(/Danh sách người dùng/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-USERS-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('users');
    await modulePage.testSearchInput('User');
    await modulePage.testStatusTabs();
  });

  test('UAT-USERS-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('users/new', /Thêm người dùng/i);
    await modulePage.expectFieldLabels(['Tên đăng nhập', 'Tên người dùng']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-USERS-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('users/new', /Thêm người dùng/i);

    const inputField = page
      .getByLabel(/Tên đăng nhập/i)
      .or(page.locator('input[placeholder*="Tên đăng nhập"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/users/);
  });
});
