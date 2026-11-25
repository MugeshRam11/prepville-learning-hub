import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./e2e/practice',workers:1,timeout:180000,expect:{timeout:20000},
  use:{baseURL:'http://127.0.0.1:4178',channel:'chrome',headless:true},
  webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4178 --strictPort',url:'http://127.0.0.1:4178',
    env:{VITE_SUPABASE_URL:'http://127.0.0.1:4179',VITE_SUPABASE_PUBLISHABLE_KEY:'practice-test-only'}}
});
