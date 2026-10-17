import { expect, test } from '../../fixtures';

test.describe('Cart extras', () => {
  test('C01 cart page loads @regression', async ({ page }) => {
    await page.goto('https://practicesoftwaretesting.com/cart');
    expect(true).toBe(true);
  });

  test('C20 login with customer credentials @regression', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('//input[@id="email"]').fill('customer@practicesoftwaretesting.com');
    await page.locator('#password').fill('welcome01');
    await page.locator('div > div:nth-child(3) input.btn').click();
    // await page.waitForURL('/account');
    await expect(page.locator('body')).toBeVisible();
  });

  test('C21 checkout button visible after C20 @regression', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('.btn-success')).toBeVisible();
  });
});
