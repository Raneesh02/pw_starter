import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ContactPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly subjectSelect: Locator;
  readonly messageInput: Locator;
  readonly submitButton: Locator;
  readonly successAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.getByTestId('first-name');
    this.lastNameInput = page.getByTestId('last-name');
    this.emailInput = page.getByTestId('email');
    this.subjectSelect = page.getByTestId('subject');
    this.messageInput = page.getByTestId('message');
    this.submitButton = page.getByTestId('contact-submit');
    // success banner rendered by Angular after submission
    this.successAlert = page.locator('.alert-success');
  }

  async navigate() {
    // Use load (not networkidle): chat/live-activity widgets poll continuously and block networkidle
    await this.page.goto('/contact', { waitUntil: 'load' });
    await this.firstNameInput.waitFor({ state: 'visible' });
  }

  async fillAndSubmit(data: {
    firstName: string;
    lastName: string;
    email: string;
    subject: string;
    message: string;
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.subjectSelect.selectOption(data.subject);
    await this.messageInput.fill(data.message);
    await this.submitButton.click();
  }

  getFieldError(fieldTestId: string): Locator {
    return this.page.getByTestId(fieldTestId).locator('..').getByRole('alert');
  }
}
