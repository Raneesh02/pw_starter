import { expect, test } from '../../fixtures';
import { CONTACT } from '../../data/contact';

test.describe('Contact', () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.navigate();
  });

  test('CT01 contact page shows all form fields @regression', async ({ contactPage, page }) => {
    await expect(page).toHaveURL(/\/contact/);
    await expect(contactPage.heading).toBeVisible();
    await expect(contactPage.firstNameInput).toBeVisible();
    await expect(contactPage.lastNameInput).toBeVisible();
    await expect(contactPage.emailInput).toBeVisible();
    await expect(contactPage.subjectSelect).toBeVisible();
    await expect(contactPage.messageInput).toBeVisible();
    await expect(contactPage.attachmentInput).toBeVisible();
    await expect(contactPage.sendButton).toBeVisible();
  });

  test('CT02 subject dropdown lists all expected options @regression', async ({ contactPage }) => {
    const options = contactPage.subjectSelect.locator('option:not([disabled])');
    await expect(options).toHaveText(CONTACT.subjects.map((s) => s.label));
  });

  test('CT03 submit valid form shows success message @smoke @regression', async ({ contactPage }) => {
    await contactPage.fillForm(CONTACT.valid);
    await contactPage.submit();
    await expect(contactPage.successAlert).toHaveText(CONTACT.successMessage);
    await expect(contactPage.sendButton).toBeHidden();
  });

  for (const subject of CONTACT.subjects) {
    test(`CT04 submit with subject "${subject.label}" succeeds @regression`, async ({ contactPage }) => {
      await contactPage.fillForm({ ...CONTACT.valid, subject: subject.value });
      await contactPage.submit();
      await expect(contactPage.successAlert).toBeVisible();
    });
  }

  test('CT05 empty form shows required errors for all fields @regression', async ({ contactPage }) => {
    await contactPage.submit();
    await expect(contactPage.firstNameError).toHaveText(CONTACT.errors.firstName);
    await expect(contactPage.lastNameError).toHaveText(CONTACT.errors.lastName);
    await expect(contactPage.emailError).toHaveText(CONTACT.errors.email);
    await expect(contactPage.subjectError).toHaveText(CONTACT.errors.subject);
    await expect(contactPage.messageError).toHaveText(CONTACT.errors.message);
    await expect(contactPage.successAlert).toBeHidden();
  });

  test('CT06 missing first name shows only first name error @regression', async ({ contactPage }) => {
    await contactPage.fillForm({ ...CONTACT.valid, firstName: '' });
    await contactPage.submit();
    await expect(contactPage.firstNameError).toHaveText(CONTACT.errors.firstName);
    await expect(contactPage.lastNameError).toBeHidden();
    await expect(contactPage.successAlert).toBeHidden();
  });

  test('CT07 missing last name shows only last name error @regression', async ({ contactPage }) => {
    await contactPage.fillForm({ ...CONTACT.valid, lastName: '' });
    await contactPage.submit();
    await expect(contactPage.lastNameError).toHaveText(CONTACT.errors.lastName);
    await expect(contactPage.firstNameError).toBeHidden();
    await expect(contactPage.successAlert).toBeHidden();
  });

  test('CT08 missing email shows required error @regression', async ({ contactPage }) => {
    await contactPage.fillForm({ ...CONTACT.valid, email: '' });
    await contactPage.submit();
    await expect(contactPage.emailError).toHaveText(CONTACT.errors.email);
    await expect(contactPage.successAlert).toBeHidden();
  });

  for (const email of CONTACT.invalidEmails) {
    test(`CT09 invalid email "${email}" shows format error @regression`, async ({ contactPage }) => {
      await contactPage.fillForm({ ...CONTACT.valid, email });
      await contactPage.submit();
      await expect(contactPage.emailError).toHaveText(CONTACT.errors.emailInvalid);
      await expect(contactPage.successAlert).toBeHidden();
    });
  }

  test('CT10 missing subject shows required error @regression', async ({ contactPage }) => {
    await contactPage.fillForm({ ...CONTACT.valid, subject: undefined });
    await contactPage.submit();
    await expect(contactPage.subjectError).toHaveText(CONTACT.errors.subject);
    await expect(contactPage.successAlert).toBeHidden();
  });

  test('CT11 missing message shows required error @regression', async ({ contactPage }) => {
    await contactPage.fillForm({ ...CONTACT.valid, message: '' });
    await contactPage.submit();
    await expect(contactPage.messageError).toHaveText(CONTACT.errors.message);
    await expect(contactPage.successAlert).toBeHidden();
  });

  test('CT12 message shorter than 50 characters shows length error @regression', async ({ contactPage }) => {
    await contactPage.fillForm({ ...CONTACT.valid, message: CONTACT.shortMessage });
    await contactPage.submit();
    await expect(contactPage.messageError).toHaveText(CONTACT.errors.messageShort);
    await expect(contactPage.successAlert).toBeHidden();
  });

  test('CT13 message with exactly 50 characters is accepted @regression', async ({ contactPage }) => {
    const message = 'x'.repeat(CONTACT.minMessageLength);
    await contactPage.fillForm({ ...CONTACT.valid, message });
    await contactPage.submit();
    await expect(contactPage.successAlert).toBeVisible();
  });

  test('CT14 message with 49 characters is rejected @regression', async ({ contactPage }) => {
    const message = 'x'.repeat(CONTACT.minMessageLength - 1);
    await contactPage.fillForm({ ...CONTACT.valid, message });
    await contactPage.submit();
    await expect(contactPage.messageError).toHaveText(CONTACT.errors.messageShort);
  });

  test('CT15 submit with empty .txt attachment succeeds @regression', async ({ contactPage }) => {
    await contactPage.fillForm(CONTACT.valid);
    await contactPage.attachFile({ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('') });
    await contactPage.submit();
    await expect(contactPage.successAlert).toBeVisible();
  });

  test('CT16 attachment input only accepts .txt files @regression', async ({ contactPage }) => {
    await expect(contactPage.attachmentInput).toHaveAttribute('accept', '.txt');
    await expect(contactPage.page.getByText(/only files with the txt extension are allowed/i)).toBeVisible();
  });

  test('CT17 error clears after fixing the invalid field @regression', async ({ contactPage }) => {
    await contactPage.fillForm({ ...CONTACT.valid, email: CONTACT.invalidEmails[0] });
    await contactPage.submit();
    await expect(contactPage.emailError).toBeVisible();
    await contactPage.emailInput.fill(CONTACT.valid.email);
    await expect(contactPage.emailError).toBeHidden();
  });

  test('CT18 form keeps entered data after a failed submit @regression', async ({ contactPage }) => {
    await contactPage.fillForm({ ...CONTACT.valid, message: CONTACT.shortMessage });
    await contactPage.submit();
    await expect(contactPage.messageError).toBeVisible();
    await expect(contactPage.firstNameInput).toHaveValue(CONTACT.valid.firstName);
    await expect(contactPage.lastNameInput).toHaveValue(CONTACT.valid.lastName);
    await expect(contactPage.emailInput).toHaveValue(CONTACT.valid.email);
    await expect(contactPage.subjectSelect).toHaveValue(CONTACT.valid.subject);
  });

  test('CT19 contact page is reachable from the header menu @regression', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test('CT20 non-empty .txt attachment is rejected @regression', async ({ contactPage }) => {
    await contactPage.fillForm(CONTACT.valid);
    await contactPage.attachFile(CONTACT.files.nonEmptyTxt);
    await contactPage.submit();
    await expect(contactPage.attachmentError).toBeVisible();
    await expect(contactPage.successAlert).toBeHidden();
  });

  test('CT21 non-.txt attachment is rejected @regression', async ({ contactPage }) => {
    await contactPage.fillForm(CONTACT.valid);
    await contactPage.attachFile(CONTACT.files.png);
    await contactPage.submit();
    await expect(contactPage.attachmentError).toBeVisible();
    await expect(contactPage.successAlert).toBeHidden();
  });

  test('CT22 whitespace-only names and message are rejected by the API @regression', async ({ contactPage }) => {
    await contactPage.fillForm({
      ...CONTACT.valid,
      firstName: CONTACT.whitespace,
      lastName: CONTACT.whitespace,
      message: CONTACT.whitespace.repeat(CONTACT.minMessageLength),
    });
    const { response } = await contactPage.submitAndWaitForApi();
    expect(response.status(), 'API should reject whitespace-only values').toBe(422);
    await expect(contactPage.successAlert).toBeHidden();
  });

  test('CT23 invalid email and short message show both errors at once @regression', async ({ contactPage }) => {
    await contactPage.fillForm({ ...CONTACT.valid, email: CONTACT.invalidEmails[0], message: CONTACT.shortMessage });
    await contactPage.submit();
    await expect(contactPage.emailError).toHaveText(CONTACT.errors.emailInvalid);
    await expect(contactPage.messageError).toHaveText(CONTACT.errors.messageShort);
    await expect(contactPage.successAlert).toBeHidden();
  });

  test('CT24 special characters and HTML are accepted and not executed @regression', async ({ contactPage, page }) => {
    let dialogOpened = false;
    page.on('dialog', async (dialog) => {
      dialogOpened = true;
      await dialog.dismiss();
    });
    await contactPage.fillForm({
      ...CONTACT.valid,
      firstName: CONTACT.specialChars.firstName,
      message: CONTACT.specialChars.message,
    });
    await contactPage.submit();
    await expect(contactPage.successAlert).toBeVisible();
    expect(dialogOpened, 'no script from the input should run').toBe(false);
  });

  test('CT25 submit sends the entered data to the messages API @regression', async ({ contactPage }) => {
    await contactPage.fillForm(CONTACT.valid);
    const { request, response } = await contactPage.submitAndWaitForApi();
    expect(response.status()).toBe(200);
    expect(request.postDataJSON()).toMatchObject({
      name: `${CONTACT.valid.firstName} ${CONTACT.valid.lastName}`,
      email: CONTACT.valid.email,
      subject: CONTACT.valid.subject,
      message: CONTACT.valid.message,
    });
  });

  test('CT26 server error does not show the success message @regression', async ({ contactPage, page }) => {
    await page.route(`**${CONTACT.apiPath}`, (route) => route.fulfill({ status: 500, body: '{}' }));
    await contactPage.fillForm(CONTACT.valid);
    await contactPage.submit();
    await expect(contactPage.successAlert).toBeHidden();
    await expect(contactPage.sendButton).toBeVisible();
    await expect(contactPage.messageInput).toHaveValue(CONTACT.valid.message);
  });

  test('CT27 pressing Enter in a text field submits the form @regression', async ({ contactPage }) => {
    await contactPage.fillForm(CONTACT.valid);
    await contactPage.lastNameInput.press('Enter');
    await expect(contactPage.successAlert).toHaveText(CONTACT.successMessage);
  });

  test('CT28 subject starts on the placeholder with no value selected @regression', async ({ contactPage }) => {
    await expect(contactPage.subjectSelect).toHaveValue('');
    await expect(contactPage.subjectSelect.locator('option:checked')).toHaveText(CONTACT.subjectPlaceholder);
  });
});
