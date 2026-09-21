import { expect, test } from '../../fixtures';
import { PRODUCTS } from '../../data/products';
import { USERS } from '../../data/users';
import { AddressData, PaymentData } from '../../pages/checkout.page';

const ADDRESS: AddressData = {
  country: 'United States',
  postalCode: '12345',
  houseNumber: '123',
  street: 'Main St',
  city: 'Anytown',
  state: 'NY',
};

const PAYMENT: PaymentData = {
  method: 'Bank Transfer',
};

test.describe('Checkout', () => {
  test.beforeEach(async ({ shopFacade }) => {
    await shopFacade.addToCartAndGoToCheckout(PRODUCTS.search.validKeyword);
  });

  test('CH01 happy path checkout as guest @regression', async ({ page, checkoutPage }) => {
    await checkoutPage.continueAsGuest(USERS.guest.email, USERS.guest.firstName, USERS.guest.lastName);
    await checkoutPage.fillAddress(ADDRESS);
    await checkoutPage.fillPayment(PAYMENT);
    await expect(page.getByText(/payment was successful|order confirmed|thank you/i)).toBeVisible();
  });

  test('CH02 address validation rejects empty fields @regression', async ({ page, checkoutPage }) => {
    await checkoutPage.continueAsGuest(USERS.guest.email, USERS.guest.firstName, USERS.guest.lastName);
    await page.locator('app-address').getByRole('button', { name: 'Proceed to checkout' }).click();
    await expect(page.getByText(/required|invalid/i).first()).toBeVisible();
  });

  test('CH03 invalid credit card shows payment error @regression', async ({ page, checkoutPage }) => {
    await checkoutPage.continueAsGuest(USERS.guest.email, USERS.guest.firstName, USERS.guest.lastName);
    await checkoutPage.fillAddress(ADDRESS);
    await checkoutPage.fillPayment({
      method: 'Credit Card',
      cardNumber: '0000000000000000',
      expirationDate: '01/23',
      cvv: '000',
      cardHolderName: 'Test User',
    });
    await expect(page.getByText(/invalid|declined|error/i).first()).toBeVisible();
  });

  test('CH04 order confirmation shows order number @regression', async ({ page, checkoutPage }) => {
    await checkoutPage.continueAsGuest(USERS.guest.email, USERS.guest.firstName, USERS.guest.lastName);
    await checkoutPage.fillAddress(ADDRESS);
    await checkoutPage.fillPayment(PAYMENT);
    await expect(page.getByText(/payment was successful|order confirmed/i)).toBeVisible();
    await expect(page.locator('[data-test="order-confirmation"]')).toBeVisible();
  });

  test('CH05 back navigation returns to previous step @regression', async ({ page, checkoutPage }) => {
    await checkoutPage.continueAsGuest(USERS.guest.email, USERS.guest.firstName, USERS.guest.lastName);
    await expect(page.locator('app-address')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/checkout/);
  });

  test('CH06 checkout with multiple items completes successfully @regression', async ({ page, checkoutPage }) => {
    await page.goto('/');
    await page.getByRole('checkbox', { name: PRODUCTS.categories.powerTools }).check();
    await page.getByRole('heading', { level: 5 }).first().click();
    await page.locator('[data-test="add-to-cart"]').click();
    await page.goto('/checkout');

    await checkoutPage.continueAsGuest(USERS.guest.email, USERS.guest.firstName, USERS.guest.lastName);
    await checkoutPage.fillAddress(ADDRESS);
    await checkoutPage.fillPayment(PAYMENT);
    await expect(page.getByText(/payment was successful|order confirmed|thank you/i)).toBeVisible();
  });
});
