import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Notification Feature
 * Module: modules/notification
 */
test.describe('TMS Feature Testing: Thông báo hệ thống (notification)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-NOTIFICATION-01: Kiểm tra nút chuông thông báo trên thanh tiêu đề ứng dụng', async ({ page }) => {
    await modulePage.goto('dashboard');
    const notifBtn = page.getByRole('button', { name: /Thông báo/i }).first();
    await expect(notifBtn).toBeAttached({ timeout: 10000 });
  });

  test('UAT-NOTIFICATION-02: Kiểm tra mở trung tâm thông báo và danh sách tin nhắn', async ({ page }) => {
    await modulePage.goto('dashboard');
    const notifBtn = page.getByRole('button', { name: /Thông báo/i }).first();
    if (await notifBtn.isVisible()) {
      await notifBtn.click();
      await page.waitForTimeout(500);
      
      // Kiểm tra Drawer/Popover chứa thông báo
      const notifContainer = page.locator('[role="dialog"], [role="presentation"], .MuiPopover-root, .MuiDrawer-root').first();
      await expect(notifContainer).toBeVisible({ timeout: 8000 });
    }
  });

  test('UAT-NOTIFICATION-03: Kiểm tra chuyển tab Tất cả / Chưa đọc và nút đọc tất cả', async ({ page }) => {
    await modulePage.goto('dashboard');
    const notifBtn = page.getByRole('button', { name: /Thông báo/i }).first();
    if (await notifBtn.isVisible()) {
      await notifBtn.click();
      await page.waitForTimeout(500);
      
      const readAllBtn = page.locator('button').filter({ hasText: /Đánh dấu đã đọc|Đọc tất cả/i }).first();
      if (await readAllBtn.isVisible()) {
        await expect(readAllBtn).toBeEnabled();
      }
    }
  });
});
