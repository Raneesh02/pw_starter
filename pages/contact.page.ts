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
  readonly successAlert: Locator;

  readonly firstNameError: Locator;
  readonly lastNameError: Locator;
  readonly emailError: Locator;
  readonly subjectError: Locator;
  readonly messageError: Locator;
  readonly attachmentError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.firstNameInput = page.locator('[data-test="first-name"]');
    this.lastNameInput = page.locator('[data-test="last-name"]');
    this.emailInput = page.locator('[data-test="email"]');
    this.subjectDropdown = page.locator('[data-test="subject"]');
    this.messageInput = page.locator('[data-test="message"]');
    this.attachmentInput = page.locator('[data-test="attachment"]');
    this.submitButton = page.locator('[data-test="contact-submit"]');
    this.successAlert = page.getByText('Thanks for your message! We will contact you shortly.');

    this.firstNameError = page.locator('[data-test="first-name-error"]');
    this.lastNameError = page.locator('[data-test="last-name-error"]');
    this.emailError = page.locator('[data-test="email-error"]');
    this.subjectError = page.locator('[data-test="subject-error"]');
    this.messageError = page.locator('[data-test="message-error"]');
    this.attachmentError = page.locator('[data-test="attachment-error"]');
  }

  async navigate() {
    await this.page.goto('/contact');
    await this.page.waitForLoadState('networkidle');
  }

  async fillForm(data: ContactFormData) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.subjectDropdown.selectOption(data.subject);
    await this.messageInput.fill(data.message);
  }

  async attachFile(filePath: string) {
    await this.attachmentInput.setInputFiles(filePath);
  }

  async submit() {
    await this.submitButton.click();
  }
}
