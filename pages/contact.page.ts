import { Page, Locator } from '@playwright/test';

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}

export class ContactPage {
  readonly page: Page;

  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly subjectDropdown: Locator;
  readonly messageInput: Locator;
  readonly attachmentInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly serverErrorAlert: Locator;

  readonly firstNameError: Locator;
  readonly lastNameError: Locator;
  readonly emailError: Locator;
  readonly subjectError: Locator;
  readonly messageError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.firstNameInput = page.locator('[data-test="first-name"]');
    this.lastNameInput = page.locator('[data-test="last-name"]');
    this.emailInput = page.locator('[data-test="email"]');
    this.subjectDropdown = page.locator('[data-test="subject"]');
    this.messageInput = page.locator('[data-test="message"]');
    this.attachmentInput = page.locator('[data-test="attachment"]');
    this.submitButton = page.locator('[data-test="contact-submit"]');
    this.successMessage = page.getByText(/thanks for your message/i);
    this.serverErrorAlert = page.locator('.alert-danger');

    this.firstNameError = page.locator('[data-test="first-name-error"]');
    this.lastNameError = page.locator('[data-test="last-name-error"]');
    this.emailError = page.locator('[data-test="email-error"]');
    this.subjectError = page.locator('[data-test="subject-error"]');
    this.messageError = page.locator('[data-test="message-error"]');
  }

  async navigate() {
    await this.page.goto('/contact');
  }

  async fillForm(data: Partial<ContactFormData>) {
    if (data.firstName !== undefined) await this.firstNameInput.fill(data.firstName);
    if (data.lastName !== undefined) await this.lastNameInput.fill(data.lastName);
    if (data.email !== undefined) await this.emailInput.fill(data.email);
    if (data.subject !== undefined) await this.subjectDropdown.selectOption(data.subject);
    if (data.message !== undefined) await this.messageInput.fill(data.message);
  }

  async submit() {
    await this.submitButton.click();
  }

  async submitForm(data: Partial<ContactFormData>) {
    await this.fillForm(data);
    await this.submit();
  }
}
