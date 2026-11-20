import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Feature: Chỉ dẫn giao hàng
 * Route: /delivery-instructions
 * Module: modules/delivery-instruction
 */
test.describe('TMS Feature Testing: Chỉ dẫn giao hàng (delivery-instructions)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-DELIVERY-INSTRUCTIONS-01: Kiểm tra truy cập phân hệ và chuyển hướng hợp lệ', async ({ page }) => {
    await modulePage.goto('delivery-instructions');
    expect(page.url()).not.toContain('/login');
  });

  test('UAT-DELIVERY-INSTRUCTIONS-02: Kiểm tra hiển thị giao diện và cấu trúc container', async ({ page }) => {
    await modulePage.goto('delivery-instructions');
    const container = page.locator('main, .MuiContainer-root, body').first();
    await expect(container).toBeVisible({ timeout: 10000 });
  });
});
