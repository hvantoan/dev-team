import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Bồn cấp nhiên liệu
 * Route: /fuel-tanks
 * Module: modules/fuel-tank
 */
test.describe('TMS Feature Testing: Bồn cấp nhiên liệu (fuel-tanks)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-FUEL-TANKS-01: Kiểm tra giao diện danh sách và cấu trúc bảng dữ liệu', async ({ page }) => {
    await modulePage.goto('fuel-tanks');
    await modulePage.expectHeader(/Danh sách bồn nhiên liệu/i);
    await modulePage.expectDataTable();
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-FUEL-TANKS-02: Kiểm tra chức năng tìm kiếm và bộ lọc dữ liệu', async ({ page }) => {
    await modulePage.goto('fuel-tanks');
    await modulePage.testSearchInput('Bồn');
    await modulePage.testStatusTabs();
  });

  test('UAT-FUEL-TANKS-03: Kiểm tra form thêm mới và validation trường bắt buộc', async ({ page }) => {
    await modulePage.gotoCreateForm('fuel-tanks/new', /Thêm bồn nhiên liệu/i);
    await modulePage.expectFieldLabels(['Mã bồn nhiên liệu', 'Tên bồn nhiên liệu']);
    await modulePage.testRequiredValidation();
  });

  test('UAT-FUEL-TANKS-04: Kiểm tra nhập dữ liệu form và quay lại danh sách', async ({ page }) => {
    await modulePage.gotoCreateForm('fuel-tanks/new', /Thêm bồn nhiên liệu/i);

    const inputField = page
      .getByLabel(/Mã bồn nhiên liệu/i)
      .or(page.locator('input[placeholder*="Mã bồn nhiên liệu"]'))
      .first();

    if (await inputField.isVisible()) {
      await inputField.fill('TEST-AUTO-INPUT');
      expect(await inputField.inputValue()).toBe('TEST-AUTO-INPUT');
    }

    await modulePage.testBackToList(/fuel-tanks/);
  });
});
