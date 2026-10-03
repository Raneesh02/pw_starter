import { Page, Locator } from '@playwright/test';

export class AccountPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.userMenu = page.locator('[data-test="nav-menu"]');
  }
}
