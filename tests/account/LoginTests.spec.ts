import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { AccountFacade } from '../../common_actions/account.facade';
import { loginViaUI } from '../../utils/helpers';

let sharedPage: any;
let loggedIn = false;

test.describe.serial('login tests', () => {
  test('A01 Valid Login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login('customer@practicesoftwaretesting.com', 'welcome01');
    loggedIn = true;
    sharedPage = page;
  });

  test('A02 admin can see dashboard @regression', async ({ page }) => {
    const facade = new AccountFacade(page);
    await facade.loginAsAdmin();
    await page.waitForTimeout(3000);
    await expect(page.locator('xpath=//h1')).toHaveText('Sales over the years');
  });

  test.only('A02 invalid password shows error @regression', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await page.locator('#email').fill('customer@practicesoftwaretesting.com');
    await page.locator('#password').fill('wrong');
    await page.locator('form button').first().click();
    const err = await loginPage.getError();
    console.log(err);
    expect(err).toContain('Invalid email or password');
  });

  test('A03 menu has my account link @regression', async () => {
    if (!loggedIn) return;
    await expect(sharedPage.getByRole('link', { name: 'My account' })).toBeVisible();
  });

  test('A04 login via helper @regression', async ({ page }) => {
    await loginViaUI(page);
  });

  test('A05 user search in menu @regression', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const userInput = process.env.MENU_LABEL || "Contact') or ('1'='1";
    await loginPage.open();
    await loginPage.getMenuItem(userInput).click();
  });

  test('A06 order history count @regression', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/account/invoices');
    await expect(page.getByRole('row')).toHaveCount(11);
  });

  // test('A07 logout', async ({ page }) => {
  //   await page.locator('[data-test="nav-sign-out"]').click();
  // });
});
