import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const TESTS_ROOT = path.resolve(__dirname, 'tests');
const ROOT_ENV = path.resolve(__dirname, '.env');

function loadEnvFile(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) return {};
  return dotenv.parse(fs.readFileSync(envPath));
}

function discoverApps(): { name: string; dir: string; env: Record<string, string> }[] {
  const apps: { name: string; dir: string; env: Record<string, string> }[] = [];
  for (const company of fs.readdirSync(TESTS_ROOT, { withFileTypes: true })) {
    if (!company.isDirectory()) continue;
    const companyDir = path.join(TESTS_ROOT, company.name);
    for (const app of fs.readdirSync(companyDir, { withFileTypes: true })) {
      if (!app.isDirectory()) continue;
      const appDir = path.join(companyDir, app.name);
      if (!fs.existsSync(path.join(appDir, 'e2e'))) continue;
      const env = { ...loadEnvFile(ROOT_ENV), ...loadEnvFile(path.join(appDir, '.env')) };
      apps.push({ name: `${company.name}/${app.name}`, dir: appDir, env });
    }
  }
  return apps;
}

const apps = discoverApps();
if (apps.length === 0) {
  throw new Error(`No test apps found under ${TESTS_ROOT}/<company>/<app>/`);
}

const isHeadless = apps.every((a) => (a.env.HEADLESS ?? 'true') !== 'false');

export default defineConfig({
  timeout: 45 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    headless: isHeadless,
    actionTimeout: 15 * 1000,
    navigationTimeout: 35 * 1000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: apps.map((app) => ({
    name: app.name,
    testDir: app.dir,
    use: {
      ...devices['Desktop Chrome'],
      baseURL: app.env.APP_URL,
    },
  })),
  outputDir: 'test-results/artifacts',
});
