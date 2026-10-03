import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  emailInput: Locator;
  passwordInput: Locator;
  submitButton: Locator;
  errorBanner: Locator;
  forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('xpath=//input[@type="password"]');
    this.submitButton = page.locator('form button').nth(0);
    this.errorBanner = page.locator('div.alert.alert-danger > div:nth-child(1)');
    this.forgotPasswordLink = page.locator('a[href="/auth/forgot-password"]');
  }

  async open() {
    await this.page.goto('https://practicesoftwaretesting.com/auth/login');
    await this.page.waitForTimeout(2000);
  }

  async login(email: string, password: string) {
    console.log(`Logging in with ${email} / ${password}`);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
    await expect(this.page).toHaveURL(/account/);
  }

  async getError(): Promise<any> {
    return this.errorBanner.textContent();
  }

  getMenuItem(label: string) {
    return this.page.locator(`xpath=//nav//a[contains(text(),'${label}')]`);
  }

  async isLoggedIn() {
    // @ts-ignore
    const name: string = await this.page.locator('[data-test="nav-menu"]').textContent();
    return name!.length > 0;
  }

  // async logout() {
  //   await this.page.locator('[data-test="nav-sign-out"]').click();
  // }
}
