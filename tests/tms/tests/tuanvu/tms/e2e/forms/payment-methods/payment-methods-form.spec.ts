import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Modal Dialog Feature: Phương thức thanh toán
 * Route: /payment-methods
 * Module: modules/payment-method
 */
test.describe('TMS Feature Testing: Phương thức thanh toán (payment-methods)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-PAYMENT-METHODS-01: Kiểm tra giao diện phân hệ và nút thêm mới', async ({ page }) => {
    await modulePage.goto('payment-methods');
    await modulePage.expectHeader(/Phương thức thanh toán/i);
    await modulePage.expectAddButton(/Thêm|Tạo/i);
  });

  test('UAT-PAYMENT-METHODS-02: Kiểm tra mở Dialog modal tạo mới và đóng modal', async ({ page }) => {
    await modulePage.goto('payment-methods');
    const addButton = await modulePage.expectAddButton(/Thêm|Tạo/i);
    await addButton.click();

    // Kiểm tra modal dialog hiển thị
    const dialog = page.locator('[role="dialog"], .MuiDialog-root').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Đóng dialog bằng nút Hủy hoặc nút Close
    const closeBtn = dialog.locator('button:visible').filter({ hasText: /Hủy|Đóng/i }).or(dialog.locator('button[aria-label*="close"]')).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(dialog).toBeHidden({ timeout: 6000 });
    }
  });

  test('UAT-PAYMENT-METHODS-03: Kiểm tra hiển thị danh sách cấu hình hiện tại', async ({ page }) => {
    await modulePage.goto('payment-methods');
    const cards = page.locator('.MuiCard-root, table, [role="region"]').first();
    await expect(cards).toBeVisible({ timeout: 10000 });
  });
});
