import { expect, test } from '../../fixtures';
import { LOGIN, USERS } from '../../data/users';

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate();
  });

  test('A01 valid customer login lands on account page @regression', async ({
    loginPage,
    accountPage,
    page,
  }) => {
    await loginPage.login(USERS.customer);
    await expect(page).toHaveURL(/\/account$/);
    await expect(accountPage.heading).toHaveText('My account');
    await expect(accountPage.userMenu).toBeVisible();
  });

  test('A02 valid admin login lands on dashboard @regression', async ({ loginPage, page }) => {
    test.skip(!USERS.admin.password, 'ADMIN_PASSWORD is not set in the environment');
    await loginPage.login(USERS.admin);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
  });

  test('A03 wrong password shows error and stays on login @regression @negative', async ({
    loginPage,
    page,
  }) => {
    await loginPage.login({ email: USERS.customer.email, password: LOGIN.wrongPassword });
    await expect(loginPage.errorMessage).toContainText(LOGIN.invalidCredentialsError);
    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});
