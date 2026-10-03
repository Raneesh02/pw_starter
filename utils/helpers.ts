import { Page } from '@playwright/test';
import { USERS } from '../data/users';

export async function addProductToCart(page: Page, keyword: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Search' }).fill(keyword);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.waitForLoadState('networkidle');
  await page.locator('[class="card skeleton"]').first().waitFor({ state: 'hidden' });
  await page.getByRole('heading', { level: 5 }).first().click();
  await page.locator('[data-test="add-to-cart"]').click();
}

export async function loginViaUI(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.locator('[data-test="email"]').fill(USERS.customer.email);
  await page.locator('[data-test="password"]').fill(USERS.customer.password);
  await page.locator('[data-test="login-submit"]').click();
  await page.waitForLoadState('networkidle');
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.]/g, ''));
}
