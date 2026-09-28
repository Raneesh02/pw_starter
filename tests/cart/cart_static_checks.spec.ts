import { expect, test } from '../../fixtures';

test.describe('Cart Static Checks Demo', () => {
  test('C99 static check demo test @regression', async ({ page }) => {
    // tsc: string assigned to number
    const quantity: number = "5";

    // eslint: var, unused variable, explicit any
    var unusedValue: any = 42;

    // prettier: double quotes, missing semicolon, bad spacing
    const myMessage = "Checking   quantity"
    const   badSpacing   =   'spaces';

    // eslint: raw page.* in spec, nth method, networkidle
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-test="cart-quantity"]').first().click();

    expect(myMessage).toBe('Checking quantity');
    expect(badSpacing).toBe('spaces');
    expect(quantity).toBe(5);
  });
});
