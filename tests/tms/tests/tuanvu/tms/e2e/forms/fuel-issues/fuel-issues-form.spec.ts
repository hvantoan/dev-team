import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Xuất cấp nhiên liệu
 * Route: /fuel-issues
 * Module: modules/fuel-issue
 */
test.describe('TMS Feature Testing: Xuất cấp nhiên liệu (fuel-issues)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-FUEL-ISSUES-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('fuel-issues');
    await modulePage.expectHeader(/Danh sách phiếu xuất nhiên liệu/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-FUEL-ISSUES-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('fuel-issues');
    await modulePage.testSearchInput('Xuất');
    await modulePage.testStatusTabs();
  });

  test('UAT-FUEL-ISSUES-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('fuel-issues/new', /Thêm phiếu xuất nhiên liệu/i);
    await modulePage.expectFieldLabels(['Mã phiếu']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-FUEL-ISSUES-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('fuel-issues/new', /Thêm phiếu xuất nhiên liệu/i);

    const inputField = page
      .getByLabel(/Mã phiếu/i)
      .or(page.locator('input[placeholder*="Mã phiếu"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/fuel-issues/);
  });
});
