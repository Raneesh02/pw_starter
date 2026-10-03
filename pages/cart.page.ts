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
    this.cartRows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
    this.cartTotal = page.getByRole('cell', { name: 'Total' }).locator('..').getByRole('cell').last();
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
    return this.page.getByRole('row', { name: new RegExp(itemName) }).locator('img[src*="trash"], img[alt*="delete"], td:last-child img').last();
  }

  async updateQuantity(itemName: string, qty: number) {
    await this.getItemQuantityInput(itemName).fill(String(qty));
  }

  async proceedToCheckout() {
    await this.proceedToCheckoutButton.click();
  }
}
