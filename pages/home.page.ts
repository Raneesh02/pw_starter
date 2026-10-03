import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;

  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchClearButton: Locator;
  readonly sortDropdown: Locator;
  readonly productCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.searchClearButton = page.getByRole('button', { name: 'X' });
    this.sortDropdown = page.getByRole('combobox', { name: 'sort' });
    this.productCards = page.locator('[class*="card"]').filter({ has: page.getByRole('heading', { level: 5 }) });
  }

  async navigate() {
    await this.page.goto('/');
  }

  async searchFor(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.searchButton.click();
  }

  async filterByCategory(category: string) {
    await this.page.getByRole('checkbox', { name: category }).check();
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

  getCartBadge(): Locator {
    return this.page.locator('app-header').getByRole('link', { name: 'cart' }).locator('generic').last();
  }

  getPaginationButton(label: string): Locator {
    return this.page.getByRole('button', { name: label });
  }
}
