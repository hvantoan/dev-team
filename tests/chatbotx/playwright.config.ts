import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const ENV_FILE = path.resolve(__dirname, '.env');
if (fs.existsSync(ENV_FILE)) {
  dotenv.config({ path: ENV_FILE });
}

const APP_URL = process.env.APP_URL ?? 'http://localhost:3123';

export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'test-results/html-report', open: 'never' }]],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: APP_URL,
    headless: (process.env.HEADLESS ?? 'true') !== 'false',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: undefined },
    },
  ],
});
