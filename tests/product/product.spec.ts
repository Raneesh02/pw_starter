import { expect, test } from '../../fixtures';
import { PRODUCTS } from '../../data/products';

test.describe('Product', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  test('P01 search existing product returns results @regression', async ({ homePage }) => {
    await homePage.searchFor(PRODUCTS.search.validKeyword);
    const names = homePage.getProductCardNames();
    await expect(names.first()).toBeVisible();
    expect(await names.count()).toBeGreaterThan(0);
  });

  test('P02 search non-existing product shows empty state @regression', async ({
    homePage,
    page,
  }) => {
    await homePage.searchFor(PRODUCTS.search.invalidKeyword);
    await expect(page.getByText(/no products found/i)).toBeVisible();
  });

  test('P03 filter by Hand Tools shows results @regression', async ({ homePage }) => {
    await homePage.filterByCategory(PRODUCTS.categories.handTools);
    await expect(homePage.productCards.first()).toBeVisible();
  });

  test('P04 filter by Power Tools shows results @regression', async ({ homePage }) => {
    await homePage.filterByCategory(PRODUCTS.categories.powerTools);
    await expect(homePage.productCards.first()).toBeVisible();
  });

  test('P05 sort by price low to high @regression', async ({ homePage }) => {
    await homePage.sortBy(PRODUCTS.sort.priceAsc);
    await expect(homePage.productCards.first()).toBeVisible();
  });

  test('P06 sort by name A to Z @regression', async ({ homePage }) => {
    await homePage.sortBy(PRODUCTS.sort.nameAsc);
    await expect(homePage.productCards.first()).toBeVisible();
  });

  test('P07 click product navigates to detail page @regression', async ({ homePage, page }) => {
    await homePage.getProductCardNames().first().click();
    await expect(page).toHaveURL(/\/product\//);
  });

  test('P08 increase quantity via stepper adds correct amount to cart @regression', async ({
    homePage,
    productPage,
    cartPage,
    page,
  }) => {
    await homePage.searchFor(PRODUCTS.search.validKeyword);
    await page.locator('[class="card skeleton"]').first().waitFor({ state: 'hidden' });
    await homePage.getProductCardNames().first().click();
    const itemName = ((await productPage.productName.textContent()) ?? '').trim();

    await productPage.increaseQtyButton.click();
    await productPage.increaseQtyButton.click();
    await expect(productPage.quantityInput).toHaveValue('3');

    await productPage.addToCartButton.click();
    await page.goto('/cart');
    await expect(cartPage.getItemQuantityInput(itemName)).toHaveValue('3');
  });
});
