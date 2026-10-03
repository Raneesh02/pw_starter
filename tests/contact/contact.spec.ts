import { expect, test } from '../../fixtures';
import { CONTACT } from '../../data/contact';

test.describe('Contact', () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.navigate();
  });

  test('CT01 submitting empty form shows required field errors @regression', async ({
    contactPage,
  }) => {
    await contactPage.submit();
    await expect(contactPage.firstNameError).toHaveText('First name is required');
    await expect(contactPage.lastNameError).toHaveText('Last name is required');
    await expect(contactPage.emailError).toHaveText('Email is required');
    await expect(contactPage.subjectError).toHaveText('Subject is required');
    await expect(contactPage.messageError).toHaveText('Message is required');
  });

  test('CT02 invalid email format shows email format error @regression', async ({
    contactPage,
  }) => {
    await contactPage.fillForm({ ...CONTACT.valid, email: CONTACT.invalidEmail });
    await contactPage.submit();
    await expect(contactPage.emailError).toHaveText('Email format is invalid');
  });

  test('CT03 message under minimum length shows length error @regression', async ({
    contactPage,
  }) => {
    await contactPage.fillForm({ ...CONTACT.valid, message: CONTACT.shortMessage });
    await contactPage.submit();
    await expect(contactPage.messageError).toHaveText('Message must be minimal 50 characters');
  });

  test('CT04 valid submission shows thank you confirmation @regression', async ({
    contactPage,
  }) => {
    await contactPage.fillForm(CONTACT.valid);
    await contactPage.submit();
    await expect(contactPage.successAlert).toBeVisible();
  });

  test('CT05 valid submission replaces the form with the confirmation @regression', async ({
    contactPage,
  }) => {
    await contactPage.fillForm(CONTACT.valid);
    await contactPage.submit();
    await expect(contactPage.successAlert).toBeVisible();
    await expect(contactPage.firstNameInput).toHaveCount(0);
    await expect(contactPage.submitButton).toHaveCount(0);
  });

  test('CT06 subject dropdown lists all expected options @regression', async ({ contactPage }) => {
    const options = await contactPage.subjectDropdown.locator('option').allTextContents();
    expect(options.map((o) => o.trim())).toEqual([
      'Select a subject *',
      'Customer service',
      'Webmaster',
      'Return',
      'Payments',
      'Warranty',
      'Status of my order',
    ]);
  });

  test('CT07 non-empty attachment shows attachment error @regression', async ({ contactPage }) => {
    await contactPage.fillForm(CONTACT.valid);
    await contactPage.attachFile(CONTACT.nonEmptyAttachmentPath);
    await contactPage.submit();
    await expect(contactPage.attachmentError).toHaveText('File should be empty.');
  });
});
