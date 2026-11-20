import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Quản lý phiếu chi
 * Route: /payment-vouchers
 * Module: modules/payment-voucher
 */
test.describe('TMS Feature Testing: Quản lý phiếu chi (payment-voucher)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-PAYMENT-VOUCHER-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('payment-vouchers');
    await modulePage.expectHeader(/Danh sách phiếu chi/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-PAYMENT-VOUCHER-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('payment-vouchers');
    await modulePage.testSearchInput('Chi');
    await modulePage.testStatusTabs();
  });

  test('UAT-PAYMENT-VOUCHER-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('payment-vouchers/new', /Thêm phiếu chi/i);
    await modulePage.expectFieldLabels(['Mã phiếu chi']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-PAYMENT-VOUCHER-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('payment-vouchers/new', /Thêm phiếu chi/i);

    const inputField = page
      .getByLabel(/Mã phiếu chi/i)
      .or(page.locator('input[placeholder*="Mã phiếu chi"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/payment-vouchers/);
  });
});
