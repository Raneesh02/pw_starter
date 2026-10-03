# Test Automation Standards
## Practice Software Testing — Playwright + TypeScript Framework

**Last updated:** 2026-09-27  
**Applies to:** All tests in `tests/`, page objects in `pages/`, and shared helpers in `common_actions/` and `utils/`.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Imports and Fixtures](#3-imports-and-fixtures)
4. [Test ID and Naming Conventions](#4-test-id-and-naming-conventions)
5. [Tags and Suite Membership](#5-tags-and-suite-membership)
6. [Locator Strategy](#6-locator-strategy)
7. [Page Objects](#7-page-objects)
8. [ShopFacade and Multi-Step Setup](#8-shopfacade-and-multi-step-setup)
9. [Assertions](#9-assertions)
10. [Waiting and Synchronisation](#10-waiting-and-synchronisation)
11. [Test Independence and Parallelism](#11-test-independence-and-parallelism)
12. [Test Data](#12-test-data)
13. [TypeScript Usage](#13-typescript-usage)
14. [Configuration and Environment](#14-configuration-and-environment)
15. [CI/CD Expectations](#15-cicd-expectations)
16. [Defect and Flakiness Management](#16-defect-and-flakiness-management)
17. [Anti-Patterns Reference](#17-anti-patterns-reference)

---

## 1. Project Overview

This framework drives end-to-end browser tests for the public demo shop at `https://practicesoftwaretesting.com`. Tests are written in TypeScript and run with Playwright against Chromium.

The authoritative source for **scope, priority, and coverage gaps** is `TEST_STRATEGY.md` at the repo root. Read it before adding or reorganising tests.

---

## 2. Directory Structure

```
tests/           Spec files, one directory per feature: product/, cart/, checkout/
pages/           Page object classes — locators and single-page actions only
common_actions/  ShopFacade — multi-page flows that set up state for specs
fixtures/        Custom test() and expect() that inject page objects and the facade
data/            Static constants: PRODUCTS, USERS
utils/           Pure helpers with no Playwright side-effects (e.g. parseCurrency)
```

**Rules:**

- A spec file lives under the feature directory that matches its test ID prefix (`C` → `cart/`, `P` → `product/`, `CH` → `checkout/`).
- New areas get their own directory: `auth/` for `A`-prefixed tests, `account/` for `AC`-prefixed tests.
- `utils/helpers.ts` is for pure functions only. Do not add Playwright `Page` logic there; that belongs in `ShopFacade` or a page object.

---

## 3. Imports and Fixtures

**Always** import `test` and `expect` from `../../fixtures`, never from `@playwright/test` directly in a spec file.

```typescript
// CORRECT
import { test, expect } from '../../fixtures';

// WRONG — bypasses injected page objects
import { test, expect } from '@playwright/test';
```

The custom `test` in `fixtures/index.ts` injects:
- `homePage` — `HomePage`
- `cartPage` — `CartPage`
- `checkoutPage` — `CheckoutPage`
- `productPage` — `ProductPage`
- `contactPage` — `ContactPage`
- `shopFacade` — `ShopFacade`

Use these injected fixtures rather than constructing page objects manually inside tests.

When adding a new page object:
1. Create the class in `pages/<name>.page.ts`.
2. Import it in `fixtures/index.ts`.
3. Add it to the `TestFixtures` type and the `base.extend` call.

---

## 4. Test ID and Naming Conventions

Every test title must follow this pattern:

```
<ID> <description in plain English> @<tag>
```

Examples:
```
C03 increase item quantity @regression
CH01 happy path checkout as guest @regression
P07 click product navigates to detail page @regression
```

**Prefix map:**

| Prefix | Area |
|--------|------|
| `P` | Product discovery (search, filter, sort, detail page) |
| `C` | Cart (add, update, remove, totals) |
| `CH` | Checkout (guest flow, payment methods, validation) |
| `A` | Authentication (login, logout, registration) |
| `AC` | Customer account (profile, orders, favourites) |

**Rules:**

- IDs are unique across the entire suite and are never reused, even after a test is deleted.
- Keep a sequential counter per prefix (`C01`, `C02`, … `C07`, then `C08` next).
- The description uses sentence case and describes what the test proves, not how it does it.
- Do not embed implementation details (locator names, method names) in the description.

---

## 5. Tags and Suite Membership

Every test must carry at least one suite tag at the end of its title.

| Tag | Suite | When it runs |
|-----|-------|--------------|
| `@smoke` | Smoke — one P1 journey per area | Every push and pull request |
| `@regression` | Regression — all functional tests | PR to `main`, nightly |
| `@demo` | Workshop examples, not real tests | Never in CI |
| `@flaky` | Quarantined tests | Excluded from gating suites |

A test may carry more than one tag (e.g. `@smoke @regression`).

`C99` in `cart_static_checks.spec.ts` is tagged `@demo`. It must not carry `@regression`.

---

## 6. Locator Strategy

Use locators in this order of preference:

1. **Semantic role + name** — `getByRole`, `getByLabel`, `getByText` (for user-visible text)
2. **Data test attribute** — `[data-test="..."]` when a semantic selector is not available
3. **CSS class or element** — only as a last resort; never depend on implementation-specific class names like `card skeleton`

**Never use:**

- XPath
- Position-based selectors (`.nth(0)` is allowed, `.nth(0).locator('..').locator('..')`-style chains are fragile — use a named parent instead)
- Class names that reflect internal framework state (e.g. `card skeleton`, Angular component wrappers like `app-address` as a primary selector)

**Examples:**

```typescript
// CORRECT — semantic role
page.getByRole('button', { name: 'Proceed to checkout' })

// CORRECT — data-test attribute
page.locator('[data-test="add-to-cart"]')

// ACCEPTABLE — combining role with filter
page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') })

// WRONG — class name that encodes internal state
page.locator('[class="card skeleton"]')

// WRONG — XPath
page.locator('//div[@class="product"]//button')
```

All locators belong in the page object for that page. A spec must not define its own raw locators. If a spec needs a locator that the page object does not expose, add a property or method to the page object.

---

## 7. Page Objects

### Structure

Every page object extends `BasePage` or holds a `Page` reference as a `readonly` property.

```typescript
import { Page, Locator } from '@playwright/test';

export class MyPage {
  readonly page: Page;
  readonly someButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.someButton = page.getByRole('button', { name: 'Do Something' });
  }

  async doSomething(): Promise<void> {
    await this.someButton.click();
  }
}
```

### Rules

- Declare all stable locators as `readonly` properties in the constructor so they are defined in one place.
- Use methods for actions (sequences of locator interactions). Methods may accept parameters.
- Do not add assertions (`expect`) to page objects. Assertions belong in specs.
- Do not navigate to external URLs from a page object; navigation belongs in `BasePage.navigate()` or in `ShopFacade`.
- Keep method names as verbs: `fillAddress`, `continueAsGuest`, `proceedToCheckout`.
- Use TypeScript interfaces for structured data passed to page methods (see `AddressData`, `PaymentData` in `checkout.page.ts`).

### BasePage

`BasePage` provides a `navigate(path)` method. Subclass or compose it for pages that have a known path:

```typescript
async navigate() {
  await this.page.goto('/cart');
}
```

Do not override `navigate()` to go to a different path than the page's canonical URL. The current mismatch in `CartPage.navigate()` (which goes to `/checkout`) is a tracked bug — see `TEST_STRATEGY.md §11, issue 7`.

---

## 8. ShopFacade and Multi-Step Setup

`ShopFacade` in `common_actions/shop.facade.ts` is the single place for multi-page flows that set up state before a test's first assertion.

Use the facade for any setup that spans more than one page or more than a single click. Do not duplicate setup steps between spec files.

**Available methods:**

| Method | What it does |
|--------|--------------|
| `addToCart(keyword)` | Searches, opens the first product, adds to cart |
| `addToCartAndGoToCart(keyword)` | Same, then navigates to `/cart` |
| `addToCartAndGoToCheckout(keyword)` | Same, then navigates to `/checkout` |
| `fullGuestCheckout(keyword, guest, address, payment)` | Complete guest checkout flow |

**Extending the facade:**

Add a new method when two or more specs need the same multi-page flow. Keep each method focused on a single logical journey. Document parameters with JSDoc if the method signature is not self-explanatory.

**Known issue:** `ShopFacade.addToCart` uses `waitForLoadState('networkidle')` and waits for the `card skeleton` class. These are fragile waits. The tracked fix (issue 9) is to wait for the product heading or the search API response. Until that fix lands, do not copy this pattern into new code.

---

## 9. Assertions

### Use web-first assertions

Always use Playwright's `expect` (imported from `fixtures/`). Prefer web-first matchers that retry automatically:

```typescript
// CORRECT — retries automatically
await expect(cartPage.cartTotal).toHaveText('$25.00');

// WRONG — point-in-time, no retry
const text = await cartPage.cartTotal.textContent();
expect(text).toBe('$25.00');
```

### Add an assertion message

Every `expect` call should carry a message that states the intent:

```typescript
await expect(cartPage.cartTotal, 'cart total should update after quantity change')
  .not.toHaveText(before ?? '');
```

The message appears in the failure report and answers the question "what was I trying to prove?"

### Assert the outcome, not visibility

Assert the value, count, or order that the user cares about — not merely that an element is visible:

```typescript
// CORRECT — asserts the actual outcome
await expect(cartPage.cartRows).toHaveCount(2);
await expect(productPage.productPrice).toHaveText('$12.99');

// TOO WEAK — only proves the element exists
await expect(productPage.productPrice).toBeVisible();
```

Use `toBeVisible()` only when the test is specifically about visibility (e.g. an element that should appear or disappear on interaction).

### Specific error assertions

Do not use broad regular expressions that can match unrelated text on the page:

```typescript
// WRONG — may match unrelated text
await expect(page.getByText(/required|invalid/i).first()).toBeVisible();

// CORRECT — targets the specific error element
await expect(page.locator('[data-test="country-error"]')).toHaveText('Country is required');
```

---

## 10. Waiting and Synchronisation

| Practice | Status |
|----------|--------|
| `waitForTimeout` | **Never use.** It makes tests slow and brittle. |
| `waitForLoadState('networkidle')` | **Avoid in new code.** The tracked fix replaces it with element- or response-based waits. |
| `waitForLoadState('domcontentloaded')` | Acceptable as a coarse gate when a more specific wait is not practical. |
| Wait for a specific element | **Preferred.** `await element.waitFor()`, or let a web-first assertion do the waiting. |
| Wait for a network response | **Preferred** for data-driven pages. `await page.waitForResponse(url => url.includes('/api/products'))` before asserting results. |

If you find yourself adding a sleep to make a test pass, that is a signal to find the real asynchronous boundary and wait for it explicitly.

---

## 11. Test Independence and Parallelism

Every test must:

- Create its own state in `beforeEach` (or in the test body itself).
- Pass when run alone (`npx playwright test --grep "<ID>"`).
- Pass in any order relative to other tests.
- Pass when run in parallel (the default configuration is `fullyParallel: true`).

**Consequences:**

- Do not share mutable state between tests via module-level `let` inside a `describe` block unless it is reset in `beforeEach`.
- Do not depend on the order of tests within a `describe`.
- Do not leave state in the demo site that a later parallel test might collide with. For actions that create persistent data (e.g. new user registrations), generate a unique value using a timestamp or random suffix.
- Do not modify the seeded customer account (`USERS.customer` in `data/users.ts`).

---

## 12. Test Data

### Sources

| Data | Location | Notes |
|------|----------|-------|
| Product keywords, categories, sort options | `data/products.ts` — `PRODUCTS` constant | Keep in sync with the live catalogue. |
| Seeded customer credentials | `data/users.ts` — `USERS.customer` | Shared by everyone on the demo. Never change the password or profile. |
| Guest details | `data/users.ts` — `USERS.guest` | Safe to reuse; guest accounts are stateless. |
| Shipping address, payment fixtures | Move from inline spec constants to `data/` | See `TEST_STRATEGY.md §6`. |
| Unique data (registrations, etc.) | Generate at runtime | `const email = \`test+\${Date.now()}@example.com\`` |

### Environment variables

- `BASE_URL` can be set in `.env` to override the default `https://practicesoftwaretesting.com`.
- Never commit secrets. `.env` is already in `.gitignore`.
- `auth.json` (written by `tests/auth.setup.ts`) must be added to `.gitignore` before the auth setup project is enabled.

### Data constants

Hardcoded strings that appear in more than one test belong in `data/`. Inline data that appears only once is acceptable but should still use a named constant (not a magic string) within that test or `describe` block.

---

## 13. TypeScript Usage

### Type-check before every run

```bash
npx tsc --noEmit
```

The suite must compile with zero errors before any test run. CI runs this step before the smoke suite.

### Typing rules

- Use `interface` for structured data objects (e.g. `AddressData`, `PaymentData`).
- Prefer `readonly` on page object properties that are set once in the constructor.
- Do not use `any`. Use `unknown` when the type is genuinely unknown and narrow it with a type guard.
- Do not suppress compiler errors with `// @ts-ignore` or `// @ts-expect-error` except as a last resort with a comment explaining why.
- Avoid implicit `any` from untyped function return values. Annotate the return type when TypeScript cannot infer it.

### Async / await

- All Playwright calls are async. Always `await` them.
- Mark test callbacks and page object methods `async` when they contain `await`.
- Never use `.then()` chaining on Playwright promises inside test code.

---

## 14. Configuration and Environment

`playwright.config.ts` is the single configuration file. Key settings:

| Setting | Value | Notes |
|---------|-------|-------|
| `testDir` | `./tests` | |
| `fullyParallel` | `true` | All tests run in parallel by default |
| `retries` | `0` locally, `1` in CI | A test that passes on retry is flaky |
| `timeout` | `15 000 ms` | Per-test timeout; do not increase for individual tests |
| `trace` | `retain-on-failure` locally, `on-first-retry` in CI | |
| `screenshot` | `only-on-failure` | |
| `baseURL` | `process.env.BASE_URL ?? 'https://practicesoftwaretesting.com'` | |

Do not increase the global `timeout` to make a slow test pass. Fix the test or the locator strategy.

Cross-browser and mobile projects (Firefox, WebKit, mobile viewport) are planned for nightly runs. Add them as additional Playwright `projects` entries, not by changing the default project.

---

## 15. CI/CD Expectations

The planned GitHub Actions workflow (`.github/workflows/playwright.yml`) runs in three modes:

| Trigger | Steps |
|---------|-------|
| Every push / PR | `npm ci` → `tsc --noEmit` → smoke suite (`@smoke`) |
| PR to `main` | + regression suite (`@regression`) on Chromium |
| Nightly | + smoke on Firefox, WebKit, and one mobile viewport |

**Always upload** `playwright-report/` and `test-results/` as CI artifacts.

`playwright.config.ts` should set `forbidOnly: !!process.env.CI` so that `test.only` accidentally left in the code causes CI to fail.

---

## 16. Defect and Flakiness Management

### Product bug in the application

1. Log the bug with the test ID, trace file, and screenshot.
2. Mark the test `test.fail()` with the issue link as a comment:
   ```typescript
   test.fail(); // Bug #42: checkout confirmation page is missing order number
   ```
   This keeps the suite green (a `test.fail()` that actually fails is reported as expected) while keeping the failure visible.
3. Remove `test.fail()` once the bug is fixed.

### Test bug

Fix it in the same sprint. Do not add retries or longer timeouts to paper over it.

### Flaky test

1. Add the `@flaky` tag to the test title.
2. Exclude `@flaky` from gating suites:
   ```bash
   npx playwright test --grep "@regression" --grep-invert "@flaky"
   ```
3. Fix the root cause within one week. If it cannot be fixed, delete the test and file a ticket.

### Skipping tests

Do not add `test.skip()` or `test.fixme()` without a linked issue number. A test that has been skipped for more than one sprint without a fix is a candidate for deletion.

---

## 17. Anti-Patterns Reference

The following patterns exist in the current codebase and should not be copied into new tests. They are listed with the `TEST_STRATEGY.md` issue number that tracks each fix.

| Anti-pattern | Example location | Issue |
|--------------|-----------------|-------|
| `waitForLoadState('networkidle')` | `ShopFacade.addToCart`, `BasePage.navigate`, `utils/helpers.ts` | #9 |
| Waiting for `[class="card skeleton"]` to hide | `ShopFacade.addToCart`, `utils/helpers.ts` | #9 |
| Building raw locators in a spec instead of using the page object | `cart.spec.ts C01, C02`, `checkout.spec.ts CH06` | #5 |
| Broad error regex (`/required\|invalid/`) that can match unrelated text | `checkout.spec.ts CH02, CH03` | #4 |
| Duplicate setup logic in `utils/helpers.ts` (`addProductToCart`, `loginViaUI`) | `utils/helpers.ts` | #8 |
| `@regression` tag on a demo test | `cart_static_checks.spec.ts C99` | #6 |
| Sort tests that only assert visibility, not sort order | `product.spec.ts P05, P06` | #1 |
| Back-navigation test that only asserts URL, not page content | `checkout.spec.ts CH05` | #2 |
| Redundant tests covering the same steps | `checkout.spec.ts CH01, CH04` | #3 |
| Locators defined inline in a spec (`page.locator(...)`) | `cart.spec.ts C02`, `checkout.spec.ts CH06` | #5 |

When you encounter one of these in code review, link to the issue rather than fixing it inline (unless fixing it falls within the current ticket's scope). When you write new code, none of these patterns are acceptable.
