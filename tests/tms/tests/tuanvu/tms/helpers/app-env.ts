import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const APP_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_DIR, '../..');

function loadEnvFile(envPath: string): Record<string, string> {
  return fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};
}

const APP_ENV: Record<string, string> = {
  ...loadEnvFile(path.join(REPO_ROOT, '.env')),
  ...loadEnvFile(path.join(APP_DIR, '.env')),
};

export function appEnv(key: string, fallback?: string): string {
  const value = process.env[key] || APP_ENV[key] || fallback;
  if (!value) throw new Error(`Missing env ${key} — copy tests/tms/.env.example to tests/tms/.env`);
  return value;
}
