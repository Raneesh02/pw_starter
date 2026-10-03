import { Page, Locator, Request, Response } from '@playwright/test';
import { CONTACT } from '../data/contact';

export interface ContactFormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export class ContactPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly subjectSelect: Locator;
  readonly messageInput: Locator;
  readonly attachmentInput: Locator;
  readonly sendButton: Locator;
  readonly successAlert: Locator;

  readonly firstNameError: Locator;
  readonly lastNameError: Locator;
  readonly emailError: Locator;
  readonly subjectError: Locator;
  readonly messageError: Locator;
  readonly attachmentError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Contact' });
    this.firstNameInput = page.locator('[data-test="first-name"]');
    this.lastNameInput = page.locator('[data-test="last-name"]');
    this.emailInput = page.locator('[data-test="email"]');
    this.subjectSelect = page.locator('[data-test="subject"]');
    this.messageInput = page.locator('[data-test="message"]');
    this.attachmentInput = page.locator('[data-test="attachment"]');
    this.sendButton = page.locator('[data-test="contact-submit"]');
    this.successAlert = page.getByRole('alert').filter({ hasText: 'Thanks for your message' });

    this.firstNameError = page.locator('[data-test="first-name-error"]');
    this.lastNameError = page.locator('[data-test="last-name-error"]');
    this.emailError = page.locator('[data-test="email-error"]');
    this.subjectError = page.locator('[data-test="subject-error"]');
    this.messageError = page.locator('[data-test="message-error"]');
    this.attachmentError = page.getByRole('alert').filter({ hasText: CONTACT.errors.attachment });
  }

  async navigate() {
    await this.page.goto('/contact');
    await this.firstNameInput.waitFor();
  }

  async fillForm(data: ContactFormData) {
    if (data.firstName !== undefined) await this.firstNameInput.fill(data.firstName);
    if (data.lastName !== undefined) await this.lastNameInput.fill(data.lastName);
    if (data.email !== undefined) await this.emailInput.fill(data.email);
    if (data.subject !== undefined) await this.subjectSelect.selectOption(data.subject);
    if (data.message !== undefined) await this.messageInput.fill(data.message);
  }

  async submit() {
    await this.sendButton.click();
  }

  async attachFile(file: string | { name: string; mimeType: string; buffer: Buffer }) {
    await this.attachmentInput.setInputFiles(file);
  }

  async submitAndWaitForApi(): Promise<{ request: Request; response: Response }> {
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().endsWith(CONTACT.apiPath) && r.request().method() === 'POST'),
      this.submit(),
    ]);
    return { request: response.request(), response };
  }
}
