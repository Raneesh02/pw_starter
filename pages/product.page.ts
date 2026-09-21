import { Page, Locator } from '@playwright/test';

export class ProductPage {
  readonly page: Page;

  readonly productName: Locator;
  readonly productPrice: Locator;
  readonly productCategory: Locator;
  readonly productBrand: Locator;
  readonly quantityInput: Locator;
  readonly decreaseQtyButton: Locator;
  readonly increaseQtyButton: Locator;
  readonly addToCartButton: Locator;
  readonly addToFavouritesButton: Locator;
  readonly compareButton: Locator;
  readonly relatedProducts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productName = page.getByRole('heading', { level: 1 });
    this.productPrice = page.locator('[data-test="unit-price"]');
    this.productCategory = page.locator('[data-test="category"]');
    this.productBrand = page.locator('[data-test="brand"]');
    this.quantityInput = page.getByRole('spinbutton', { name: 'Quantity' });
    this.decreaseQtyButton = page.getByRole('button', { name: 'Decrease quantity' });
    this.increaseQtyButton = page.getByRole('button', { name: 'Increase quantity' });
    this.addToCartButton = page.locator('[data-test="add-to-cart"]');
    this.addToFavouritesButton = page.getByRole('button', { name: 'Add to favourites' });
    this.compareButton = page.getByRole('button', { name: 'Compare' });
    this.relatedProducts = page.getByRole('heading', { level: 2, name: 'Related products' })
      .locator('..')
      .getByRole('heading', { level: 5 });
  }

  async addToCart(qty = 1) {
    if (qty > 1) {
      await this.quantityInput.fill(String(qty));
    }
    await this.addToCartButton.click();
  }

  async setQuantity(qty: number) {
    await this.quantityInput.fill(String(qty));
  }
}
