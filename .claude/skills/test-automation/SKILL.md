---
name: test-automation
description: Use when writing, extending, or debugging Playwright tests in this repo (practicesoftwaretesting.com E2E suite) — adding a new spec, adding a new page/feature under test, parameterizing test cases, or chasing a flaky/failing test against the live site.
---

# Playwright test automation for this repo

This repo is a Page Object Model + facade Playwright suite against the live
demo site https://practicesoftwaretesting.com (see [CLAUDE.md](../../../CLAUDE.md)
for the full architecture). This skill covers the workflow and gotchas that
aren't obvious from reading the code once.

## Adding a test suite for a new page/feature

Follow this order (mirrors how `contact` was added):

1. **Explore the real DOM first.** Do not guess selectors. Write a throwaway
   spec under `tests/` that navigates to the page and dumps `data-test`
   attributes, option values, and error markup (see "Debugging against the
   live site" below). Delete it once you have what you need — never leave
   debug specs in the tree.
2. **Page object** in `pages/<name>.page.ts`: locators in the constructor
   (prefer `[data-test="..."]` — it's stable and used everywhere on this
   site), plus thin action methods (`fillForm`, `submit`, `navigate`).
3. **Data file** in `data/<name>.ts` if the test needs fixed inputs (valid
   payload, invalid variants) — follow `data/products.ts`/`data/users.ts`'s
   plain-object style.
4. **Wire the fixture** in `fixtures/index.ts`: add the type to
   `TestFixtures` and a `use(new XPage(page))` entry. Tests must import
   `test`/`expect` from `../../fixtures`, never `@playwright/test` directly.
5. **Spec file** in `tests/<feature>/<feature>.spec.ts`: `test.describe`,
   short unique ID + `@regression` tag per test title (see ID prefixes
   below), positive case(s) first, then negative/validation cases.
6. **Verify for real**: `npx tsc --noEmit`, then run the new spec file
   directly and read the actual pass/fail output — don't assume from reading
   the code that it works.

## Test ID prefixes (keep greppable via `--grep`)

`C`=cart, `P`=product, `CH`=checkout, `CN`=contact. Pick a new 1-3 letter
prefix per feature folder, not reused. When parameterizing (see
[references/parameterized-tests.md](../../../references/parameterized-tests.md)),
zero-pad the suffix (`C08-01`..`C08-10`, not `C08.1`..`C08.10`) so
`--grep "C08-01 "` doesn't also match `C08-10`.

## The #1 gotcha: this is a client-side-only SPA cart/session

The Angular app keeps cart contents and checkout-wizard step **in memory**,
not in localStorage/cookies. **Any `page.goto(...)` after items are already
in the cart wipes them and resets the wizard to step 1**, because it forces
a full page reload. This caused nearly every pre-existing cart/checkout test
failure found in this repo — always navigate via a client-side link click
instead once state matters:

- `homePage.goToCart()` — clicks the header cart icon (`app-header
  a[href="/checkout"]`), lands on checkout step 1 (CART).
- `homePage.goHomeWithoutLosingCart()` — clicks the header "Home" link.
- `cartPage.proceedToCheckout()` — clicks "Proceed to checkout" to advance
  from step 1 (CART) to step 2 (SIGN IN). `ShopFacade.addToCartAndGoToCheckout`
  already does this; call it directly instead of hand-rolling the sequence.
- `page.goto('/')` / `page.goto('/checkout')` are only safe as the *first*
  navigation of a test, before anything has been added to the cart.

If you see a cart/checkout test fail with an empty table, a wrong step
number, or a stuck spinbutton wait, check for a raw `page.goto()` used
mid-flow before suspecting anything else.

## Other real bugs already found and fixed (context for future ones)

- `HomePage.navigate()` didn't wait for the app to finish loading before
  returning (unlike `BasePage.navigate()`), so an immediate click right
  after could hit the page before it was interactive. Fixed by adding
  `waitForLoadState('networkidle')`. If a test clicks something right after
  a fresh navigate and intermittently misses, this is the pattern to check.
- Locators built from assumed markup (`img[src*="trash"]`, cell traversal
  via `.locator('..')`) silently matched nothing or the wrong element. The
  real cart row's remove control is `<a class="btn-danger">` wrapping an SVG
  icon, and the total is exposed directly as `[data-test="cart-total"]`.
  **Prefer a `data-test` attribute locator over reconstructing DOM structure
  even for one-off elements** — check via a debug spec first.
- Checking a filter checkbox re-fetches the product grid; clicking a card
  immediately after can hit a stale/detached node. `HomePage.filterByCategory`
  now waits for `networkidle` after checking — don't remove that wait.
- The checkout country `<select>`'s option `value` (e.g. `US`) doesn't match
  its visible label (`United States of America (the)`) or the short name
  (`United States`) tests may assume — verify `option` values via a debug
  spec before writing `selectOption(...)`, don't assume the label is the value.

## Debugging against the live site

There's no staging/mock backend — tests run against the real
practicesoftwaretesting.com. When a locator or flow is unclear:

1. Write a one-off spec (anywhere under `tests/`, e.g. `tests/debug_x.spec.ts`)
   that navigates to the page and does one of:
   - `await el.evaluate((n) => n.outerHTML)` to dump real markup for a
     specific element/row.
   - `page.locator(...).evaluateAll((els) => els.map(...))` to dump all
     `option` values/labels, all `data-test` attributes, etc.
   - `await page.screenshot({ path: 'test-results/debug-x.png', fullPage: true })`
     then read it back with the Read tool — often faster than parsing HTML.
2. Run it with `--workers=1` so output isn't interleaved.
3. **Delete the debug spec (and any screenshots it wrote) once done** —
   never commit throwaway investigation files.

## Verifying a fix isn't just live-site flakiness

This site is a real external service and does occasionally hiccup
(timeouts, `ERR_ABORTED`, slow renders under parallel load). Before
concluding a failure is a real bug:

1. Re-run the single failing test with `--workers=1` (parallel workers
   hammering the live site produce failures that vanish single-threaded).
2. If it still fails, re-run with `--repeat-each=3` to rule out one-off
   flakiness.
3. Only after a consistent, repeatable failure should you treat it as a
   real defect and start reading markup/traces.
4. After fixing, re-run the *whole* affected spec file (not just the one
   test) single-threaded — fixes to shared `pages/*.ts` or
   `common_actions/shop.facade.ts` can affect every spec that uses that
   fixture, not just the one you were looking at.

## Parameterized tests

See [references/parameterized-tests.md](../../../references/parameterized-tests.md)
for the `for`-loop pattern used in this repo (no built-in `test.each` in
Playwright), where case data should live, and the ID/tag checklist.
