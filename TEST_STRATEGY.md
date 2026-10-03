# Test Strategy — Practice Software Testing Shop

## 1. Purpose

This document says what we test in the demo shop at https://practicesoftwaretesting.com, how we test it, and how we decide a build is good. It covers the Playwright + TypeScript framework in this repo. Everyone who adds or changes tests should follow it.

## 2. Scope

### In scope

| Area | Features |
|---|---|
| Product discovery | Search, category filter, sort, pagination, product detail page |
| Cart | Add, update quantity, remove, empty state, totals |
| Checkout | Guest checkout, address step, all payment methods, order confirmation |
| Authentication | Customer login, logout, registration, session persistence |
| Customer account | Profile, favourites, order history and invoices |

### Out of scope (for now)

- Admin back office
- Performance and load testing. The site is a shared public demo and must not be load-tested.
- Security and penetration testing
- Real payment processing. The site only simulates payments.

## 3. Quality risks and priorities

Tests are prioritised by business risk. The higher the risk, the earlier and more often the test runs.

| Priority | Risk | Example |
|---|---|---|
| P1 — Critical | The customer cannot buy | Add to cart → guest checkout → order confirmed |
| P2 — High | The customer buys the wrong thing or pays the wrong amount | Quantity changes, cart total, payment validation |
| P3 — Medium | The customer cannot find a product | Search, filter, sort |
| P4 — Low | Cosmetic or secondary flows | Related products, favourites, compare |

## 4. Test levels and types

| Level | Tool | Purpose | Status |
|---|---|---|---|
| UI end-to-end | Playwright (`tests/`) | Validate user journeys in a real browser | **In place** |
| API | Playwright `request` fixture | Fast checks of business rules; set up test data without the UI | Planned |
| Accessibility | `@axe-core/playwright` | Find WCAG violations on key pages | Planned |
| Visual regression | `toHaveScreenshot()` | Catch layout breakage on stable pages | Optional |
| Static checks | `tsc --noEmit` (plus ESLint later) | Catch type and style errors before any test runs | `tsc` in place |

Guiding rule: **check a business rule at the lowest level that can prove it.** Use the UI only for journeys and for behaviour that only the UI shows. For example, check sort order through the API, and keep one UI test to prove that the sort dropdown works.

## 5. Framework design

```
tests/           Specs, grouped by feature (product/, cart/, checkout/)
pages/           Page objects: locators + single-page actions
common_actions/  ShopFacade: multi-page flows (e.g. add to cart → checkout)
fixtures/        Custom test fixtures that inject pages and the facade
data/            Static test data (products, users)
utils/           Pure helpers (e.g. parseCurrency)
```

### Conventions

- **Test IDs.** Every test title starts with a unique ID and a feature prefix: `P` = product, `C` = cart, `CH` = checkout. Add `A` = auth and `AC` = account for new areas. IDs are never reused.
- **Tags.** Every test has at least one suite tag (see §7). Tags go at the end of the title.
- **Locators.** Use this order of preference: `getByRole` / `getByLabel`, then `[data-test=...]`, then CSS. Never use XPath or locators that depend on DOM position.
- **Page objects hold locators. Specs hold assertions.** A spec should not build raw locators. If a spec needs one, add it to the page object.
- **Multi-step setup** goes through `ShopFacade` or, later, API helpers. Do not copy setup steps between specs.
- **Assertions** use web-first `expect(...)` with a message that explains the intent. Assert the outcome the user cares about (the value, the order, the count), not only that something is visible.
- **Waits.** Do not use `waitForTimeout`. Avoid `networkidle`. Wait for the specific element or response instead.
- **Independence.** Each test creates its own state and can run alone, in any order, in parallel.

## 6. Test data

| Data | Source | Notes |
|---|---|---|
| Product keywords, categories, sort keys | `data/products.ts` | Tests depend on the live catalog. If the catalog changes, update this file. |
| Customer account | `data/users.ts` (seeded demo user) | Shared by everyone who uses the demo. Tests must not change its profile or password. |
| Guest details, addresses, payments | Specs and `data/` | Move the inline `ADDRESS` and `PAYMENT` constants from `checkout.spec.ts` into `data/`. |
| Unique data (e.g. new registrations) | Generate at runtime | Use a timestamp or random suffix so parallel runs do not collide. |

Credentials and the base URL can be overridden in `.env` (`BASE_URL`). Never commit secrets. Add `auth.json` to `.gitignore` before anyone enables authenticated tests.

## 7. Suites and execution

| Suite | Tag | Contents | When it runs | Target time |
|---|---|---|---|---|
| Smoke | `@smoke` | One P1 journey per area (search → add to cart → guest checkout) | Every push and PR | < 2 min |
| Regression | `@regression` | All functional tests | PR to `main`, nightly | < 10 min |
| Demo / training | `@demo` | Workshop examples such as `C99` | Never in CI | — |

Commands:

```bash
npx playwright test --grep "@smoke"
npx playwright test --grep "@regression"
npx playwright test --grep-invert "@demo"
```

### Browsers and devices

- **Default:** Desktop Chromium.
- **Nightly:** Add Firefox, WebKit, and one mobile viewport (e.g. `devices['Pixel 7']`) as extra Playwright projects. Run only the smoke suite on them to keep runtime low.

### Configuration

| Setting | Local | CI |
|---|---|---|
| `retries` | 0 | 1 (a test that passes on retry is reported as flaky, not green) |
| `workers` | default | 2–4, to keep load on the shared demo site low |
| `trace` | `retain-on-failure` | `on-first-retry` |
| `screenshot` | `only-on-failure` | `only-on-failure` |
| `forbidOnly` | false | true |

## 8. CI/CD

Add a GitHub Actions workflow, `.github/workflows/playwright.yml`:

1. On every push and PR: `npm ci`, then `npx tsc --noEmit`, then the smoke suite.
2. On PR to `main`: the full regression suite on Chromium.
3. Nightly: regression on Chromium plus smoke on the other browsers and the mobile viewport.
4. Always upload `playwright-report/` and `test-results/` as artifacts.

## 9. Entry and exit criteria

**Entry (start testing a build):** the project compiles (`tsc --noEmit`), the site is reachable, and the smoke suite passes.

**Exit (release or merge is OK):**

- 100% of P1 and P2 tests pass.
- Every failure has a triaged cause: product bug, test bug, or environment issue.
- No test is marked flaky for more than one week without a ticket.
- No new `test.skip` or `test.fixme` without a linked issue.

## 10. Defects and flaky tests

- **Product bug:** Log it with the test ID, trace, and screenshot. Mark the test `test.fail()` with the issue link so the suite stays green and the bug stays visible.
- **Test bug:** Fix it in the same sprint. Do not add retries or longer timeouts to hide it.
- **Flaky test:** Quarantine it with a `@flaky` tag and exclude that tag from the gating suites. Fix it within one week or delete it.

## 11. Current state and gaps

This is based on a review of the repo as of 2026-09-26.

### Coverage today (21 tests, Chromium only)

| Area | Tests | Notes |
|---|---|---|
| Product | P01–P07 | Search, filter, sort, navigate to detail |
| Cart | C01–C07, C99 | C99 is a static-check demo, not a real test |
| Checkout | CH01–CH06 | Guest flow only; Bank Transfer and Credit Card |
| Auth / account | none | `tests/auth.setup.ts` exists, but no project in the config uses it |

### Issues to fix in existing tests

| # | Issue | Where | Fix |
|---|---|---|---|
| 1 | Sort tests don't check the order. They only check that a card is visible. | P05, P06 | Read the prices or names and assert they are sorted. |
| 2 | The back-navigation test only checks that the URL matches `/checkout/`. That doesn't show which step is on screen. | CH05 | Assert that the previous step's content is visible. |
| 3 | CH01 and CH04 do the same steps. | checkout.spec.ts | Merge them into one test that asserts the confirmation and the order number. |
| 4 | Error assertions use broad regexes (`/required\|invalid/`, `/invalid\|declined\|error/`). They can match unrelated text. | CH02, CH03 | Assert on the specific `data-test` error element for each field. |
| 5 | Specs build raw locators and skip the page objects. | C01, C02, C05, CH02, CH06 | Use `cartPage.cartRows`, `productPage.addToCart()`, and the facade. |
| 6 | The demo test is tagged `@regression`. | C99 | Retag it `@demo`. |
| 7 | The cart URL is inconsistent: `CartPage.navigate()` goes to `/checkout`, but `ShopFacade` goes to `/cart`. | pages/cart.page.ts, shop.facade.ts | Pick one route and use it everywhere. |
| 8 | `utils/helpers.ts` repeats `ShopFacade` logic (`addProductToCart`, `loginViaUI`). | utils/helpers.ts | Delete the duplicates and keep only pure helpers. |
| 9 | Setup relies on `networkidle` and on the `card skeleton` class name. | ShopFacade, BasePage | Wait for the product heading or the search API response instead. |
| 10 | No `@smoke` tag and no CI workflow exist. | — | See §7 and §8. |

### Missing coverage, by priority

| Priority | Scenario |
|---|---|
| P1 | Logged-in customer checkout (using stored `auth.json` state) |
| P1 | Login: valid, invalid password, and logout |
| P2 | Cart total equals unit price × quantity (use `parseCurrency`) |
| P2 | Cart badge count updates after add and remove |
| P2 | Remaining payment methods: Cash on Delivery, Buy Now Pay Later, Gift Card |
| P2 | Quantity boundaries: 0, negative, very large, non-numeric |
| P3 | Price range filter, pagination, combined search + filter |
| P3 | Product detail: price, category, brand match the listing |
| P4 | Favourites, compare, related products, contact form |
| — | Registration with unique data |
| — | Accessibility scan of home, product, cart, and checkout pages |

## 12. Roadmap

| Phase | Deliverables |
|---|---|
| 1. Stabilise | Fix issues 1–9 above. Add `@smoke` tags. Add the GitHub Actions workflow. |
| 2. Close P1/P2 gaps | Enable the auth setup project. Add login and logged-in checkout. Add cart math and payment-method tests. |
| 3. Widen | Add API-level tests and API-based data setup. Add cross-browser and mobile smoke runs. Add accessibility checks. |
| 4. Maintain | Review flaky tests weekly. Update this document whenever scope or conventions change. |
