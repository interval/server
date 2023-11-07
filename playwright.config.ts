import os from 'os'
import { PlaywrightTestConfig, devices } from '@playwright/test'
import env from './env'

const config: PlaywrightTestConfig = {
  globalSetup: require.resolve('./test/_setup.ts'),
  use: {
    headless: !process.env.HEADED,
    launchOptions: {
      // Delay each opration by this many ms
      slowMo: process.env.PLAYWRIGHT_SLOW_MO
        ? Number(process.env.PLAYWRIGHT_SLOW_MO)
        : undefined,
    },
    storageState: 'test/.session.json',
    baseURL: env.APP_URL,
    screenshot: 'only-on-failure',
    video: process.env.PLAYWRIGHT_RECORD ? 'retain-on-failure' : undefined,
    trace: process.env.PLAYWRIGHT_RECORD ? 'retain-on-failure' : undefined,
  },
  outputDir: 'test/results',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  testIgnore: '**/__test__/**', // Jest

  retries: process.env.CI ? 3 : undefined,
  workers: getWorkers(),

  // Individual test timeout
  timeout: process.env.CI ? 60_000 : undefined,
  expect: {
    // Timeout for each `expect` call
    timeout: process.env.CI ? 20_000 : undefined,
  },

  forbidOnly: !!process.env.CI,
}

export default config

/**
 * Reserve one core to run the web app when performing parallel tests.
 *
 * The default is NUM_CORES / 2, which is good on fast machines but can starve
 * the server on slower or throttled ones. We reduce that by one by default.
 *
 * This can be overridden using the `--workers` command line argument if
 * calling directly, or within `PLAYWRIGHT_ARGS` env var if using `test:all`.
 */
function getWorkers(): number {
  const workers = Math.floor(os.cpus().length / 2 - 1)

  if (workers < 1) return 1

  return workers
}
