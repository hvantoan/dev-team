import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Khách hàng & Đối tác
 * Route: /partners
 * Module: modules/partner
 */
test.describe('TMS Feature Testing: Khách hàng & Đối tác (partners)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-PARTNERS-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('partners');
    await modulePage.expectHeader(/Danh sách đối tác/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-PARTNERS-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('partners');
    await modulePage.testSearchInput('Đối tác');
    await modulePage.testStatusTabs();
  });

  test('UAT-PARTNERS-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('partners/new', /Thêm đối tác/i);
    await modulePage.expectFieldLabels(['Mã đối tác', 'Tên đối tác']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-PARTNERS-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('partners/new', /Thêm đối tác/i);

    const inputField = page
      .getByLabel(/Mã đối tác/i)
      .or(page.locator('input[placeholder*="Mã đối tác"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/partners/);
  });
});
