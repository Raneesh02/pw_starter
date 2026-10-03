import { test } from '@playwright/test';

test('dump contact subject options', async ({ page }) => {
  await page.goto('/contact', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-test="first-name"]');

  const options = await page.evaluate(() => {
    const sel = document.querySelector('[data-test="subject"]') as HTMLSelectElement;
    return Array.from(sel.options).map(o => ({ value: o.value, text: o.text }));
  });
  console.log('SUBJECT OPTIONS:', JSON.stringify(options, null, 2));
});

test('dump contact validation errors', async ({ page }) => {
  await page.goto('/contact', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-test="contact-submit"]');

  // Submit blank form to trigger validation
  await page.locator('[data-test="contact-submit"]').click();
  await page.waitForTimeout(1000);

  const errors = await page.evaluate(() => {
    // Look for any error-related elements
    const errEls = document.querySelectorAll('[class*="error"], [class*="invalid"], [class*="alert"], .text-danger, small.ng-star-inserted');
    return Array.from(errEls).map(el => ({
      tag: el.tagName.toLowerCase(),
      className: el.className,
      dataTest: el.getAttribute('data-test') || '',
      text: el.textContent?.trim().slice(0, 100) || '',
    }));
  });
  console.log('ERRORS:', JSON.stringify(errors, null, 2));

  // Also look for data-test attrs after submission
  const newAttrs = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-test]');
    return Array.from(els)
      .filter(el => el.getAttribute('data-test')?.includes('error') || el.getAttribute('data-test')?.includes('alert'))
      .map(el => ({
        tag: el.tagName.toLowerCase(),
        dataTest: el.getAttribute('data-test'),
        text: el.textContent?.trim().slice(0, 100) || '',
      }));
  });
  console.log('ERROR data-test attrs:', JSON.stringify(newAttrs, null, 2));
});
