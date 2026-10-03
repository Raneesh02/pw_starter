import { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { HomePage } from '../pages/home.page';
import { ProductPage } from '../pages/product.page';
import { USERS } from '../data/users';

export class AccountFacade {
  page: Page;
  loginPage: LoginPage;
  homePage: HomePage;
  productPage: ProductPage;

  constructor(page: Page) {
    this.page = page;
    this.loginPage = new LoginPage(page);
    this.homePage = new HomePage(page);
    this.productPage = new ProductPage(page);
  }

  async loginAsAdmin() {
    await this.loginPage.open();
    await this.loginPage.login(USERS.admin.email, USERS.admin.password);
  }

  async loginAndAddToCart(keyword: string) {
    await this.loginAsAdmin();
    await this.page.goto('/');
    await this.homePage.searchFor(keyword);
    await this.page.waitForLoadState('networkidle');
    await this.page.locator('[class="card skeleton"]').first().waitFor({ state: 'hidden' });
    await this.homePage.getProductCardNames().first().click();
    await this.productPage.addToCart();
    await this.page.goto('/cart');
  }

  async loginWithToken() {
    await this.page.setExtraHTTPHeaders({ Authorization: `Bearer ${USERS.admin.apiToken}` });
    await this.page.context().storageState({ path: 'admin-auth.json' });
  }
}
