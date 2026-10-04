import { defineConfig } from '@playwright/test';

// Separate from the root config: this runs the grader self-tests and the live skill eval,
// neither of which opens a browser.
export default defineConfig({
  testDir: '.',
  testMatch: ['grader.spec.ts', 'judge.spec.ts', 'agent.eval.ts', 'calibration.eval.ts'],
  fullyParallel: true,
  retries: 0,
  // A live trial is a full agent session; the self-tests finish in milliseconds.
  timeout: 10 * 60_000,
  reporter: [['list'], ['./eval-reporter.ts']],
});
