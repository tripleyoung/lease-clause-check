import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5193', locale: 'ko-KR' },
  webServer: { command: 'npx vite --port 5193 --strictPort', url: 'http://localhost:5193', reuseExistingServer: true, timeout: 60_000 },
});
