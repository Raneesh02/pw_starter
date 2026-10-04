import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;

  readonly cartTable: Locator;
  readonly cartRows: Locator;
  readonly cartTotal: Locator;
  readonly continueShoppingButton: Locator;
  readonly proceedToCheckoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartTable = page.getByRole('table');
    // Scoped to rows that contain a product line, since the cart table also
    // renders a totals row that would otherwise be counted as a cart item.
    this.cartRows = page
      .getByRole('row')
      .filter({ has: page.locator('[data-test="product-title"]') });
    this.cartTotal = page.locator('[data-test="cart-total"]');
    this.continueShoppingButton = page.getByRole('button', { name: 'Continue Shopping' });
    this.proceedToCheckoutButton = page.locator('[data-test="proceed-1"]');
  }

  async navigate() {
    await this.page.goto('/checkout');
  }

  getItemQuantityInput(itemName: string): Locator {
    return this.page.getByRole('spinbutton', { name: `Quantity for ${itemName}` });
  }

  getItemRemoveButton(itemName: string): Locator {
    return this.page.getByRole('row', { name: new RegExp(itemName) }).locator('a.btn-danger');
  }

  async updateQuantity(itemName: string, qty: number) {
    await this.getItemQuantityInput(itemName).fill(String(qty));
  }

  async proceedToCheckout() {
    await this.proceedToCheckoutButton.click();
  }
}
