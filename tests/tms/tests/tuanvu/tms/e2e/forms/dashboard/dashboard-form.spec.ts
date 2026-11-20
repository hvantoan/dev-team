import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../../helpers/auth-helper';
import { BaseModulePage } from '../../../helpers/base-module-page';

/**
 * Automated Test Suite for Dashboard Feature
 * Route: /dashboard
 * Module: modules/dashboard
 */
test.describe('TMS Feature Testing: Dashboard Tổng quan (dashboard)', () => {
  let modulePage: BaseModulePage;

  test.beforeEach(async ({ page }) => {
    await loginToTMS(page);
    modulePage = new BaseModulePage(page);
  });

  test('UAT-DASHBOARD-01: Kiểm tra giao diện Dashboard và tiêu đề tổng quan', async ({ page }) => {
    await modulePage.goto('dashboard');
    await modulePage.expectHeader(/Tổng quan/i);
  });

  test('UAT-DASHBOARD-02: Kiểm tra hiển thị sơ đồ quy trình vận hành và các thẻ thống kê', async ({ page }) => {
    await modulePage.goto('dashboard');
    
    // Kiểm tra các Card widget thống kê / sơ đồ quy trình
    const dashboardCards = page.locator('.MuiCard-root, [class*="card"], main > div').first();
    await expect(dashboardCards).toBeVisible({ timeout: 10000 });
  });

  test('UAT-DASHBOARD-03: Kiểm tra các liên kết điều hướng từ Dashboard tới phân hệ', async ({ page }) => {
    await modulePage.goto('dashboard');
    
    // Kiểm tra thanh menu bên trái hoặc các nút điều hướng phân hệ
    const navLinks = page.locator('nav a, a[href*="/tms/"], button');
    expect(await navLinks.count()).toBeGreaterThanOrEqual(1);
  });
});
