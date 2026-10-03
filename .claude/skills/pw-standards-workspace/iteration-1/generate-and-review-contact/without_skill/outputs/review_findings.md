# Code Review — tests/contact/contact.spec.ts

Reviewed against: TEST_AUTOMATION_STANDARDS.md (generated for this project)
Source files: `tests/contact/contact.spec.ts`, `pages/contact.page.ts`

---

## Summary

The contact spec is well-structured overall. Imports are correct, `beforeEach` uses the page-object fixture, and the `fillAndSubmit` facade keeps test bodies short. Five issues were found: two moderate (raw locators in specs, fragile `successAlert` locator), one minor (CT07 overrides `beforeEach` navigation), one informational (non-standard ID prefix), and one style note (inconsistent `page` vs `contactPage` usage in error assertions).

---

## Findings

### 1. Raw error locators built in specs instead of via the page object

**Severity:** Moderate  
**Standard:** §4.1 — Locators belong in page objects; §6.3 — Field-error assertions  
**Affected tests:** CT02, CT03, CT04, CT05, CT06

Tests CT02–CT06 call `page.getByTestId('first-name-error')` (and the other error test IDs) directly in the spec body. `ContactPage` already exposes a `getFieldError(fieldTestId)` method that returns the correct error locator. The specs should use that method instead.

```typescript
// Current — raw locator in spec
await expect(page.getByTestId('first-name-error'), 'first name error should appear').toBeVisible();

// Correct — via page-object accessor
await expect(contactPage.getFieldError('first-name'), 'first name error should appear').toBeVisible();
```

Note: `getFieldError` uses a parent-relative locator (`locator('..').getByRole('alert')`) which is more precise than `getByTestId('first-name-error')`. Switching to it also removes the need for the raw `page` fixture parameter in CT03–CT06.

---

### 2. `successAlert` uses a brittle CSS class locator

**Severity:** Moderate  
**Standard:** §4.2 — Locator priority  
**Affected file:** `pages/contact.page.ts` line 22  
**Affected test:** CT01

`successAlert` is defined as `page.locator('.alert-success')`. CSS class names are presentation-layer details and break when the Angular component is restyled. Prefer `getByRole('alert')` (optionally filtered by text) or a `data-test` attribute.

```typescript
// Current
this.successAlert = page.locator('.alert-success');

// Preferred
this.successAlert = page.getByRole('alert').filter({ hasText: /message sent/i });
// or, if a data-test attribute is available on the live site:
this.successAlert = page.getByTestId('contact-success-alert');
```

---

### 3. CT07 makes `beforeEach` navigation a no-op for that test

**Severity:** Minor  
**Standard:** §12 — Navigation in tests  
**Affected test:** CT07

`beforeEach` navigates to `/contact` for every test, including CT07. CT07 then immediately navigates away with `page.goto('/')` to test the nav link. The `beforeEach` call for CT07 is therefore wasted work (an extra page load before the test starts).

Options in order of preference:
- Move CT07 into a separate `test.describe` block that does not have the `/contact` `beforeEach`, since its setup is different.
- Add a `test.use` or restructure the describes so that the navigation-test has its own isolated describe without the shared `beforeEach`.

```typescript
// Option: separate describe block
test.describe('Contact navigation', () => {
  test('CT07 contact page is reachable via nav link @smoke', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-contact').click();
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.getByTestId('first-name')).toBeVisible();
  });
});
```

---

### 4. ID prefix `CT` is not defined in the project conventions

**Severity:** Informational  
**Standard:** §2 — Test ID and naming  
**Affected tests:** All (CT01–CT07)

`TEST_STRATEGY.md` and `CLAUDE.md` list `P`, `C`, `CH`, `A`, and `AC` as the defined prefixes. `CT` (contact) is not listed. This is not a blocking issue — `CT` is a reasonable addition — but it should be documented in `TEST_STRATEGY.md` under §5 (conventions) and §11 (coverage table) to keep the strategy document authoritative.

---

### 5. Inconsistent use of `page` fixture vs `contactPage` for error assertions

**Severity:** Style  
**Standard:** §4.1 — Locators belong in page objects  
**Affected tests:** CT02–CT06

CT02 accepts both `{ page, contactPage }`. CT03–CT06 do the same. Once finding #1 is fixed (using `contactPage.getFieldError(...)`), the raw `page` fixture parameter can be removed from these destructured arguments, reducing noise in the test signature.

```typescript
// After fix — page parameter no longer needed
test('CT03 submit with blank first name shows field error @regression', async ({ contactPage }) => {
  await contactPage.fillAndSubmit({ ...VALID_PAYLOAD, firstName: '' });
  await expect(
    contactPage.getFieldError('first-name'),
    'first name error should be visible when field is blank'
  ).toBeVisible();
});
```

---

## What passes review

| Criterion | Status |
|---|---|
| Imports from `fixtures/`, not `@playwright/test` | Pass |
| `beforeEach` uses fixture-injected page object | Pass |
| Multi-step form fill is encapsulated in `fillAndSubmit` | Pass |
| All tests have a unique ID and a suite tag | Pass |
| Assertion intent messages are present on all assertions | Pass |
| No `waitForTimeout` | Pass |
| No `networkidle` (contact page correctly uses `waitUntil: 'load'`) | Pass |
| `navigate()` waits for a concrete element | Pass |
| Tests are independent (each navigates in `beforeEach`) | Pass |
| TypeScript-clean (no `any`, constructor params are `readonly`) | Pass |
| `VALID_PAYLOAD` constant avoids repeating data across tests | Pass |

---

## Recommended action items

| # | Finding | Priority | Action |
|---|---|---|---|
| 1 | Raw error locators in specs | Moderate | Replace `page.getByTestId(...)` with `contactPage.getFieldError(...)` in CT02–CT06 |
| 2 | `.alert-success` CSS class locator | Moderate | Change to `getByRole('alert')` or a `data-test` attribute in `contact.page.ts` |
| 3 | CT07 `beforeEach` no-op | Minor | Move CT07 into its own `describe` block without the shared `beforeEach` |
| 4 | `CT` prefix undocumented | Info | Add `CT` to the prefix table in `TEST_STRATEGY.md` §5 and §11 |
| 5 | Unused `page` parameter | Style | Remove `page` from CT02–CT06 fixtures once finding #1 is applied |
