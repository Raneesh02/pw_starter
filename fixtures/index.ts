import { test as base } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { ProductPage } from '../pages/product.page';
import { ShopFacade } from '../common_actions';

type TestFixtures = {
  homePage: HomePage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  productPage: ProductPage;
  shopFacade: ShopFacade;
};

export const test = base.extend<TestFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  shopFacade: async ({ page, homePage, checkoutPage, productPage }, use) => {
    await use(new ShopFacade(page, homePage, checkoutPage, productPage));
  },
});

export { expect } from '@playwright/test';
