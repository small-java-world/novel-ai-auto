/**
 * Playwright Configuration for E2E Tests
 * Chrome Extension testing with Manifest V3
 */
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Global test timeout
  timeout: 300000, // 5 minutes for complex E2E tests

  // Expect timeout for assertions
  expect: {
    timeout: 30000, // 30 seconds for assertions
  },

  // Parallel tests
  fullyParallel: false, // Chrome extension tests should run sequentially

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : 1, // Extension tests work better with single worker

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line'],
  ],

  // Output directory for test artifacts
  outputDir: 'test-results/artifacts',

  // Global setup and teardown
  globalSetup: path.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: path.resolve('./tests/e2e/global-teardown.ts'),

  // Test configuration
  use: {
    // Base URL for tests (NovelAI)
    baseURL: 'https://novelai.net',

    // Browser viewport
    viewport: { width: 1280, height: 720 },

    // Test artifacts
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-failure',

    // Browser context options
    ignoreHTTPSErrors: true,

    // Action timeout
    actionTimeout: 30000,

    // Navigation timeout
    navigationTimeout: 60000,
  },

  // Projects configuration for different browser setups
  projects: [
    {
      name: 'chrome-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome extension specific configuration
        channel: 'chrome',
        launchOptions: {
          args: [
            '--disable-extensions-except=' + path.resolve('./'),
            '--load-extension=' + path.resolve('./'),
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
          headless: false, // Extension tests require non-headless mode
        },
        contextOptions: {
          // Downloads directory
          acceptDownloads: true,
        },
      },
    },
  ],

  // Test match patterns
  testMatch: [
    '**/basic-flow.spec.ts',
    '**/error-handling.spec.ts',
    '**/performance.spec.ts',
    '**/integration.spec.ts',
  ],

  // Test ignore patterns
  testIgnore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
});
