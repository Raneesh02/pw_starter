import { Page } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { CheckoutPage, AddressData, PaymentData } from '../pages/checkout.page';
import { ProductPage } from '../pages/product.page';

export class ShopFacade {
  constructor(
    private readonly page: Page,
    private readonly homePage: HomePage,
    private readonly checkoutPage: CheckoutPage,
    private readonly productPage: ProductPage,
  ) {}

  async addToCart(keyword: string): Promise<string> {
    await this.homePage.navigate();
    await this.homePage.searchFor(keyword);
    await this.page.waitForLoadState('networkidle');
    await this.page.locator('[class="card skeleton"]').first().waitFor({ state: 'hidden' });
    await this.homePage.getProductCardNames().first().click();
    const name = ((await this.page.getByRole('heading', { level: 1 }).textContent()) ?? '').trim();
    await this.productPage.addToCart();
    return name;
  }

  async addToCartAndGoToCart(keyword: string): Promise<string> {
    const name = await this.addToCart(keyword);
    await this.page.goto('/cart');
    return name;
  }

  async addToCartAndGoToCheckout(keyword: string): Promise<void> {
    await this.addToCart(keyword);
    await this.page.goto('/checkout');
  }

  async fullGuestCheckout(
    keyword: string,
    guest: { email: string; firstName: string; lastName: string },
    address: AddressData,
    payment: PaymentData,
  ): Promise<void> {
    await this.addToCartAndGoToCheckout(keyword);
    await this.checkoutPage.continueAsGuest(guest.email, guest.firstName, guest.lastName);
    await this.checkoutPage.fillAddress(address);
    await this.checkoutPage.fillPayment(payment);
  }
}
