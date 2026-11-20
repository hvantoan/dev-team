import { test, expect } from '@playwright/test';
import { loginToTMS, resolveAppPath } from '../../helpers/auth-helper';
import { appEnv } from '../../helpers/app-env';

test.describe('TMS Web Authentication', () => {
  test('should display login form fields correctly', async ({ page }) => {
    await page.goto(resolveAppPath('login'));

    const usernameInput = page.getByLabel('Tên đăng nhập').or(page.locator('input[type="text"]').first());
    const passwordInput = page.getByLabel('Mật khẩu').or(page.locator('input[type="password"]').first());
    const submitBtn = page.locator('button:has-text("Đăng nhập")');

    await expect(page).toHaveTitle(/TMS|Đăng nhập/i);
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('should fill credentials into login form', async ({ page }) => {
    await page.goto(resolveAppPath('login'));

    const usernameInput = page.getByLabel('Tên đăng nhập').or(page.locator('input[type="text"]').first());
    const passwordInput = page.getByLabel('Mật khẩu').or(page.locator('input[type="password"]').first());

    await usernameInput.fill(appEnv('APP_USERNAME'));
    await passwordInput.fill(appEnv('APP_PASSWORD'));

    await expect(usernameInput).toHaveValue(appEnv('APP_USERNAME'));
    await expect(passwordInput).toHaveValue(appEnv('APP_PASSWORD'));
  });
});
