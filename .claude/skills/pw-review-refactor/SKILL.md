---
name: pw-review-refactor
description: Review and refactoring guidance for the pw_starter Playwright repo. Load this skill when asked to review a spec, page object, or any project file for correctness, convention adherence, or code quality. Also surfaces the known refactoring backlog catalogued from the initial codebase audit.
---

# Review & Refactor Guide — pw_starter

This skill drives code review and refactoring for the `pw_starter` Playwright +
TypeScript repo. The primary sources of truth remain **CLAUDE.md** and
**TEST_STRATEGY.md** — when anything here conflicts with those files, the docs win.

---

## How to run a review

When asked to review a file or set of changes, check every item in the checklist below
and report findings grouped by severity (HIGH → MEDIUM → LOW). For each finding give:
- the file + approximate line
- what rule it breaks
- a one-line concrete fix

### Review checklist

**Imports**
- [ ] `test` and `expect` imported from `../../fixtures` (never from `@playwright/test`)

**Test titles**
- [ ] Format is `<ID> <description> <@tag>` (e.g. `C03 increase item quantity @regression`)
- [ ] ID prefix matches the area (`P`, `C`, `CH`, `CT`, `A`, `AC`)
- [ ] ID is unique — check existing tests before assigning a new one
- [ ] Tag is one of `@smoke | @regression | @demo | @flaky`

**Locators**
- [ ] All locators live in a page object — none are raw strings inside a spec
- [ ] Priority: `getByRole/getByLabel/getByTestId` → `[data-test=...]` → CSS
- [ ] No XPath
- [ ] No positional selectors (`.nth(0)`, `:first-child` used as identity)

**Waits**
- [ ] No `waitForTimeout`
- [ ] No `waitForLoadState('networkidle')` in new code — wait on a specific element or URL instead

**Setup**
- [ ] Multi-step setup lives in `ShopFacade`, not duplicated in `beforeEach`
- [ ] Does not call `addProductToCart()` or `loginViaUI()` from `utils/helpers.ts`
  (those duplicate ShopFacade — use the facade via fixtures)

**Assertions**
- [ ] Uses web-first `expect` (not `.isVisible()` inside an `if`)
- [ ] Asserts a real outcome (value, count, order), not just visibility
- [ ] Second argument to `expect(locator).toXxx(value, { message })` states intent

**Test independence**
- [ ] Test sets up its own state; does not rely on a prior test's leftovers
- [ ] Any data created uses a unique suffix (timestamp or random) to survive parallel runs
- [ ] Does not mutate `USERS.customer` (seeded demo account)

**Data**
- [ ] Reusable static inputs (addresses, payment details, contact payloads) live in `data/`
  not as inline constants inside the spec
- [ ] `USERS.guest` is used for guest checkout credentials instead of a hardcoded literal

**Page objects**
- [ ] Extends `BasePage` (gives a free `constructor` and base `navigate()`)
- [ ] No logic that spans multiple pages — that belongs in `ShopFacade`

**Static checks**
- [ ] `npx tsc --noEmit` passes after the change

---

## Known refactoring backlog

These issues were catalogued during the initial codebase audit. They are ranked HIGH →
LOW. Do not fix them without the user's explicit request, but flag them when you
encounter related code.

### HIGH — functional problems

**R1 · `utils/helpers.ts` · `addProductToCart` duplicates `ShopFacade.addToCart`**
Raw reimplementation of the same navigate→search→click flow.
_Fix_: delete `addProductToCart`; callers should use `shopFacade.addToCart()` via fixtures.

**R2 · `utils/helpers.ts` · `loginViaUI` duplicates `auth.setup.ts`**
Same UI login flow in two places; `loginViaUI` is never called by any spec.
_Fix_: delete `loginViaUI`; future auth tests should use `storageState` from `auth.json`
loaded through a fixture, not a per-test UI login.

**R3 · `pages/cart.page.ts` · `navigate()` routes to `/checkout`, not `/cart`**
Method name and destination are contradictory. `ShopFacade.addToCartAndGoToCart` works
around it by calling `goto('/cart')` directly, making `CartPage.navigate()` misleading.
_Fix_: change the path to `/cart`. The workaround in ShopFacade can then be removed too.

---

### MEDIUM — antipatterns / convention violations

**R4 · `pages/base.page.ts` · `navigate()` uses `waitForLoadState('networkidle')`**
`networkidle` is slow and fails on pages with long-polling or third-party widgets.
`ContactPage` already works around it by overriding `navigate()` entirely.
_Fix_: replace with `waitForLoadState('domcontentloaded')` + wait for a stable landmark
element, or remove the wait and let each page's first action act as the implicit wait.

**R5 · `common_actions/shop.facade.ts` · `addToCart()` calls `networkidle` twice**
Same antipattern as R4. The skeleton-hidden locator wait already covers DOM readiness.
_Fix_: remove both `networkidle` calls; rely on the skeleton-hidden wait already present.

**R6 · `tests/auth.setup.ts` · `waitForLoadState('networkidle')` after login**
After clicking login-submit, waits for networkidle instead of a specific post-login element.
_Fix_: replace with `page.waitForURL(/dashboard|account/)` or wait for the user-menu element
that only appears when authenticated.

---

### MEDIUM — inconsistent structure

**R7 · `pages/home.page.ts`, `pages/product.page.ts`, `pages/cart.page.ts`,
`pages/checkout.page.ts` · do not extend `BasePage`**
`BasePage` exists and `ContactPage` uses it, but the other four page objects each
duplicate `constructor(readonly page: Page)` manually.
_Fix_: extend `BasePage` in all five page objects; remove their duplicate constructors.

**R8 · `tests/checkout/checkout.spec.ts` and `tests/contact/contact.spec.ts` ·
inline static test-data objects should live in `data/`**
`ADDRESS`, `PAYMENT`, and `VALID_PAYLOAD` constants are defined inline in specs. They
will be copy-pasted into new specs as coverage grows.
_Fix_: export `TEST_ADDRESS`, `TEST_PAYMENT`, and `CONTACT_VALID_PAYLOAD` from `data/`
and import them into the specs.

**R9 · `tests/checkout/checkout.spec.ts` · guest credentials hardcoded inline**
`USERS.guest` already exists in `data/users.ts` but the spec defines its own literal.
_Fix_: replace the inline guest object with `USERS.guest`.

---

### LOW — housekeeping

**R10 · `tests/contact/inspect.spec.ts` · diagnostic file runs with the suite**
Uses raw `@playwright/test` (not fixtures), prints console logs, and is not a real test.
_Fix_: delete the file or move it outside `testDir` (e.g. a `scratch/` folder).

**R11 · `.gitignore` · `auth.json` is missing**
`auth.setup.ts` writes `auth.json` which contains a live session token. Committing it
leaks credentials.
_Fix_: add `auth.json` to `.gitignore`.

---

## Verification after any refactor

1. `npx tsc --noEmit` — must be clean.
2. `npx playwright test --grep "@regression"` — all 20 real regression tests green.
3. `npx playwright test --grep "@smoke"` — CT01, CT07 green.
4. For R3 (CartPage path): `npx playwright test tests/cart/cart.spec.ts` specifically.
5. For R7 (BasePage inheritance): `npx playwright test tests/contact/` — ContactPage
   override must still win and smoke tests must pass.
