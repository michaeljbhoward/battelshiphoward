// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright config for the Battleship game.
 * Boots the no-cache Python dev server, then runs UI tests across browsers.
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'python3 serve.py',
    port: 8000,
    reuseExistingServer: true,
    timeout: 30_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // NOTE: webkit is unavailable on this macOS version (mac12). Add it back
    // on a newer OS for Safari-engine coverage:
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
