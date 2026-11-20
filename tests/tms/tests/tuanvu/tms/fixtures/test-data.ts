/**
 * Test fixtures & data generators for TMS form testing
 */
import { appEnv } from '../helpers/app-env';

export const testConfig = {
  appUrl: appEnv('APP_URL'),
  username: appEnv('APP_USERNAME'),
  password: appEnv('APP_PASSWORD'),
};

export function generateRandomString(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

export function generateRandomNumber(min = 1000, max = 999999): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
