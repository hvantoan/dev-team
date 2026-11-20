import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Quản lý đơn giao hàng
 * Route: /delivery-orders
 * Module: modules/delivery-orders
 */
test.describe('TMS Feature Testing: Quản lý đơn giao hàng (delivery-orders)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-DELIVERY-ORDERS-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('delivery-orders');
    await modulePage.expectHeader(/Danh sách Đơn vận chuyển/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-DELIVERY-ORDERS-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('delivery-orders');
    await modulePage.testSearchInput('Đơn');
    await modulePage.testStatusTabs();
  });

  test('UAT-DELIVERY-ORDERS-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('delivery-orders/new', /Thêm đơn vận chuyển/i);
    await modulePage.expectFieldLabels(['Mã đơn giao hàng']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-DELIVERY-ORDERS-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('delivery-orders/new', /Thêm đơn vận chuyển/i);

    const inputField = page
      .getByLabel(/Mã đơn giao hàng/i)
      .or(page.locator('input[placeholder*="Mã đơn giao hàng"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/delivery-orders/);
  });
});
