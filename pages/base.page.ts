import { Page } from '@playwright/test';

export class BasePage {
  constructor(readonly page: Page) {}

  async navigate(path = '/') {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }
}
