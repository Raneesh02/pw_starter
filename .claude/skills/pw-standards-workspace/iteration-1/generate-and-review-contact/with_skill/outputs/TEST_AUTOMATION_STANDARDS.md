# Test Automation Coding Standards — Practice Software Testing Shop

> Companion to `TEST_STRATEGY.md` and `CLAUDE.md`. Those documents say *what* to
> test and why; this document says *how* to write the code that does it.
> Last updated: 2026-09-27

---

## 1. Overview

These standards apply to every file in `tests/`, `pages/`, `common_actions/`,
`fixtures/`, `data/`, and `utils/`. They exist to keep the suite readable by
anyone who joins the project, reliable under parallel execution, and maintainable
as the site under test evolves. Each rule here has a one-sentence rationale so a
reviewer understands the *why*, not just the *what*.

When a new pattern is introduced — a new page object, a new data file, a new
shared action — it must comply with these standards before it is merged.

---

## 2. Architecture quick-reference

```
fixtures/index.ts           Custom `test` entry point. Every spec imports from here.
                            Registers all page objects and the facade. Nothing else lives here.
     |
     +-- pages/*.page.ts    Page objects. Locators + single-page actions only.
     |                      Depends on: @playwright/test (Page, Locator).
     |
     +-- common_actions/    ShopFacade: multi-page flows (add-to-cart → checkout).
     |   shop.facade.ts     Depends on: page objects. Specs should not bypass this layer.
     |
     +-- data/              Static constants (PRODUCTS, USERS). Pure TypeScript objects.
     |                      No Playwright dependency. Shared by specs and the facade.
     |
     +-- utils/             Pure helpers only (e.g. parseCurrency).
                            Must not duplicate ShopFacade logic — if it spans pages, it
                            belongs in the facade, not here.
```

**Rule:** `test` and `expect` are always imported from `../../fixtures` (or `../fixtures`
from one directory up), never directly from `@playwright/test`. This ensures every
spec gets the injected page objects and facade via the custom fixture.

---

## 3. Page Objects

### Class structure

Every page object extends `BasePage`:

```ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class FooPage extends BasePage {
  readonly someElement: Locator;

  constructor(page: Page) {
    super(page);
    this.someElement = page.getByRole('button', { name: 'Submit' });
  }
}
```

Extending `BasePage` is mandatory — it provides the base `navigate()` pattern and
gives a consistent interface for future base-class capabilities. The `CartPage` and
other pages that do not extend `BasePage` are a **known issue to address** (see
TEST_STRATEGY §11, issue 5 area). `ContactPage` already follows the correct pattern.

Locators are declared as `readonly` class fields and assigned in the constructor.
This makes them immediately visible to TypeScript and avoids re-querying the DOM on
every reference.

### Locator priority (ordered)

Use the first strategy in this list that uniquely identifies the element:

| Priority | Strategy | Example |
|---|---|---|
| 1 | Semantic role | `page.getByRole('button', { name: 'Submit' })` |
| 2 | Label or placeholder | `page.getByLabel('Email address')` |
| 3 | Test-ID attribute | `page.getByTestId('contact-submit')` |
| 4 | CSS (stable, structural) | `page.locator('.alert-success')` |
| ❌ | XPath | Never. Brittle under DOM changes. |
| ❌ | Position-based | Never. `.nth(0)` by position is fragile. |

Semantic locators (role, label) are preferred because they test the same thing a
screen reader would see, making tests and accessibility checks complementary.
`data-test` attributes are the fallback when no semantic role applies. CSS class
names are acceptable only when they are stable, meaningful names (e.g. `.alert-success`),
not generated class hashes.

### Where locators live

**All locators belong in page objects, never in spec files.** A spec may call
`page.getByRole(...)` only to pass into a Playwright built-in (e.g. `page.goto`)
or when the element is navigation-plumbing that belongs in no page object (rare).
If a spec needs a locator, add it to the appropriate page object and expose it as
a field or method.

Reason: locators are the most brittle part of a UI test. Centralising them means a
single DOM change requires a fix in one place, not a search across every spec.

### Method naming conventions

- Verbs for actions: `fillAndSubmit`, `navigate`, `searchFor`, `filterByCategory`
- Nouns for locator-returning methods: `getItemQuantityInput(name)`, `getFieldError(testId)`
- Expose locators as `readonly` fields when the spec needs to assert on them directly:
  `successAlert`, `cartTotal`, `submitButton`

### `navigate()` pattern

```ts
async navigate() {
  await this.page.goto('/contact', { waitUntil: 'load' });
  await this.firstNameInput.waitFor({ state: 'visible' });
}
```

- Use `waitUntil: 'load'` (or `'commit'`) instead of the default, and then wait for
  a key element to be visible. This avoids the `networkidle` trap where continuously-
  polling widgets (chat, analytics) prevent the load state from resolving.
- `BasePage.navigate()` currently uses `networkidle` — this is a **known issue** (see
  TEST_STRATEGY §11, issue 9). New page objects should override `navigate()` with the
  pattern above, as `ContactPage` already does correctly.

### Typed parameters for complex form inputs

When a method accepts more than two form fields, use a named interface:

```ts
export interface ContactPayload {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}

async fillAndSubmit(data: ContactPayload) { … }
```

Interfaces live in the page-object file that owns them, and are re-exported from
there if other files need them (see `AddressData`, `PaymentData` in `checkout.page.ts`).

---

## 4. Shared Actions / Facade

`ShopFacade` (`common_actions/shop.facade.ts`) is the layer for multi-page flows —
sequences that touch more than one page object. Use it for:

- Adding a product to the cart from the home page
- Full guest checkout from start to confirmation
- Any future flow that requires coordinating two or more page objects

**When to use the facade vs a page object method:**

> If the action stays on one page, it belongs in the page object.
> If it navigates across pages, it belongs in the facade.

**How to add a new multi-page flow:**

1. Add a method to `ShopFacade` that composes the existing page-object methods.
2. Accept typed parameters where inputs are complex (use the interfaces from the page objects).
3. Return a meaningful value when the spec needs it (e.g. the product name after adding to cart).

**Anti-pattern — duplicating facade logic in `utils/helpers.ts`:**

`utils/helpers.ts` currently contains `addProductToCart` and `loginViaUI`, which
duplicate `ShopFacade` methods. This is a **known issue** (TEST_STRATEGY §11, issue 8).
The rule is: `utils/` holds pure, stateless helpers (`parseCurrency`). Functions that
drive a Playwright `page` object belong in the facade or a page object, not in `utils/`.

---

## 5. Fixtures

### How to register a new page object

1. Import the class into `fixtures/index.ts`.
2. Add it to the `TestFixtures` type.
3. Add a fixture entry that constructs it with the `page` fixture:

```ts
newPage: async ({ page }, use) => {
  await use(new NewPage(page));
},
```

### Fixture scope

All fixtures are test-scoped (the default). Each test gets a fresh page-object
instance backed by a fresh Playwright `page`. Do not use `scope: 'worker'` for page
objects — shared state between tests breaks parallel isolation.

### How the facade shares instances with specs

The facade is constructed in `fixtures/index.ts` with the same fixture instances
that are available to specs:

```ts
shopFacade: async ({ page, homePage, checkoutPage, productPage }, use) => {
  await use(new ShopFacade(page, homePage, checkoutPage, productPage));
},
```

This means `shopFacade.addToCart(...)` and `homePage.navigate()` within the same test
operate on the same `page` instance. Do not construct a second `ShopFacade` inside a
spec.

---

## 6. Test Specs

### Import line

```ts
import { expect, test } from '../../fixtures';
```

Never: `import { test, expect } from '@playwright/test';`

The custom `test` provides all the injected fixtures. The re-exported `expect` from
`@playwright/test` is passed through `fixtures/index.ts` so all assertions use the
same type-checked instance.

### Test title format

```
<ID> <description> <@tag>
```

Examples:
- `CT01 successful form submission shows confirmation @smoke`
- `C03 increase item quantity @regression`

**ID prefix map:**

| Prefix | Feature area |
|---|---|
| `P` | Product (search, filter, sort, detail) |
| `C` | Cart |
| `CH` | Checkout |
| `CT` | Contact |
| `A` | Authentication |
| `AC` | Customer account |

Rules:
- IDs are unique across the entire suite. Never reuse a retired ID.
- The description is a short verb phrase stating what the test proves.
- One tag per test minimum. Use `@smoke` for P1 journeys, `@regression` for all
  functional tests, `@demo` for workshop/training tests, `@flaky` for quarantined tests.

### `test.describe` name convention

Use the feature area name (not the page name): `'Contact'`, `'Cart'`, `'Checkout'`.

### `beforeEach` — what belongs there

`beforeEach` should hold navigation and setup that every test in the describe block
shares. It must not contain assertions. If only some tests need the setup, do it
inside those tests instead.

### How to share state between `beforeEach` and test body

Declare a mutable `let` variable above the describe block and assign it in `beforeEach`:

```ts
test.describe('Cart', () => {
  let itemName = '';

  test.beforeEach(async ({ shopFacade }) => {
    itemName = await shopFacade.addToCartAndGoToCart(PRODUCTS.search.validKeyword);
  });

  test('C03 increase item quantity @regression', async ({ cartPage }) => {
    const input = cartPage.getItemQuantityInput(itemName);
    // …
  });
});
```

### `test.setTimeout` override

Use `test.setTimeout(ms)` inside a `test.describe` block when a group of tests
legitimately needs more time (e.g. a form that waits for a server response).
Set it once at the describe level, not per-test, so the timeout is visible and
easy to find.

### Rule: no raw locators in specs

Specs must not call `page.locator(...)`, `page.getByRole(...)`, or similar to build
locators inline. If a spec needs to interact with an element, that element's locator
belongs in the relevant page object. This keeps the spec layer free of selector
knowledge.

---

## 7. Assertions

### Web-first `expect(locator, 'intent message')`

Always pass a locator to `expect`, not an awaited value:

```ts
// ✅ Web-first — Playwright retries until the condition is met
await expect(contactPage.successAlert, 'success banner should appear after valid submission').toBeVisible();

// ❌ Non-web-first — evaluated once, no retry
const text = await cartPage.cartTotal.textContent();
expect(text).toBe('$10.00');
```

Web-first assertions retry automatically until the timeout, which is why tests
are resilient to brief rendering delays. Non-web-first assertions fail on the first
check even if the DOM catches up a millisecond later.

### What "intent message" means

The second argument to `expect()` should state *what the user expects to be true*,
not what element is being checked:

```ts
// ✅ States intent
await expect(input, 'quantity input should reflect the new value').toHaveValue('3');

// ❌ States the element, not the intent
await expect(input, 'input value').toHaveValue('3');
```

### Assert real outcomes, not just visibility

Prefer asserting the value, count, or order that the user cares about:

```ts
// ✅ Asserts a real outcome
await expect(rows).toHaveCount(1);
await expect(cartTotal).toHaveText('$15.99');

// ❌ Asserts only that something rendered
await expect(confirmationSection).toBeVisible();
```

`.toBeVisible()` is acceptable as a secondary check when the element's mere presence
is the outcome (e.g. an error banner appearing). It is not acceptable as a substitute
for checking the value the user sees.

### Anti-patterns

| Anti-pattern | Why it fails | Correct approach |
|---|---|---|
| `expect(await locator.count()).toBe(1)` | Non-web-first, no retry | `expect(locator).toHaveCount(1)` |
| `expect(page.getByText(/error\|invalid/i))` | Broad regex matches unrelated text | Assert the specific `data-test` error element |
| `expect(locator).toBeVisible()` when the value matters | Confirms render, not correctness | `toHaveText(...)`, `toHaveValue(...)`, etc. |
| Assertion with no message | Hard to diagnose on failure | Always pass an intent message |

---

## 8. Waits

### Never `waitForTimeout`

```ts
// ❌ Never
await page.waitForTimeout(2000);
```

`waitForTimeout` is a fixed sleep. It either wastes time when the app is fast or
causes flakiness when it is slow. Use an element-scoped wait instead.

### Avoid `waitForLoadState('networkidle')`

`networkidle` waits until no network requests have fired for 500ms. Sites with
polling widgets (analytics, chat, live inventory) never reach this state, causing
the wait to hang until timeout. It is present in `BasePage.navigate()` and
`ShopFacade.addToCart()` — both are **known issues** (TEST_STRATEGY §11, issue 9)
to be fixed by waiting for the specific element or API response instead.

### Correct wait patterns

```ts
// ✅ Wait for a specific element to be ready
await this.firstNameInput.waitFor({ state: 'visible' });

// ✅ Wait for a navigation or URL change
await page.waitForURL(/\/contact/);

// ✅ Wait for a specific network response
const [response] = await Promise.all([
  page.waitForResponse(r => r.url().includes('/api/products') && r.status() === 200),
  homePage.searchFor('Pliers'),
]);
```

---

## 9. Test Data

### Where static constants live

- `data/products.ts` — search keywords, category names, sort keys
- `data/users.ts` — seeded demo customer account, guest credentials

Move inline `const ADDRESS` and `const PAYMENT` objects from `checkout.spec.ts` into
`data/` — this is a **known issue** (TEST_STRATEGY §6).

Do not inline form-payload constants inside spec files when they are reused across
more than one test. Put them in `data/` and import them.

### Uniqueness rule

Any data the test *creates* (registrations, orders, custom content) must use a unique
suffix to avoid collisions in a parallel run:

```ts
const email = `user+${Date.now()}@example.com`;
const username = `tester_${Math.random().toString(36).slice(2, 8)}`;
```

### Do not mutate seeded accounts

The customer account in `data/users.ts` is shared by every developer and CI run.
Never change its email, name, or password inside a test. If a test needs an account
it can modify, create a new one at runtime with a unique identifier.

---

## 10. TypeScript

### `strict: true`

`tsconfig.json` has `"strict": true`. This catches null-safety bugs and missing type
annotations at compile time. Do not add `// @ts-ignore` or cast to `any` without a
documented reason.

### Run `npx tsc --noEmit` after every change

The CI pipeline runs the type-checker before the tests. A type error that sneaks
past review blocks the whole suite. Run it locally before committing.

### Export named interfaces for complex parameter types

When a method accepts an object with more than two properties, define and export a
named interface rather than using an inline object type:

```ts
// ✅ Named, reusable, self-documenting
export interface ContactPayload { … }
async fillAndSubmit(data: ContactPayload) { … }

// ❌ Inline object type — hard to reuse and verbose at call sites
async fillAndSubmit(data: { firstName: string; lastName: string; email: string; … }) { … }
```

---

## 11. Code Review Checklist

| # | Check | Good pattern | Anti-pattern |
|---|---|---|---|
| 1 | Import source | `from '../../fixtures'` | `from '@playwright/test'` |
| 2 | Test title format | `CT01 description @tag` | Missing ID, missing tag, or ID reuse |
| 3 | Tag value | `@smoke`, `@regression`, `@demo`, `@flaky` | Undefined tag; `@regression` on a demo test |
| 4 | Locators in spec | None — all in page objects | `page.locator(...)` built inline in a spec |
| 5 | Locator strategy | `getByRole` / `getByLabel` first | XPath; positional `.nth(n)` as identity |
| 6 | Page object base | Extends `BasePage` | Plain class without base |
| 7 | `navigate()` pattern | `goto` + element `waitFor` | Uses `networkidle` |
| 8 | Waits | Element-scoped; `waitForResponse` | `waitForTimeout`; `networkidle` |
| 9 | Assertion style | Web-first `expect(locator)` | `expect(await locator.method())` |
| 10 | Intent message | Second arg to `expect()` states why | Missing or states the element name only |
| 11 | Assertion depth | Asserts value/count/order | `.toBeVisible()` only when value matters |
| 12 | Error assertions | Specific `data-test` error element | Broad regex matching any text on the page |
| 13 | Multi-page setup | `ShopFacade` method | Inline copy of facade steps; `utils/helpers` |
| 14 | Test independence | Each test creates its own state | Depends on another test's side-effects |
| 15 | Unique data | Timestamp/random suffix for created data | Hardcoded unique values that collide in parallel |
