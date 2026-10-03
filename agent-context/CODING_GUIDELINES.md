# Coding Guidelines

Audience: SDETs contributing Playwright + TypeScript tests to pw_starter (demo shop at
`https://practicesoftwaretesting.com`, no local app to start). Keep tests readable,
independent, and deterministic.

## 1. Structure & layering

- **Specs** (`tests/**/*.spec.ts`) state intent only. No raw `page.` calls, no locators, no
  navigation logic — those belong in a page object or the facade.
- **Page Objects** (`pages/*.page.ts`) own locators and single-page actions. They return
  data/state and do not assert.
- **Facade** (`common_actions/shop.facade.ts`) owns multi-page journeys (`ShopFacade`). Add a
  new cross-page flow there; never duplicate navigation/flow logic inside a spec.
- **Data** lives in `data/*.ts`, typed, plain objects/arrays — no inline literals in specs.
- Specs import `test`/`expect` from the custom fixtures (`../../fixtures`), never from
  `@playwright/test` directly.
- `utils/helpers.ts` duplicates logic that already lives in `ShopFacade`/page objects and is
  unused by any spec. Don't add to it or call it from new tests — extend the
  facade/page-object pattern instead. (Known debt; flag if a change route through it.)
- `BasePage` (`pages/base.page.ts`) exists but no concrete page object currently extends it.
  Don't silently start extending it in one new page object while the rest don't — that's an
  inconsistency to call out, not a thing to do unasked.

## 2. Naming & files

- Files: `kebab-case.spec.ts`, `xxx.page.ts`. Classes: `PascalCase`.
- Methods verb-first (`addToCart`, `searchFor`); locators are nouns (`addToCartButton`).
- One feature area per spec file, one `test.describe` per feature.
- Test title format: `'<ID> <lowercase outcome> @regression'`. IDs are area-prefixed,
  zero-padded, sequential, never reused. Prefixes in use: `P` (product), `C` (cart),
  `CH` (checkout).

## 3. TypeScript

- `strict: true` is on in `tsconfig.json` — keep it passing. No `any`, no non-null `!`, no
  `@ts-ignore` without a comment explaining why.
- Explicit return types on public/async methods that return something other than `void`/`Promise<void>`.
- `readonly` on locator fields.
- `interface`/`type` for data shapes (see `AddressData`, `PaymentData` in `checkout.page.ts`).
- `npx tsc --noEmit` must pass before a PR.

## 4. Locators (in priority order)

1. `getByRole`
2. `getByLabel` / `getByPlaceholder` / `getByText`
3. `[data-test="..."]`
4. Structural CSS (class selectors, `locator('..')` parent-walks) — last resort, and only
   because the app under test doesn't expose a better hook; don't add more of these in new
   code without first checking for a role/`data-test` alternative.

No XPath. No `nth`/positional selectors unless position is literally what's under test. The
app already forces a few structural selectors (`[class*="card"]`, `cartTotal`'s parent-walk,
`getCartBadge`'s `.last()`) — treat those as existing debt, not precedent to extend.

```ts
// good
readonly addToCartButton: Locator = page.locator('[data-test="add-to-cart"]');
// avoid introducing more of this
readonly total = page.locator('div > div:nth-child(3)');
```

## 5. Assertions & waiting

- Web-first assertions only: `await expect(locator).toBeVisible()` / `toHaveValue()` / etc.
- No `page.waitForTimeout`/sleeps anywhere.
- `page.waitForLoadState('networkidle')` + the skeleton-wait
  (`page.locator('[class="card skeleton"]').first().waitFor({ state: 'hidden' })`) is the
  repo's current wait pattern after a search, duplicated across `ShopFacade` and
  `utils/helpers.ts`. New code should go through the facade, not re-inline this pair.
- Assert observable outcomes, not implementation details.
- Every test must be able to fail. No assertion-free tests.

## 6. Test design

- Tests are independent, order-agnostic, and parallel-safe (`fullyParallel: true` in config).
  Each owns its own setup via `beforeEach`/fixtures — no cross-test shared mutable state.
- This is a live, shared demo site: don't assume exclusive state; don't assert on absolute
  counts that another worker/run could change unless the test just created that state itself.
- Go beyond the happy path: boundaries, invalid/empty input, unstated assumptions — per the
  project's investigative-testing style, not just the literal spec of the request.
- Parameterize with a typed array + loop (Playwright has no built-in `test.each`) instead of
  duplicating near-identical tests; give each generated case its own sequential ID.
- Tag `@regression` at minimum; add `@smoke`/`@negative`/`@boundary` where it helps targeting.
- `tests/auth.setup.ts` saves storage state to `auth.json` but no project in
  `playwright.config.ts` currently consumes it as `storageState`. Don't assume logged-in state
  is available to a spec unless you've wired that up.

## 7. Stability & flakiness

- `retries: 0`, `video: 'off'`, `trace: 'retain-on-failure'`, `timeout: 15000` are set in
  `playwright.config.ts` — timeouts/retries live there, not scattered through tests.
- A flaky test gets tagged for quarantine and raised as an issue, not silently skipped,
  deleted, or retried-until-green locally.

## 8. Style & tooling

- There is no ESLint/Prettier config in this repo. Match the surrounding style exactly
  (single quotes, semicolons, trailing commas, 2-space indent) rather than inventing new
  formatting conventions — don't add lint config as a side effect of an unrelated change.
- Comments explain *why*, not *what*. No commented-out code, `console.log`, or `test.only`
  left in committed code.

## 9. Secrets & config

- `.gitignore` currently excludes only `node_modules/`. `auth.json` (storage state written by
  `tests/auth.setup.ts`) and any `.env` are **not** gitignored — treat this as a standing gap:
  never let a change add real secrets while this hole is open, and flag it on sight.
- `data/users.ts` hardcodes a password for the public demo site's seeded customer account —
  acceptable for this demo app specifically, but no new credential, token, or API key for
  anything else gets hardcoded; it goes through `.env` (gitignored) read via `dotenv`
  (already wired up in `playwright.config.ts`).
- `baseURL` comes from `process.env.BASE_URL` with a fallback, never hard-coded inline in a
  test or page object.

## 10. Review checklist

Before opening a PR:

- [ ] `npx tsc --noEmit` passes
- [ ] Only the affected spec(s) run green locally (not the full suite)
- [ ] New test IDs are unique and sequential for their prefix
- [ ] No locator/wait/data regressions per §4/§5/§9 above
- [ ] Layering respected: nothing in a spec that belongs in a page object/facade/data file
