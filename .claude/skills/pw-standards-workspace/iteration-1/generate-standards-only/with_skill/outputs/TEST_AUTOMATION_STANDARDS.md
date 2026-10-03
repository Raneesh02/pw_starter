# Test Automation Coding Standards — Practice Software Testing Shop

> Companion to `TEST_STRATEGY.md` (scope, coverage, suites) and `CLAUDE.md` (commands, architecture).
> This document covers **how to write test code**. Read `TEST_STRATEGY.md` first when adding or
> restructuring tests. Last updated: 2026-09-27.

---

## 1. Overview

This project is a Playwright + TypeScript end-to-end test suite for the public demo shop at
https://practicesoftwaretesting.com. The test framework is structured in layers so that changes
to the application UI require edits in at most one place, and so that any test can run alone, in
any order, and in parallel without side effects.

These standards exist to enforce those properties. Every rule below has a one-sentence rationale.
A reviewer seeing a violation should be able to trace it back to a section here.

---

## 2. Architecture quick-reference

```
tests/            Specs grouped by feature. Assert behaviour. Import test/expect from fixtures/.
pages/            Page objects. Own all locators and single-page actions for one URL.
common_actions/   ShopFacade. Owns multi-page flows (search → add to cart → checkout).
fixtures/         Wires page objects and the facade into Playwright's test context.
data/             Static constants (PRODUCTS, USERS). Never hard-code inputs in specs.
utils/            Pure helpers only (e.g. parseCurrency). No UI interaction here.
```

**Dependency direction**: specs → fixtures → pages / facade → Playwright  
No layer may import from a layer above it (e.g. a page object must not import a spec).

**The one import rule**: every spec file begins with:

```ts
import { test, expect } from '../../fixtures';
```

Never import `test` or `expect` directly from `@playwright/test` in a spec. Importing from the
fixtures entry point guarantees that every test receives the injected page objects and facade. If
you bypass this, the typed fixtures are absent and Playwright uses plain `page` only.

---

## 3. Page Objects

### 3.1 Class structure

Page objects are plain TypeScript classes. They hold locators as `readonly` properties and
expose methods for single-page actions. `ContactPage` is the canonical model to follow — it
extends `BasePage` and calls `super(page)`, giving it the inherited `page` property and the
`navigate()` override pattern:

```ts
export class MyPage extends BasePage {
  readonly myInput: Locator;

  constructor(page: Page) {
    super(page);
    this.myInput = page.getByLabel('My field');
  }

  async navigate() {
    await this.page.goto('/my-path', { waitUntil: 'load' });
    await this.myInput.waitFor({ state: 'visible' });
  }
}
```

**Known issue to address**: `HomePage`, `CartPage`, `CheckoutPage`, and `ProductPage` do not
extend `BasePage` — they each declare their own `readonly page: Page`. Migrate them to extend
`BasePage` when touching those files, so the constructor pattern and `navigate()` contract are
consistent. (TEST_STRATEGY §11 tracks the broader set of issues.)

### 3.2 Locator priority

Use locators in this order. Stop at the first one that uniquely identifies the element:

| Priority | Strategy | Example |
|---|---|---|
| 1 — Semantic (preferred) | `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText` (exact) | `page.getByRole('button', { name: 'Add to cart' })` |
| 2 — Test ID | `getByTestId` / `[data-test=...]` | `page.getByTestId('login-submit')` |
| 3 — CSS class or attribute | CSS selector as a last resort | `page.locator('.alert-success')` |
| Never | XPath | — |
| Never | DOM position (`nth`, `:first-child`) as a stable identity | — |

Semantic locators survive HTML refactors and communicate intent. Test-ID attributes are a
reliable fallback because they are explicit testing contracts. CSS class names break whenever a
designer renames a class.

**Known issue to address**: `ShopFacade.addToCart()` and `HomePage.productCards` use class-name
selectors (`[class="card skeleton"]`, `[class*="card"]`). Replace them with role- or test-ID
locators or wait for the product heading instead.

### 3.3 Where locators live

All locators belong in a page object. A spec must never build a raw locator with `page.locator()`
or `page.getByRole()`. If a spec needs an element, add a property or method to the relevant page
object and use that. This ensures that if the selector changes, the fix is in one file.

**Known issue to address**: `C01`, `C02`, `C05`, `CH02`, `CH06` build raw locators inside the
spec body. Move them into `CartPage` or `CheckoutPage`.

### 3.4 Method naming

- Action methods are imperative verbs: `fillAddress`, `continueAsGuest`, `proceedToCheckout`.
- Locator-returning methods use the `get` prefix: `getItemQuantityInput(name)`,
  `getProductCardNames()`.
- Avoid `click` as a method name unless the page object genuinely has nothing else to do. Prefer
  names that describe the user intent: `submitForm()`, not `clickSubmitButton()`.

### 3.5 `navigate()` pattern

Every page object that owns a URL must implement `navigate()`. Do not use `networkidle` in new
code — some pages (e.g. the contact page) have widgets that poll continuously and will never
settle. Instead, use a lower load state and then wait for a key element:

```ts
// Correct
async navigate() {
  await this.page.goto('/contact', { waitUntil: 'load' });
  await this.firstNameInput.waitFor({ state: 'visible' });
}

// Wrong — BasePage does this and it is a known issue
async navigate(path = '/') {
  await this.page.goto(path);
  await this.page.waitForLoadState('networkidle');
}
```

**Known issue to address**: `BasePage.navigate()` calls `waitForLoadState('networkidle')`. When
you extend `BasePage`, always override `navigate()` with an element-scoped wait.

### 3.6 Typed parameters for complex form inputs

When a method accepts a group of related fields, define and export a named interface rather than
an anonymous object type. `CheckoutPage` already does this correctly:

```ts
export interface AddressData { country: string; postalCode: string; /* ... */ }
export interface PaymentData { method: 'Bank Transfer' | 'Credit Card' | /* ... */ ; /* ... */ }
```

Exporting interfaces lets specs import only the types they need and gives callers auto-complete
and compile-time safety for union fields like `method`.

---

## 4. Shared Actions / Facade

`ShopFacade` (`common_actions/shop.facade.ts`) owns every flow that touches more than one page.
Its constructor receives already-created page objects from the fixture, so it does not create
duplicates.

### 4.1 When to use the facade vs a page object

- Use a **page object method** when the action stays on one page (fill a form, click a button,
  read a value).
- Use the **facade** when the action crosses pages (search on home, open product, add to cart,
  navigate to cart/checkout).

### 4.2 Adding a new multi-page flow

Add a method to `ShopFacade`. Compose it from existing page object methods; do not call `page`
directly unless no page object covers the step. Keep the method signature as minimal as possible:
accept typed data objects (like `AddressData`) rather than a long list of positional strings.

### 4.3 Anti-pattern: duplicating facade logic in `utils/`

**Known issue to address**: `utils/helpers.ts` exports `addProductToCart` and `loginViaUI`, which
duplicate logic already in `ShopFacade`. This creates two sources of truth for the same flow and
means that a fix in one place does not fix the other. Delete `addProductToCart` and `loginViaUI`
from `utils/helpers.ts`; keep only pure helpers like `parseCurrency` there. All UI flows go
through the facade.

---

## 5. Fixtures

`fixtures/index.ts` re-exports `test` (extended) and `expect` (pass-through). It is the single
import point for all specs.

### 5.1 Registering a new page object

Add the type to the `TestFixtures` interface and add a factory to `base.extend`:

```ts
type TestFixtures = {
  // existing ...
  myPage: MyPage;
};

export const test = base.extend<TestFixtures>({
  // existing ...
  myPage: async ({ page }, use) => {
    await use(new MyPage(page));
  },
});
```

### 5.2 Fixture scope

All fixtures here are **test-scoped** (the default). Each test gets a fresh instance. This means
that state set on a page object in one test cannot bleed into another test — which is correct and
intentional.

### 5.3 How the facade shares instances

The `shopFacade` fixture receives `homePage`, `checkoutPage`, and `productPage` from the fixture
system, so the facade and the spec share the same instances. Do not pass `page` and create new
page objects inside the facade's own methods.

---

## 6. Test Specs

### 6.1 Import line

```ts
import { test, expect } from '../../fixtures';
```

Adjust the relative path depth to match the spec's location under `tests/`.

### 6.2 Test title format

```
<ID> <description> <@tag>
```

Examples: `C03 increase item quantity @regression`, `CH01 happy path checkout as guest @regression`

| Component | Rule |
|---|---|
| ID | Unique, never reused. Prefix by area: `P` product, `C` cart, `CH` checkout, `A` auth, `AC` account. |
| Description | Short imperative phrase describing the behaviour under test, not the steps. |
| Tag | At least one of: `@smoke`, `@regression`, `@demo`, `@flaky`. Workshop or illustrative tests use `@demo`; they are excluded from CI runs. |

**Known issue to address**: `C99` in `cart_static_checks.spec.ts` is tagged `@regression`. Retag
it `@demo` so it is not gated in CI.

### 6.3 `test.describe` name convention

Use the feature name as the `describe` block name (e.g. `'Cart'`, `'Checkout'`, `'Product'`).
This groups results in the HTML report and makes `--grep` patterns predictable.

### 6.4 `beforeEach` — what belongs there

Put only setup that every test in the describe block requires. Navigation and shared state
initialization (via the facade) belong here. Assertions do not.

### 6.5 Sharing state between `beforeEach` and the test body

Declare a `let` variable before the describe block (or at the top of the describe block) and
assign it inside `beforeEach`:

```ts
test.describe('Cart', () => {
  let itemName = '';

  test.beforeEach(async ({ shopFacade }) => {
    itemName = await shopFacade.addToCartAndGoToCart(PRODUCTS.search.validKeyword);
  });

  test('C03 increase item quantity @regression', async ({ cartPage }) => {
    const input = cartPage.getItemQuantityInput(itemName);
    // ...
  });
});
```

### 6.6 `test.setTimeout` override pattern

When one test in a suite legitimately needs more time, override at the test level:

```ts
test('CH01 happy path checkout as guest @regression', async ({ checkoutPage }) => {
  test.setTimeout(30_000);
  // ...
});
```

Do not increase the global timeout in `playwright.config.ts` for one slow test.

### 6.7 No raw locators in specs

If you find yourself writing `page.locator(...)`, `page.getByRole(...)`, or
`page.getByTestId(...)` directly inside a spec body, stop. Add a property or method to the
appropriate page object and use that instead.

---

## 7. Assertions

### 7.1 Web-first `expect(locator, 'intent message')`

Always pass the locator itself to `expect`, not the result of an `await` call on it. This gives
Playwright auto-retry over its default timeout:

```ts
// Correct — web-first, auto-retries
await expect(cartPage.cartTotal, 'cart total should update after quantity change')
  .not.toHaveText(before ?? '');

// Wrong — await resolves once, no retry
expect(await cartPage.cartTotal.textContent()).not.toBe(before);
```

The second argument (the intent message) is required when the failure message from Playwright
alone would not explain why the assertion matters. Write it as "should \<state that is expected\>",
focusing on the business outcome, not the element name.

### 7.2 Assert real outcomes, not just visibility

Asserting `.toBeVisible()` proves only that an element is rendered, not that it contains the
correct value. Assert the actual outcome the user cares about:

| Situation | Weak assertion | Strong assertion |
|---|---|---|
| Sort by price | `await expect(cards.first()).toBeVisible()` | Assert prices are in ascending order |
| Cart total | `await expect(total).toBeVisible()` | `toHaveText` / `not.toHaveText` with the expected value |
| Order confirmation | `await expect(banner).toBeVisible()` | Also check `[data-test="order-confirmation"]` contains an order number |

**Known issue to address**: `P05` and `P06` only check that the first card is visible after
sorting. They should read and compare the sorted values (TEST_STRATEGY §11 issue 1).

### 7.3 Anti-patterns

- **Broad regex assertions**: `/required|invalid/i` and `/invalid|declined|error/i` can match
  unrelated page text. Use the specific `data-test` error element for each field instead.
  (TEST_STRATEGY §11 issues 3 and 4 — `CH02`, `CH03`, `CH04`.)
- **Non-web-first count**: `expect(await locator.count()).toBeGreaterThan(0)` does not retry.
  Use `expect(locator).not.toHaveCount(0)` or `toHaveCount(n)`.
- **Visibility-only checks on dynamic content**: prove that the right data loaded, not just
  that something appeared.

---

## 8. Waits

### 8.1 Never `waitForTimeout`

`waitForTimeout` is a fixed sleep. It makes the suite slow when everything is fine and flaky when
the system is slower than expected. There is no legitimate use in production test code. Use it
only as a temporary diagnostic aid and remove it before committing.

### 8.2 Avoid `networkidle`

`networkidle` waits until there are no in-flight network requests for 500 ms. Pages that poll
for live data (chat widgets, analytics) never reach `networkidle`. Use a lower load state plus an
element-scoped wait instead:

```ts
// Wrong
await this.page.waitForLoadState('networkidle');

// Correct
await this.page.goto('/path', { waitUntil: 'load' });
await this.keyElement.waitFor({ state: 'visible' });
```

**Known issue to address**: `BasePage.navigate()`, `ShopFacade.addToCart()`, and
`utils/helpers.ts` all call `waitForLoadState('networkidle')`. Replace each with an
element-scoped wait.

### 8.3 Preferred wait patterns

| Situation | Pattern |
|---|---|
| Wait for an element to appear | `await locator.waitFor({ state: 'visible' })` |
| Wait for an element to disappear (e.g. loading skeleton) | `await locator.waitFor({ state: 'hidden' })` |
| Wait for navigation or a redirect | `await page.waitForURL(/pattern/)` |
| Wait for an API call to complete before asserting | `await page.waitForResponse(url => url.includes('/api/'))` |
| Wait for URL change after a form submit | `await expect(page).toHaveURL(/expected-path/)` |

---

## 9. Test Data

### 9.1 Static constants

All static inputs live in `data/`:

- `data/products.ts` — search keywords, category names, sort keys. Update this if the live
  catalog changes.
- `data/users.ts` — the seeded demo customer account. Never change the password or profile of
  the seeded account; it is shared by everyone who uses the demo site.

Import constants by name:

```ts
import { PRODUCTS } from '../../data/products';
import { USERS } from '../../data/users';
```

### 9.2 Inline data to move to `data/`

**Known issue to address**: `ADDRESS` and `PAYMENT` are declared as inline `const` objects inside
`checkout.spec.ts`. Move them into `data/` so other specs can reuse them without copying.

### 9.3 Uniqueness rule for data tests create

Any data created during a test (registrations, form submissions) must use a unique suffix so that
parallel runs do not collide:

```ts
const email = `test+${Date.now()}@example.com`;
const username = `user_${Math.random().toString(36).slice(2, 8)}`;
```

A timestamp is usually sufficient. Use a random suffix when multiple tests in the same parallel
batch might run within the same millisecond.

### 9.4 Do not mutate seeded accounts

Do not change the email, password, name, or address of the account in `data/users.ts`. It is
shared by every workshop participant and by every CI run. If a test needs to change profile data,
register a new account with a unique email.

---

## 10. TypeScript

### 10.1 `strict: true` is on

`tsconfig.json` enables `"strict": true`. This means no implicit `any`, no missing `undefined`
checks, and no unchecked index access (strict null checks). Do not disable or suppress these
without a documented justification in a comment.

### 10.2 Run `tsc --noEmit` after every change

```bash
npx tsc --noEmit
```

A type error caught here costs seconds. The same error found during a CI run costs minutes. Make
this the last step before committing any TypeScript change. The CI pipeline also runs it before
the smoke suite (TEST_STRATEGY §8).

### 10.3 Export named interfaces for complex parameter types

When a method accepts a group of related fields (a form, an address, a payment), define a named
interface and export it from the page object file. Callers can then import only the type they
need and get compile-time validation of the shape. See `AddressData` and `PaymentData` in
`pages/checkout.page.ts` as the reference pattern.

### 10.4 No `any` without justification

`any` disables type checking for that value and its descendants. If you genuinely need to escape
the type system (parsing an API response, a legacy Playwright helper), add a comment explaining
why and narrow the type as soon as possible.

---

## 11. Code Review Checklist

Use this table when reviewing a pull request that adds or modifies test code. "Good pattern"
shows what to expect; "anti-pattern" shows what to flag.

| # | Check | Good pattern | Anti-pattern |
|---|---|---|---|
| 1 | Import source | `import { test, expect } from '../../fixtures'` | `import { test } from '@playwright/test'` |
| 2 | Test title format | `C03 increase item quantity @regression` | `'should increase quantity'` (no ID, no tag) |
| 3 | ID uniqueness | New ID not in the suite | ID reused from an existing test |
| 4 | Tag validity | `@smoke`, `@regression`, `@demo`, or `@flaky` | No tag, or `@regression` on a workshop demo |
| 5 | Locators in page objects | `cartPage.getItemQuantityInput(name)` | `page.locator('[data-test="quantity"]')` inside a spec |
| 6 | Locator strategy | `getByRole`, `getByLabel`, `getByTestId` | XPath, positional selectors, exact class-name match |
| 7 | Wait pattern | `await locator.waitFor({ state: 'visible' })` | `await page.waitForTimeout(1000)` or `networkidle` |
| 8 | Assertion style | `await expect(locator, 'message').toHaveText(...)` | `expect(await locator.textContent()).toBe(...)` |
| 9 | Assertion strength | Checks value, count, or order | Only checks `.toBeVisible()` on dynamic content |
| 10 | Error assertions | Assert specific `data-test` error element | Broad regex that can match unrelated text |
| 11 | Multi-page setup | Calls `shopFacade` method | Copies steps from another spec inline |
| 12 | Static test data | Uses constant from `data/` | Inline `const ADDRESS = { ... }` inside a spec |
| 13 | Unique generated data | Uses timestamp or random suffix | Hard-coded email or username (breaks parallel runs) |
| 14 | TypeScript | `npx tsc --noEmit` passes | `any` without comment; compile errors present |
| 15 | Test independence | Sets up its own state in `beforeEach` | Relies on another test having run first |

---

## Appendix: Known issues in the existing codebase

The following known issues are tracked in TEST_STRATEGY §11. Do not "fix" them without reading
that section first — some are intentional limitations or have a specific fix already agreed on.

| Issue | Location | Standard violated |
|---|---|---|
| `networkidle` in `BasePage.navigate()` | `pages/base.page.ts` | §8.2 |
| `networkidle` in `ShopFacade.addToCart()` | `common_actions/shop.facade.ts` | §8.2 |
| `networkidle` in `utils/helpers.ts` | `utils/helpers.ts` | §8.2 |
| Class-name locator `[class="card skeleton"]` | `common_actions/shop.facade.ts` | §3.2 |
| Raw locators inside spec bodies | `cart.spec.ts` C01, C02, C05; `checkout.spec.ts` CH02, CH06 | §3.3, §6.7 |
| Broad regex error assertions | `checkout.spec.ts` CH02, CH03 | §7.3 |
| Sort tests assert only visibility | `product.spec.ts` P05, P06 | §7.2 |
| `CartPage.navigate()` goes to `/checkout` | `pages/cart.page.ts` | §3.5 |
| `ADDRESS` / `PAYMENT` inline in spec | `checkout.spec.ts` | §9.2 |
| `addProductToCart` / `loginViaUI` duplicate facade | `utils/helpers.ts` | §4.3 |
| Page objects do not extend `BasePage` | `home.page.ts`, `cart.page.ts`, `checkout.page.ts`, `product.page.ts` | §3.1 |
| `C99` tagged `@regression` | `cart_static_checks.spec.ts` | §6.2 |
