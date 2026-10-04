import { expect, test } from '../../fixtures';
import {
  VALID_CONTACT,
  INVALID_CONTACT,
  INVALID_EMAIL_CASES,
  VALID_MESSAGE_CASES,
  INVALID_MESSAGE_CASES,
  MESSAGE_MAX_LENGTH,
} from '../../data/contact';

test.describe('Contact', () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.navigate();
  });

  test('CN01 submit valid contact form shows success message @regression', async ({
    contactPage,
  }) => {
    await contactPage.submitForm(VALID_CONTACT);
    await expect(contactPage.successMessage).toBeVisible();
  });

  test('CN02 submit empty form shows required field errors @regression', async ({
    contactPage,
  }) => {
    await contactPage.submit();

    await expect(contactPage.firstNameError).toHaveText(/first name is required/i);
    await expect(contactPage.lastNameError).toHaveText(/last name is required/i);
    await expect(contactPage.emailError).toHaveText(/email is required/i);
    await expect(contactPage.subjectError).toHaveText(/subject is required/i);
    await expect(contactPage.messageError).toHaveText(/message is required/i);
  });

  test('CN03 invalid email format shows email validation error @regression', async ({
    contactPage,
  }) => {
    await contactPage.submitForm({ ...VALID_CONTACT, email: INVALID_CONTACT.invalidEmail });

    await expect(contactPage.emailError).toHaveText(/email format is invalid/i);
  });

  for (const { id, label, email, error } of INVALID_EMAIL_CASES) {
    test(`${id} invalid email (${label}) is rejected @regression`, async ({ contactPage }) => {
      await contactPage.submitForm({ ...VALID_CONTACT, email });

      await expect(contactPage.emailError).toHaveText(error);
      await expect(contactPage.successMessage).toBeHidden();
    });
  }

  test('CN04 message shorter than the minimum length shows message error @regression', async ({
    contactPage,
  }) => {
    await contactPage.submitForm({ ...VALID_CONTACT, message: INVALID_CONTACT.shortMessage });

    await expect(contactPage.messageError).toHaveText(/message must be minimal 50 characters/i);
  });

  for (const { id, label, message } of VALID_MESSAGE_CASES) {
    test(`${id} message accepted (${label}) @regression`, async ({ contactPage }) => {
      await contactPage.submitForm({ ...VALID_CONTACT, message });

      await expect(contactPage.successMessage).toBeVisible();
      await expect(contactPage.messageError).toBeHidden();
    });
  }

  for (const { id, label, message } of INVALID_MESSAGE_CASES) {
    test(`${id} message rejected (${label}) @regression`, async ({ contactPage }) => {
      await contactPage.submitForm({ ...VALID_CONTACT, message });

      await expect(contactPage.messageError).toHaveText(/message must be minimal 50 characters/i);
      await expect(contactPage.successMessage).toBeHidden();
    });
  }

  test('CN07-03 empty message shows required error @regression', async ({ contactPage }) => {
    await contactPage.submitForm({ ...VALID_CONTACT, message: '' });

    await expect(contactPage.messageError).toHaveText(/message is required/i);
    await expect(contactPage.successMessage).toBeHidden();
  });

  test('CN07-05 message over the maximum length is rejected by the server @regression', async ({
    contactPage,
  }) => {
    await contactPage.submitForm({ ...VALID_CONTACT, message: 'a'.repeat(MESSAGE_MAX_LENGTH + 1) });

    await expect(contactPage.serverErrorAlert).toHaveText(
      /must not be greater than 250 characters/i,
    );
    await expect(contactPage.successMessage).toBeHidden();
  });

  test('CN07-04 whitespace-only message is rejected by the server @regression', async ({
    contactPage,
  }) => {
    // Passes client validation (length >= 50) but POST /messages returns 422.
    await contactPage.submitForm({ ...VALID_CONTACT, message: ' '.repeat(60) });

    await expect(contactPage.serverErrorAlert).toHaveText(/the message field is required/i);
    await expect(contactPage.successMessage).toBeHidden();
  });
});
