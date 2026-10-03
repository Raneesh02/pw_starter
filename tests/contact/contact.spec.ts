import { expect, test } from '../../fixtures';

const VALID_PAYLOAD = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  subject: 'webmaster',
  message: 'This is a test message that is long enough to pass validation requirements.',
};

test.describe('Contact', () => {
  test.setTimeout(45000);

  test.beforeEach(async ({ contactPage }) => {
    await contactPage.navigate();
  });

  test('CT01 successful form submission shows confirmation @smoke', async ({ contactPage }) => {
    await contactPage.fillAndSubmit(VALID_PAYLOAD);
    await expect(contactPage.successAlert, 'success banner should appear after valid submission').toBeVisible();
  });

  test('CT02 submit empty form shows all required field errors @regression', async ({ page, contactPage }) => {
    await contactPage.submitButton.click();
    await expect(page.getByTestId('first-name-error'), 'first name error should appear').toBeVisible();
    await expect(page.getByTestId('last-name-error'), 'last name error should appear').toBeVisible();
    await expect(page.getByTestId('email-error'), 'email error should appear').toBeVisible();
    await expect(page.getByTestId('subject-error'), 'subject error should appear').toBeVisible();
    await expect(page.getByTestId('message-error'), 'message error should appear').toBeVisible();
  });

  test('CT03 submit with blank first name shows field error @regression', async ({ contactPage, page }) => {
    await contactPage.fillAndSubmit({ ...VALID_PAYLOAD, firstName: '' });
    await expect(
      page.getByTestId('first-name-error'),
      'first name error should be visible when field is blank'
    ).toBeVisible();
  });

  test('CT04 submit with blank last name shows field error @regression', async ({ contactPage, page }) => {
    await contactPage.fillAndSubmit({ ...VALID_PAYLOAD, lastName: '' });
    await expect(
      page.getByTestId('last-name-error'),
      'last name error should be visible when field is blank'
    ).toBeVisible();
  });

  test('CT05 submit with blank email shows field error @regression', async ({ contactPage, page }) => {
    await contactPage.fillAndSubmit({ ...VALID_PAYLOAD, email: '' });
    await expect(
      page.getByTestId('email-error'),
      'email error should be visible when field is blank'
    ).toBeVisible();
  });

  test('CT06 submit with blank message shows field error @regression', async ({ contactPage, page }) => {
    await contactPage.fillAndSubmit({ ...VALID_PAYLOAD, message: '' });
    await expect(
      page.getByTestId('message-error'),
      'message error should be visible when field is blank'
    ).toBeVisible();
  });

  test('CT07 contact page is reachable via nav link @smoke', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-contact').click();
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.getByTestId('first-name')).toBeVisible();
  });
});
