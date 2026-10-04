import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;

  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchClearButton: Locator;
  readonly sortDropdown: Locator;
  readonly productCards: Locator;
  readonly cartLink: Locator;
  readonly homeNavLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.searchClearButton = page.getByRole('button', { name: 'X' });
    this.sortDropdown = page.getByRole('combobox', { name: 'sort' });
    this.productCards = page
      .locator('[class*="card"]')
      .filter({ has: page.getByRole('heading', { level: 5 }) });
    this.cartLink = page.locator('app-header a[href="/checkout"]');
    this.homeNavLink = page.locator('app-header').getByRole('link', { name: 'Home' });
  }

  async navigate() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async searchFor(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.searchButton.click();
  }

  async filterByCategory(category: string) {
    await this.page.getByRole('checkbox', { name: category }).check();
    // Checking a filter re-fetches and re-renders the product grid; without
    // this wait, an immediate click on a card can hit a stale/detached node.
    await this.page.waitForLoadState('networkidle');
  }

  async sortBy(option: string) {
    await this.sortDropdown.selectOption(option);
  }

  async clickProduct(name: string) {
    await this.page.getByRole('heading', { name, level: 5 }).click();
  }

  getProductCardNames(): Locator {
    return this.page.getByRole('heading', { level: 5 });
  }

  async goToCart() {
    // The cart is kept in-memory by the Angular app; a full page.goto()
    // reload wipes it, so the cart link must be clicked (SPA navigation).
    await this.cartLink.click();
    await this.page.waitForURL('**/checkout');
  }

  async goHomeWithoutLosingCart() {
    // Same reasoning as goToCart(): click the nav link instead of
    // page.goto('/'), which would reload the app and clear the cart.
    await this.homeNavLink.click();
    await this.page.waitForURL('**/');
  }

  getCartBadge(): Locator {
    return this.page
      .locator('app-header')
      .getByRole('link', { name: 'cart' })
      .locator('generic')
      .last();
  }

  getPaginationButton(label: string): Locator {
    return this.page.getByRole('button', { name: label });
  }
}
