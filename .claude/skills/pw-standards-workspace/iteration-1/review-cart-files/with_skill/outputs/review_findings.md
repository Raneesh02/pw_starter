# Review Findings — `tests/cart/cart.spec.ts` & `pages/cart.page.ts`

> Reviewed against the Playwright Standards checklist (pw-standards skill) and the
> project conventions in `CLAUDE.md` and `TEST_STRATEGY.md`.
> Date: 2026-09-27

---

## Summary

**1 HIGH, 7 MEDIUM, 3 LOW findings.**

---

## HIGH Findings

---

**[HIGH] pages/cart.page.ts:33–35**
Rule: Page-object methods must encapsulate the full interaction needed to make the UI
respond — a caller should not have to know that `Tab` is required to commit a quantity
change.
Fix: Add `await this.getItemQuantityInput(itemName).press('Tab');` at the end of
`updateQuantity()`. As-written, anyone who calls `updateQuantity()` will fill the
field but never trigger the update, producing a silently wrong cart state.

---

## MEDIUM Findings

---

**[MEDIUM] tests/cart/cart.spec.ts:12**
Rule: Locators must live in page objects, not be built raw inside a spec (TEST_STRATEGY §5).
The filtered-rows locator `page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') })`
is built inline in C01. An equivalent locator (`cartRows`) already exists on `CartPage`.
Fix: Replace with `await expect(cartPage.cartRows).toHaveCount(1, ...)`.

---

**[MEDIUM] tests/cart/cart.spec.ts:20**
Rule: Locators belong in page objects, not in specs.
`page.locator('[data-test="add-to-cart"]')` is a raw locator built directly in C02.
This selector belongs on `ProductPage` (or wherever the "Add to Cart" button lives in
the page layer).
Fix: Add `readonly addToCartButton: Locator` to `ProductPage` and use
`productPage.addToCartButton.click()` here.

---

**[MEDIUM] tests/cart/cart.spec.ts:21–22**
Rule: Locators and navigation calls belong in page objects.
C02 calls `page.goto('/cart')` directly instead of using a page-object method. It also
rebuilds the filtered-rows locator a second time (same issue as line 12).
Fix: Add a `navigateToCart()` method to `CartPage` (distinct from the existing
`navigate()` which goes to `/checkout`), then use `await cartPage.navigateToCart()` and
`await expect(cartPage.cartRows).toHaveCount(2, ...)`.

---

**[MEDIUM] tests/cart/cart.spec.ts:44**
Rule: Locators belong in page objects.
C05 rebuilds the filtered-rows locator for the third time inside the spec.
Fix: Use `cartPage.cartRows` which is already defined on `CartPage`.

---

**[MEDIUM] tests/cart/cart.spec.ts:50**
Rule: Raw locators must not appear in specs; assert real outcomes, not only visibility.
`page.getByText(/cart is empty/i)` is a raw spec-level locator. A `.toBeVisible()`
assertion also checks presence only, not a meaningful user-facing value.
Fix: Add an `emptyCartMessage` locator to `CartPage`. Assert it is visible with an
intent message: `await expect(cartPage.emptyCartMessage, 'cart shows empty-state message after all items are removed').toBeVisible()`.

---

**[MEDIUM] tests/cart/cart.spec.ts:11–46 (C01–C06)**
Rule: `expect()` must carry an intent message (second argument) that states *why* the
assertion matters, not just what element is checked (TEST_STRATEGY §5; pw-standards
checklist §Assertions).
Every assertion in C01 through C06 omits the intent message.
Fix: Add a second string argument to each `expect()` call, e.g.:
`await expect(cartPage.cartRows).toHaveCount(1, 'one row should appear after adding one product')`.

---

**[MEDIUM] tests/cart/cart.spec.ts:53–58 (C07)**
Rule: Assertions must verify a real outcome (a value, an amount), not merely that
something changed.
C07 asserts `.not.toHaveText(before)` — it proves the total is *different* from what it
was, but not that it is *correct*. A concurrent DOM update or a rounding error would
pass this assertion undetected.
Fix: Compute the expected total from the unit price (or read it from the product data)
and assert `.toHaveText(expectedTotal, 'cart total should reflect 5× the unit price')`.

---

## LOW Findings

---

**[LOW] tests/cart/cart.spec.ts:5**
Rule: Prefer immutable, closure-scoped variables; shared mutable describe-level `let`
variables can mask accidental coupling between tests.
`let itemName = ''` is declared at describe scope and mutated in `beforeEach`. In
Playwright's parallel mode each worker gets its own module scope so there is no actual
data race, but the pattern looks like shared mutable state and will confuse readers.
Fix: Declare `let itemName: string;` (typed, no initialiser) or capture the value
inside each test body via a `beforeEach` return / closure pattern.

---

**[LOW] pages/cart.page.ts:16**
Rule: Avoid positional selectors as a primary identity strategy (TEST_STRATEGY §5).
`cartTotal` is resolved with `.last()` after a parent-traversal chain
(`locator('..')`). The locator is brittle: adding a cell to the Total row would shift
the index.
Fix: Ask the site team for a `data-test` attribute on the total cell, or scope more
precisely with `getByRole('cell', { name: /^\$[\d.]+$/ })` if the cell's accessible
name is unique.

---

**[LOW] pages/cart.page.ts:30–31**
Rule: Locator priority order is semantic → test-ID → CSS; never use multi-selector
fallback chains as a substitute for a stable locator (TEST_STRATEGY §5).
`getItemRemoveButton` uses `img[src*="trash"], img[alt*="delete"], td:last-child img`
— three guesses in one locator, each relying on implementation details (image paths,
alt text, position).
Fix: Request a `[data-test="remove-item"]` attribute on the delete control, then use
`page.getByRole('row', { name: new RegExp(itemName) }).getByTestId('remove-item')`.

---

## Checklist pass/fail at a glance

| Check | Result |
|---|---|
| `test`/`expect` imported from fixtures, not `@playwright/test` | PASS |
| Test title format `<ID> <description> <@tag>` | PASS |
| IDs unique and tagged | PASS |
| No `waitForTimeout` | PASS |
| No `networkidle` | PASS |
| No raw locators in specs | FAIL (C01, C02, C05, C06) |
| Multi-step setup uses ShopFacade | PASS |
| Web-first `expect(locator)` | PASS |
| Intent message on every assertion | FAIL (C01–C06) |
| Assertions check real outcomes, not just visibility | FAIL (C07) |
| Test independence / no shared mutable state | WARN (describe-level `let`) |
| Page object methods complete and correct | FAIL (`updateQuantity` omits Tab) |
| Locator priority order respected in page object | WARN (positional fallbacks) |
