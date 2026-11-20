import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Sổ quỹ thu chi
 * Route: /receipt-payments
 * Module: modules/receipt-payment
 */
test.describe('TMS Feature Testing: Sổ quỹ thu chi (receipt-payment)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-RECEIPT-PAYMENT-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('receipt-payments');
    await modulePage.expectHeader(/Danh sách phiếu thu/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-RECEIPT-PAYMENT-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('receipt-payments');
    await modulePage.testSearchInput('Thu');
    await modulePage.testStatusTabs();
  });

  test('UAT-RECEIPT-PAYMENT-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('receipt-payments/new', /Thêm phiếu thu/i);
    await modulePage.expectFieldLabels(['Mã phiếu thu']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-RECEIPT-PAYMENT-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('receipt-payments/new', /Thêm phiếu thu/i);

    const inputField = page
      .getByLabel(/Mã phiếu thu/i)
      .or(page.locator('input[placeholder*="Mã phiếu thu"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/receipt-payments/);
  });
});
