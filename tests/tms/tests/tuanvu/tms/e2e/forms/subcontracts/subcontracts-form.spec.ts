import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Hợp đồng thầu phụ
 * Route: /subcontracts
 * Module: modules/subcontracts
 */
test.describe('TMS Feature Testing: Hợp đồng thầu phụ (subcontracts)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-SUBCONTRACTS-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('subcontracts');
    await modulePage.expectHeader(/Danh sách Thuê vận chuyển/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-SUBCONTRACTS-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('subcontracts');
    await modulePage.testSearchInput('Thuê');
    await modulePage.testStatusTabs();
  });

  test('UAT-SUBCONTRACTS-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('subcontracts/new', /Thêm phiếu thuê vận chuyển/i);
    await modulePage.expectFieldLabels(['Mã thuê vận chuyển']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-SUBCONTRACTS-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('subcontracts/new', /Thêm phiếu thuê vận chuyển/i);

    const inputField = page
      .getByLabel(/Mã thuê vận chuyển/i)
      .or(page.locator('input[placeholder*="Mã thuê vận chuyển"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/subcontracts/);
  });
});
