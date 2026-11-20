import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Quản lý hàng hóa & sản phẩm
 * Route: /products
 * Module: modules/product
 */
test.describe('TMS Feature Testing: Quản lý hàng hóa & sản phẩm (products)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-PRODUCTS-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('products');
    await modulePage.expectHeader(/Danh sách sản phẩm/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-PRODUCTS-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('products');
    await modulePage.testSearchInput('Sản phẩm');
    await modulePage.testStatusTabs();
  });

  test('UAT-PRODUCTS-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('products/new', /Thêm sản phẩm/i);
    await modulePage.expectFieldLabels(['Mã sản phẩm', 'Tên sản phẩm']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-PRODUCTS-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('products/new', /Thêm sản phẩm/i);

    const inputField = page
      .getByLabel(/Mã sản phẩm/i)
      .or(page.locator('input[placeholder*="Mã sản phẩm"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/products/);
  });
});
