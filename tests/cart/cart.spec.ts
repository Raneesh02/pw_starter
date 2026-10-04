import { expect, test } from '../../fixtures';
import { PRODUCTS, QUANTITY_CASES } from '../../data/products';

test.describe('Cart', () => {
  let itemName = '';

  test.beforeEach(async ({ shopFacade }) => {
    itemName = await shopFacade.addToCartAndGoToCart(PRODUCTS.search.validKeyword);
  });

  test('C01 add single product appears in cart @regression', async ({ cartPage }) => {
    await expect(cartPage.cartRows).toHaveCount(1);
  });

  test('C02 add multiple products shows multiple rows @regression', async ({
    homePage,
    cartPage,
    page,
  }) => {
    await homePage.goHomeWithoutLosingCart();
    await homePage.filterByCategory(PRODUCTS.categories.powerTools);
    await homePage.getProductCardNames().first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.locator('[data-test="add-to-cart"]').click();
    await expect(page.getByText(/product added to shopping cart/i)).toBeVisible();
    await homePage.goToCart();
    await expect(cartPage.cartRows).toHaveCount(2);
  });

  test('C03 increase item quantity @regression', async ({ cartPage }) => {
    const input = cartPage.getItemQuantityInput(itemName);
    await input.fill('3');
    await input.press('Tab');
    await expect(input).toHaveValue('3');
  });

  for (const { id, qty } of QUANTITY_CASES) {
    test(`${id} set item quantity to ${qty} @regression`, async ({ cartPage }) => {
      const input = cartPage.getItemQuantityInput(itemName);
      await input.fill(String(qty));
      await input.press('Tab');
      await expect(input).toHaveValue(String(qty));
    });
  }

  test('C05 remove item reduces cart count @regression', async ({ cartPage }) => {
    await cartPage.getItemRemoveButton(itemName).click();
    await expect(cartPage.cartRows).toHaveCount(0);
  });

  test('C06 remove all items shows empty cart state @regression', async ({ cartPage, page }) => {
    await cartPage.getItemRemoveButton(itemName).click();
    await expect(page.getByText(/cart is empty/i)).toBeVisible();
  });

  test('C07 cart total updates after quantity change @regression', async ({ cartPage }) => {
    const before = await cartPage.cartTotal.textContent();
    const input = cartPage.getItemQuantityInput(itemName);
    await input.fill('5');
    await input.press('Tab');
    await expect(
      cartPage.cartTotal,
      'cart total should update after quantity change',
    ).not.toHaveText(before || '', { timeout: 5000 });
  });

  const increaseQuantities = Array.from({ length: 10 }, (_, i) => i + 1);

  for (const qty of increaseQuantities) {
    const id = `C08-${String(qty).padStart(2, '0')}`;

    test(`${id} increase item quantity to ${qty} @regression`, async ({ cartPage }) => {
      const input = cartPage.getItemQuantityInput(itemName);
      await input.fill(String(qty));
      await input.press('Tab');
      await expect(input).toHaveValue(String(qty));
    });
  }
});
