/**
 * Playwright Configuration
 * 
 * This configuration follows ALL Playwright best practices:
 * 
 * 1. TRACE ON FIRST RETRY: Captures detailed trace only when a test fails
 *    and is being retried. This saves resources while providing debugging info.
 *    
 * 2. SCREENSHOTS ON FAILURE: Captures screenshot when test fails to help
 *    identify visual issues.
 *    
 * 3. VIDEO ON FIRST RETRY: Records video only when retrying failed tests.
 *    Useful for debugging but not for every test run.
 *    
 * 4. PROPER TIMEOUTS: Balanced between fast feedback and stability.
 *    
 * 5. CROSS-BROWSER TESTING: Runs on Chromium, Firefox, and WebKit.
 *    
 * 6. CI OPTIMIZATIONS: Different settings for CI vs local development.
 *
 * @see https://playwright.dev/docs/test-configuration
 * @see https://playwright.dev/docs/best-practices
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Detect if running in CI environment
 * GitHub Actions sets CI=true automatically
 */
const isCI = !!process.env.CI;

export default defineConfig({
  // ===========================================================================
  // TEST DIRECTORY AND FILE PATTERNS
  // ===========================================================================
  
  /**
   * Directory containing test files
   */
  testDir: './e2e',

  /**
   * Pattern to match test files
   * Using .spec.ts extension is conventional for Playwright
   */
  testMatch: '**/*.spec.ts',

  // ===========================================================================
  // PARALLELIZATION SETTINGS
  // ===========================================================================

  /**
   * Run tests in files in parallel
   * Each test file runs in its own worker for isolation
   */
  fullyParallel: true,

  /**
   * Fail the build on CI if test.only() is left in source code
   * This prevents accidentally skipping tests in CI
   */
  forbidOnly: isCI,

  // ===========================================================================
  // RETRY CONFIGURATION
  // ===========================================================================

  /**
   * Retry failed tests
   * - CI: Retry twice to handle flaky infrastructure
   * - Local: No retries for faster feedback during development
   * 
   * WHY 2 retries in CI:
   * - First retry captures trace for debugging
   * - Second retry confirms if it's truly flaky
   */
  retries: isCI ? 2 : 0,

  // ===========================================================================
  // WORKER CONFIGURATION
  // ===========================================================================

  /**
   * Number of parallel workers
   * - CI: Use 1 worker for consistent, reproducible builds
   * - Local: Use default (based on CPU cores) for speed
   * 
   * WHY 1 worker in CI:
   * - More predictable resource usage
   * - Easier to debug failures
   * - GitHub Actions runners have limited parallelism
   */
  workers: isCI ? 1 : undefined,

  // ===========================================================================
  // REPORTER CONFIGURATION
  // ===========================================================================

  /**
   * Reporter configuration
   * - HTML: Creates interactive report viewable in browser
   * - List: Shows test progress in console (good for CI)
   * - GitHub: Annotates PRs with test results (CI only)
   */
  reporter: isCI
    ? [
        ['list'],
        ['html', { open: 'never' }],
        ['github'],
      ]
    : [
        ['html', { open: 'never' }],
      ],

  // ===========================================================================
  // GLOBAL SETTINGS (applied to all projects)
  // ===========================================================================

  use: {
    /**
     * Base URL for navigation
     * All page.goto('/path') calls are relative to this
     */
    baseURL: 'http://localhost:5173',

    // =========================================================================
    // TRACE CONFIGURATION
    // =========================================================================

    /**
     * Collect trace on first retry of failed test
     * 
     * WHY 'on-first-retry':
     * - Traces are expensive to collect and store
     * - Only need them for debugging failures
     * - First retry is when we need the most info
     * 
     * Trace includes:
     * - Timeline of actions
     * - DOM snapshots
     * - Network requests
     * - Console logs
     */
    trace: 'on-first-retry',

    // =========================================================================
    // SCREENSHOT CONFIGURATION
    // =========================================================================

    /**
     * Capture screenshot only when test fails
     * 
     * WHY 'only-on-failure':
     * - Saves storage space
     * - Faster test execution
     * - Still provides debugging info when needed
     */
    screenshot: 'only-on-failure',

    // =========================================================================
    // VIDEO CONFIGURATION
    // =========================================================================

    /**
     * Record video on first retry of failed test
     * 
     * WHY 'on-first-retry':
     * - Videos are large files
     * - Only useful for debugging failures
     * - Provides visual record of what went wrong
     */
    video: 'on-first-retry',

    // =========================================================================
    // TIMEOUT CONFIGURATION
    // =========================================================================

    /**
     * Timeout for each action (click, fill, etc.)
     * Default is 30s, but we reduce it for faster failure detection
     */
    actionTimeout: 10_000,

    /**
     * Timeout for navigation
     */
    navigationTimeout: 30_000,
  },

  // ===========================================================================
  // EXPECT CONFIGURATION
  // ===========================================================================

  expect: {
    /**
     * Timeout for expect() assertions
     * 
     * WHY 5 seconds:
     * - Enough time for animations to complete
     * - Enough for network responses
     * - But fast enough to catch actual failures
     */
    timeout: 5_000,
  },

  // ===========================================================================
  // GLOBAL TIMEOUT
  // ===========================================================================

  /**
   * Maximum time for the entire test (including hooks)
   * 
   * WHY 30 seconds:
   * - Most tests should complete in under 10s
   * - Extra buffer for slow CI environments
   * - Prevents tests from hanging indefinitely
   */
  timeout: 30_000,

  // ===========================================================================
  // PROJECT CONFIGURATION (Multi-browser testing)
  // ===========================================================================

  /**
   * Configure projects for cross-browser testing
   * 
   * WHY test on multiple browsers:
   * - Ensures app works for all users
   * - Catches browser-specific bugs early
   * - Part of Playwright best practices
   */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  // ===========================================================================
  // WEB SERVER CONFIGURATION
  // ===========================================================================

  /**
   * Start the dev server before running tests
   * 
   * WHY configure webServer:
   * - Ensures app is running before tests start
   * - Automatically starts/stops server
   * - Reuses existing server when running locally
   */
  webServer: {
    /**
     * Command to start the development server
     */
    command: 'yarn dev',

    /**
     * Port the server runs on
     */
    port: 5173,

    /**
     * Reuse existing server if already running
     * 
     * WHY true locally:
     * - Faster test starts during development
     * - Can run tests against manually started server
     * 
     * WHY false in CI:
     * - Ensures clean server state
     * - No stale server from previous runs
     */
    reuseExistingServer: !isCI,

    /**
     * Timeout for server to start
     */
    timeout: 120_000,
  },
});
