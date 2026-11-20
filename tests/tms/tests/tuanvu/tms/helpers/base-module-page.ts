import { Page, Locator, expect } from '@playwright/test';
import { resolveAppPath } from './auth-helper';

/**
 * Base Page Object helper for TMS Modules
 * Provides reusable test interactions for Material UI / React Table interfaces
 */
export class BaseModulePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a module's main page with resilient network retry
   */
  async goto(route: string, maxRetries = 2) {
    const targetUrl = resolveAppPath(route);
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        break;
      } catch (err: any) {
        if (attempt === maxRetries || !err?.message?.includes('ERR_NETWORK_CHANGED')) {
          throw err;
        }
        await this.page.waitForTimeout(500);
      }
    }
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 10000 });
  }

  /**
   * Assert page header title is visible and matches expected text
   */
  async expectHeader(title: string | RegExp) {
    const heading = this.page.locator('h4, div.flex, header').filter({ hasText: title }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  }

  /**
   * Assert main data table or data container is visible
   */
  async expectDataTable() {
    const tableOrCard = this.page.locator('table, .MuiTable-root, [role="table"], .MuiCard-root, [role="region"]').first();
    await expect(tableOrCard).toBeVisible({ timeout: 10000 });
  }

  /**
   * Assert Add / Create button is visible (handles text buttons and icon-only Link buttons with /new)
   */
  async expectAddButton(labelPattern: RegExp = /Thêm|Tạo/i): Promise<Locator> {
    const addButton = this.page
      .locator('a, button')
      .filter({ hasText: labelPattern })
      .or(this.page.locator('a[href$="/new"], a[href*="/new"]'))
      .first();

    await expect(addButton).toBeVisible({ timeout: 10000 });
    return addButton;
  }

  /**
   * Test status tabs filtering (scoped strictly to visible tabs in main content)
   */
  async testStatusTabs() {
    const tabs = this.page.locator('main [role="tablist"] [role="tab"]:visible');
    const tabCount = await tabs.count();
    if (tabCount > 1) {
      const targetTab = tabs.nth(1);
      if (await targetTab.isVisible()) {
        await targetTab.click();
        await expect(targetTab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
      }
    }
  }

  /**
   * Test search field input interaction
   */
  async testSearchInput(keyword: string = 'Test') {
    const searchInput = this.page
      .getByRole('textbox', { name: /Tìm kiếm/i })
      .or(this.page.locator('input[placeholder*="Tìm"], input[placeholder*="Nhập"], input[type="search"]'))
      .first();

    if (await searchInput.isVisible()) {
      await searchInput.click();
      await searchInput.fill(keyword);
      await expect(searchInput).toHaveValue(keyword, { timeout: 5000 });
      await searchInput.clear();
    }
  }

  /**
   * Navigate to create form page and verify title with network retry
   */
  async gotoCreateForm(newRoute: string, expectedTitle: string | RegExp, maxRetries = 2) {
    const targetUrl = resolveAppPath(newRoute);
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        break;
      } catch (err: any) {
        if (attempt === maxRetries || !err?.message?.includes('ERR_NETWORK_CHANGED')) {
          throw err;
        }
        await this.page.waitForTimeout(500);
      }
    }
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 10000 });
    const titleLocator = this.page.locator('h4, div').filter({ hasText: expectedTitle }).first();
    await expect(titleLocator).toBeVisible({ timeout: 10000 });
  }

  /**
   * Assert specific form field labels are rendered
   */
  async expectFieldLabels(labels: string[]) {
    for (const label of labels) {
      const field = this.page
        .getByLabel(new RegExp(label, 'i'))
        .or(this.page.locator(`input[placeholder*="${label}"]`))
        .or(this.page.locator(`label:has-text("${label}")`))
        .first();
      await expect(field).toBeVisible({ timeout: 7000 });
    }
  }

  /**
   * Click save button and assert validation error appears on empty required fields
   */
  async testRequiredValidation(saveButtonPattern: RegExp = /^Lưu$|^Xác nhận$/i) {
    const saveButton = this.page.locator('button').filter({ hasText: saveButtonPattern }).first();
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();

    // Check validation error indicator
    const errorIndicator = this.page.locator('.Mui-error, [role="alert"], .MuiFormHelperText-root.Mui-error').first();
    await expect(errorIndicator).toBeVisible({ timeout: 6000 });
  }

  /**
   * Test clicking back/cancel button to return to the list
   */
  async testBackToList(targetUrlPattern: RegExp) {
    const backButton = this.page
      .locator('a, button')
      .filter({ has: this.page.locator('.i-solar-alt-arrow-left-linear, svg, [class*="arrow"]') })
      .or(this.page.locator('button').filter({ hasText: /^Hủy$|^Quay lại$/i }))
      .first();

    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(this.page).toHaveURL(targetUrlPattern, { timeout: 10000 });
    }
  }
}
