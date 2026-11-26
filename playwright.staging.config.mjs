import { defineConfig } from '@playwright/test';
if (
  !process.env.STAGING_PUBLISHABLE_KEY ||
  !process.env.STAGING_SYNTHETIC_CREDENTIALS
)
  throw Error('Staging synthetic environment required');
export default defineConfig({
  outputDir: 'test-results-staging',
  testDir: './e2e/staging',
  workers: 1,
  timeout: 180000,
  expect: { timeout: 20000 },
  use: {
    baseURL: 'http://127.0.0.1:4180',
    channel: 'chrome',
    actionTimeout: 60000,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4180 --strictPort',
    url: 'http://127.0.0.1:4180',
    env: {
      VITE_SUPABASE_URL: 'https://eiqojioufllxcsedodnv.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.STAGING_PUBLISHABLE_KEY,
    },
  },
});
