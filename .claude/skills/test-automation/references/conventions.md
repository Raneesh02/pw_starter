# Conventions Reference

Quick-lookup summary of this repo's testing architecture. This file summarizes `CLAUDE.md`'s Architecture/Conventions sections for fast in-skill reference — `CLAUDE.md` stays authoritative; update both if conventions change.

## Fixtures — `fixtures/index.ts`

Entry point for every spec. Extends Playwright's `test` with auto-injected fixtures and re-exports `expect`. Current fixtures: `homePage`, `cartPage`, `checkoutPage`, `productPage`, `contactPage`, `shopFacade`.

To add a new page object as a fixture:

```typescript
// 1. type
type TestFixtures = {
  // ...existing...
  contactPage: ContactPage;
};

// 2. registration
contactPage: async ({ page }, use) => {
  await use(new ContactPage(page));
},
```

Specs must import from `../../fixtures`, never `@playwright/test` directly.

## Page objects — `pages/`

One class per page (`home.page.ts`, `cart.page.ts`, `checkout.page.ts`, `product.page.ts`, `contact.page.ts`). Each class holds **only**:

- readonly `Locator` properties, built in the constructor
- low-level action methods (e.g. `fillForm`, `submit`, `searchFor`)

`base.page.ts` provides a shared `navigate()` for simple path navigation with `waitForLoadState('networkidle')`. Page-specific `navigate()` overrides are fine when the path is fixed (see `contact.page.ts`).

Locator priority: `getByRole` / `getByLabel` / `getByText` first; `[data-test="..."]` only as fallback for elements without accessible roles.

Example (`pages/contact.page.ts`):

```typescript
export class ContactPage {
  readonly firstNameInput: Locator;
  readonly submitButton: Locator;
  readonly successAlert: Locator;

  constructor(page: Page) {
    this.firstNameInput = page.locator('[data-test="first-name"]');
    this.submitButton = page.locator('[data-test="contact-submit"]');
    this.successAlert = page.getByText('Thanks for your message! We will contact you shortly.');
  }

  async fillForm(data: ContactFormData) {
    /* ... */
  }
  async submit() {
    await this.submitButton.click();
  }
}
```

## Facade — `common_actions/shop.facade.ts`

`ShopFacade` composes page objects into cross-page workflows reused across spec files (`addToCart`, `addToCartAndGoToCart`, `addToCartAndGoToCheckout`, `fullGuestCheckout`). Use the facade for multi-step setup in `beforeEach` rather than duplicating a flow inline in a spec. A workflow belongs in the facade when more than one spec file needs the same multi-page sequence; a single spec's own setup can stay in that spec's `beforeEach` calling page-object methods directly.

## Data files — `data/`

Plain exported const objects, one per domain, kept out of specs: `PRODUCTS`, `USERS`, `CONTACT`. No logic — just data.

```typescript
export const CONTACT = {
  subjects: { return: 'return' /* ... */ },
  valid: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    subject: 'return',
    message: '...',
  },
  invalidEmail: 'not-an-email',
  shortMessage: 'Too short',
};
```

## Specs — `tests/<feature>/*.spec.ts`

One folder per feature (`tests/cart/`, `tests/checkout/`, `tests/product/`, `tests/contact/`). One `test.describe` per feature file. `beforeEach` sets up state via `shopFacade`/fixtures — never by depending on another test's execution order.

Test IDs currently in use (check the relevant spec file for the last number used before adding a new one — don't hardcode from memory):

| Prefix | Feature  |
| ------ | -------- |
| `C`    | Cart     |
| `CH`   | Checkout |
| `CT`   | Contact  |
| `P`    | Product  |

Every test title: `"<ID> <short description> @regression"`, e.g. `test('CT01 submitting empty form shows required field errors @regression', ...)`.

Assertions (web-first, e.g. `await expect(locator).toBeVisible()`) live in the spec. Locators/actions live in the page object. Never use `waitForTimeout`.

## Parameterized tests

Not commonly used yet, but the pattern is documented in `reference/reference.md`: define cases as an array in a `data/*.ts` file (each with an explicit `id`, not relying on array index), then loop with `for...of` inside `test.describe`, generating one `test()` per case still calling page-object/facade methods inside the loop body. See that file for the full example — don't duplicate it here.
