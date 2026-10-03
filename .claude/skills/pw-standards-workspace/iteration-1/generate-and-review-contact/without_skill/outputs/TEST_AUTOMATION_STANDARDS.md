# Test Automation Standards — Practice Software Testing Shop

This document defines the coding standards for the Playwright + TypeScript end-to-end test suite in this repository. It is derived from `TEST_STRATEGY.md`, `CLAUDE.md`, and the patterns established in the existing specs and page objects. Any contributor adding or modifying tests must follow these standards.

---

## 1. Imports

- Always import `test` and `expect` from `../../fixtures` (or the correct relative path to `fixtures/index.ts`), **not** from `@playwright/test`.
- The custom fixture injects typed page objects and `ShopFacade`; importing from `@playwright/test` directly bypasses them.

```typescript
// Correct
import { expect, test } from '../../fixtures';

// Wrong
import { test, expect } from '@playwright/test';
```

---

## 2. Test ID and naming

Every test title must follow the pattern:

```
<ID> <description> <@tag>
```

- **ID prefix conventions**:
  - `P` — product discovery
  - `C` — cart
  - `CH` — checkout
  - `A` — authentication
  - `AC` — customer account
  - `CT` — contact (extended for the contact area)
- IDs are numeric and zero-padded (`CT01`, not `CT1`).
- IDs are **never reused** across the entire suite. If a test is deleted, its ID is retired.
- Each test must have **exactly one** suite tag (`@smoke`, `@regression`, `@demo`, or `@flaky`). The tag goes at the end of the title.

```typescript
// Correct
test('CT01 successful form submission shows confirmation @smoke', ...);

// Wrong — no ID, no tag
test('successful submission', ...);

// Wrong — tag in the middle
test('CT01 @smoke successful form submission shows confirmation', ...);
```

---

## 3. File and folder structure

```
tests/<feature>/          One spec file per feature area
pages/<feature>.page.ts   One page object per page or major component
```

- Spec files are named `<feature>.spec.ts`.
- Page objects extend `BasePage` and are named `<Feature>Page`.
- New fixtures are registered in `fixtures/index.ts`.

---

## 4. Page objects

### 4.1 Locators belong in page objects

A spec must not build raw locators. If a spec needs to interact with an element, the locator belongs in the page object, either as a property or as a method returning a `Locator`.

```typescript
// Correct — locator is a page-object property
await expect(contactPage.successAlert).toBeVisible();

// Wrong — raw locator built inline in the spec
await expect(page.locator('.alert-success')).toBeVisible();
```

### 4.2 Locator priority

Use this order of preference:

1. `getByRole` / `getByLabel` / `getByText` / `getByPlaceholder` (ARIA-semantic)
2. `getByTestId` (`data-test` attributes)
3. CSS selectors scoped tightly (e.g. `app-header .badge`)
4. **Never** use XPath.
5. **Never** use position-based locators (`.nth(0)` to mean "the first result" is fine; `.nth(0)` to mean "the submit button" is not).

```typescript
// Preferred
this.submitButton = page.getByTestId('contact-submit');
this.successAlert = page.getByRole('alert').filter({ hasText: /message sent/i });

// Acceptable when data-test is absent
this.successAlert = page.locator('[class*="alert-success"]');

// Wrong — brittle class name with no scoping
this.successAlert = page.locator('.alert-success');
```

### 4.3 Actions belong in page objects

Any multi-step interaction on a single page (fill a form, click a button) should be a method on the page object. Specs call the method; they do not repeat the steps.

```typescript
// Correct — spec calls a page-object method
await contactPage.fillAndSubmit(VALID_PAYLOAD);

// Wrong — form filling inlined in the spec
await page.getByTestId('first-name').fill('Jane');
await page.getByTestId('last-name').fill('Doe');
// ...
```

### 4.4 The `navigate` method

Every page object must override `navigate()` with the correct path and a deterministic wait that proves the page is ready. Do **not** rely on `networkidle` if the page has polling activity.

```typescript
async navigate() {
  await this.page.goto('/contact', { waitUntil: 'load' });
  await this.firstNameInput.waitFor({ state: 'visible' });
}
```

---

## 5. Multi-page flows

Multi-step setup that crosses page boundaries (e.g. search → add to cart → go to cart) goes through `ShopFacade` in `common_actions/shop.facade.ts`. Do not copy such steps between spec files.

```typescript
// Correct
test.beforeEach(async ({ shopFacade }) => {
  await shopFacade.addToCartAndGoToCart(PRODUCTS.search.validKeyword);
});

// Wrong — duplicated setup steps inline
test.beforeEach(async ({ homePage, page }) => {
  await homePage.navigate();
  await homePage.searchFor('Pliers');
  // ...
});
```

---

## 6. Assertions

### 6.1 Use web-first expect

All element assertions must use `expect(locator, 'intent message').<web-first-matcher>()`. Web-first matchers (`toBeVisible`, `toHaveText`, `toHaveValue`, `toHaveCount`, `toHaveURL`) automatically retry until the condition is met or the timeout expires.

```typescript
// Correct
await expect(contactPage.successAlert, 'success banner should appear after valid submission').toBeVisible();

// Wrong — no intent message
await expect(contactPage.successAlert).toBeVisible();

// Wrong — checks existence, not state
expect(await contactPage.successAlert.isVisible()).toBe(true);
```

### 6.2 Assert outcomes, not visibility alone

Assert the value or content the user cares about whenever it is available. Reserve plain `.toBeVisible()` for cases where only presence is meaningful.

```typescript
// Preferred — asserts the actual error message
await expect(contactPage.getFieldError('first-name'), 'first name is required').toHaveText(/first name is required/i);

// Acceptable — presence is enough when content is non-deterministic
await expect(contactPage.successAlert, 'success banner should appear').toBeVisible();
```

### 6.3 Field-error assertions

Use the page object's error accessor (`getFieldError` or a named locator property), not a raw `getByTestId` call in the spec.

```typescript
// Correct
await expect(contactPage.getFieldError('first-name'), 'first name error should appear').toBeVisible();

// Wrong — raw locator in the spec
await expect(page.getByTestId('first-name-error'), 'first name error should appear').toBeVisible();
```

---

## 7. Waits

- **Never** use `waitForTimeout`. It makes tests slow and brittle.
- **Avoid** `networkidle` when the page has polling activity (live-chat widgets, analytics beacons). Use `waitUntil: 'load'` and then wait for a specific element instead.
- Wait for the element or network response that proves setup is complete.

```typescript
// Correct
await this.page.goto('/contact', { waitUntil: 'load' });
await this.firstNameInput.waitFor({ state: 'visible' });

// Wrong
await this.page.goto('/contact');
await this.page.waitForTimeout(2000);
```

---

## 8. Test independence

Each test must:

- Set up its own state (via `beforeEach`, the fixture, or the facade).
- Pass when run alone, in any order, and in parallel with other tests.
- Not depend on state left by a previous test.

```typescript
// Correct — each test navigates independently via beforeEach
test.beforeEach(async ({ contactPage }) => {
  await contactPage.navigate();
});

// Wrong — a test that relies on a previous test having run
test('CT02 ...', async ({ page }) => {
  // Assumes CT01 already filled the form
});
```

---

## 9. Test data

- Static, reusable data lives in `data/products.ts` or `data/users.ts`.
- Inline constants in a spec are acceptable for form payloads scoped to that spec (e.g. `VALID_PAYLOAD`).
- Data shared across multiple specs should be extracted to `data/`.
- Generate unique data (timestamp or UUID suffix) for anything that creates a persisted record.
- Never change the seeded demo user in `data/users.ts`.

---

## 10. Timeouts

- The global timeout is set in `playwright.config.ts` (15 s default).
- Increase a test timeout with `test.setTimeout()` only when the test genuinely takes longer (e.g. a slow confirmation email flow).
- A per-describe `test.setTimeout()` is acceptable when all tests in the describe block are slow for the same reason.
- Do **not** increase timeouts to hide flaky behaviour — fix the root cause instead.

---

## 11. Tags and suite assignment

| Tag | Meaning | CI gate |
|---|---|---|
| `@smoke` | One P1 journey per area | Every push/PR |
| `@regression` | All functional tests | PR to `main`, nightly |
| `@demo` | Workshop examples, not real tests | Never in CI |
| `@flaky` | Quarantined test | Excluded from gates |

- Every test has exactly one of these tags.
- Demo tests (`C99`-style workshop examples) use `@demo`, not `@regression`.

---

## 12. Navigation in tests

- Use page-object `navigate()` methods or `shopFacade` methods, not bare `page.goto()` calls in specs.
- Navigation via the UI (clicking a nav link) is a valid test approach **only** when the goal is to verify that navigation works. Use `page.goto()` for setup navigation.

```typescript
// Correct — testing that the nav link works
test('CT07 contact page is reachable via nav link @smoke', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-contact').click();
  await expect(page).toHaveURL(/\/contact/);
});

// Wrong — using a nav link for setup (slower and fragile)
test.beforeEach(async ({ page }) => {
  await page.getByTestId('nav-contact').click();
});
```

---

## 13. TypeScript

- Run `npx tsc --noEmit` after every change.
- Do not use `any`. Use explicit types or `unknown`.
- Page object constructor parameters are `readonly`.
