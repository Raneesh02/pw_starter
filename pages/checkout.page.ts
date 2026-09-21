import { Page, Locator } from '@playwright/test';

export interface AddressData {
  country: string;
  postalCode: string;
  houseNumber: string;
  street: string;
  city: string;
  state: string;
}

export interface PaymentData {
  method: 'Bank Transfer' | 'Cash on Delivery' | 'Credit Card' | 'Buy Now Pay Later' | 'Gift Card';
  cardNumber?: string;
  expirationDate?: string;
  cvv?: string;
  cardHolderName?: string;
}

export class CheckoutPage {
  readonly page: Page;

  // Step 2 — Guest
  readonly continueAsGuestTab: Locator;

  // Step 2 — Guest (fields)
  readonly guestEmailInput: Locator;
  readonly guestFirstNameInput: Locator;
  readonly guestLastNameInput: Locator;
  readonly continueAsGuestButton: Locator;
  readonly proceedAfterGuestButton: Locator;

  // Step 3 — Billing Address
  readonly countryDropdown: Locator;
  readonly postalCodeInput: Locator;
  readonly houseNumberInput: Locator;
  readonly streetInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly proceedToBillingButton: Locator;

  // Step 4 — Payment
  readonly paymentMethodDropdown: Locator;
  readonly creditCardNumberInput: Locator;
  readonly expirationDateInput: Locator;
  readonly cvvInput: Locator;
  readonly cardHolderNameInput: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Step 2 — Guest
    this.continueAsGuestTab = page.getByRole('tab', { name: 'Continue as Guest' });
    this.guestEmailInput = page.locator('[data-test="guest-email"]');
    this.guestFirstNameInput = page.locator('[data-test="guest-first-name"]');
    this.guestLastNameInput = page.locator('[data-test="guest-last-name"]');
    this.continueAsGuestButton = page.locator('[data-test="guest-submit"]');
    this.proceedAfterGuestButton = page.locator('[data-test="proceed-2-guest"]');

    // Step 3 — Billing Address
    this.countryDropdown = page.locator('[data-test="country"]');
    this.postalCodeInput = page.locator('[data-test="postal_code"]');
    this.houseNumberInput = page.locator('[data-test="house_number"]');
    this.streetInput = page.locator('[data-test="street"]');
    this.cityInput = page.locator('[data-test="city"]');
    this.stateInput = page.locator('[data-test="state"]');
    this.proceedToBillingButton = page.locator('app-address').getByRole('button', { name: 'Proceed to checkout' });

    // Step 4 — Payment
    this.paymentMethodDropdown = page.locator('[data-test="payment-method"]');
    this.creditCardNumberInput = page.getByRole('textbox', { name: 'Credit Card Number' });
    this.expirationDateInput = page.getByRole('textbox', { name: 'Expiration Date' });
    this.cvvInput = page.getByRole('textbox', { name: 'CVV' });
    this.cardHolderNameInput = page.getByRole('textbox', { name: 'Card Holder Name' });
    this.confirmButton = page.getByRole('button', { name: 'Confirm' });
  }

  async continueAsGuest(email: string, firstName: string, lastName: string) {
    await this.continueAsGuestTab.click();
    await this.guestEmailInput.fill(email);
    await this.guestFirstNameInput.fill(firstName);
    await this.guestLastNameInput.fill(lastName);
    await this.continueAsGuestButton.click();
    await this.proceedAfterGuestButton.click();
  }

  async fillAddress(address: AddressData) {
    await this.countryDropdown.selectOption(address.country);
    await this.postalCodeInput.fill(address.postalCode);
    await this.houseNumberInput.fill(address.houseNumber);
    await this.streetInput.fill(address.street);
    await this.cityInput.fill(address.city);
    await this.stateInput.fill(address.state);
    await this.proceedToBillingButton.click();
  }

  async fillPayment(payment: PaymentData) {
    await this.paymentMethodDropdown.selectOption(payment.method);
    if (payment.method === 'Credit Card') {
      await this.creditCardNumberInput.fill(payment.cardNumber ?? '');
      await this.expirationDateInput.fill(payment.expirationDate ?? '');
      await this.cvvInput.fill(payment.cvv ?? '');
      await this.cardHolderNameInput.fill(payment.cardHolderName ?? '');
    }
    await this.confirmButton.click();
  }
}
