import { Page, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { appEnv } from './app-env';

export interface LoginOptions {
  username?: string;
  password?: string;
  timeout?: number;
  forceLogin?: boolean;
}

const APP_NAME = path.basename(path.resolve(__dirname, '..'));
const AUTH_FILE = path.resolve(__dirname, '../../../test-results/.auth', `${APP_NAME}.json`);

/**
 * Helper to resolve paths against baseURL (which might include a pathname like /tms)
 */
export function resolveAppPath(subPath: string = ''): string {
  const base = appEnv('APP_URL');
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;
  return new URL(cleanSubPath, cleanBase).href;
}

/**
 * Helper to perform login on the TMS Web application with session caching
 */
export async function loginToTMS(page: Page, options: LoginOptions = {}) {
  // 1. Check if current context already has auth cookies
  const cookies = await page.context().cookies();
  if (!options.forceLogin && cookies.some(c => c.name === 'tms-auth-token')) {
    return;
  }

  // 2. Try restoring from cached storage state file
  if (!options.forceLogin && fs.existsSync(AUTH_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
      if (Array.isArray(cached.cookies) && cached.cookies.some((c: { name: string }) => c.name === 'tms-auth-token')) {
        await page.context().addCookies(cached.cookies);
        return;
      }
    } catch {
      // Ignore cache parse errors and proceed to UI login
    }
  }

  // 3. Fallback to interactive UI login
  const username = options.username || appEnv('APP_USERNAME');
  const password = options.password || appEnv('APP_PASSWORD');

  const loginUrl = resolveAppPath('login');
  await page.goto(loginUrl);

  const usernameInput = page.getByLabel('Tên đăng nhập').or(page.locator('input[type="text"]').first());
  const passwordInput = page.getByLabel('Mật khẩu').or(page.locator('input[type="password"]').first());
  const submitButton = page.locator('button:has-text("Đăng nhập")');

  await expect(usernameInput).toBeVisible({ timeout: 15000 });
  await usernameInput.fill(username);

  await expect(passwordInput).toBeVisible({ timeout: 5000 });
  await passwordInput.fill(password);

  await submitButton.click();

  try {
    await page.waitForFunction(
      () => !window.location.pathname.endsWith('/login'),
      { timeout: 20000 }
    );

    // Save session storage state for fast subsequent tests
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    await page.context().storageState({ path: AUTH_FILE });
  } catch (err) {
    const alertToast = page.locator('[role="alert"], [data-sonner-toast]').first();
    if (await alertToast.isVisible()) {
      const errorText = await alertToast.innerText();
      console.warn(`[TMS Login Warning] Đăng nhập không thành công: ${errorText}`);
    }
    throw err;
  }
}
