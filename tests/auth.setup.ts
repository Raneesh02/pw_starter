import { test as setup } from '@playwright/test';
import { USERS } from '../data/users';

setup('save authenticated state', async ({ page }) => {
  await page.goto('/auth/login');
  await page.locator('[data-test="email"]').fill(USERS.customer.email);
  await page.locator('[data-test="password"]').fill(USERS.customer.password);
  await page.locator('[data-test="login-submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.context().storageState({ path: 'auth.json' });
});
