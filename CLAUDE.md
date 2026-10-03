# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A Playwright + TypeScript end-to-end test framework for the public demo shop https://practicesoftwaretesting.com. It is the starter repo for a Claude Code workshop. `TEST_STRATEGY.md` is the source of truth for scope, conventions, suites, and known issues. Read it before you add or restructure tests.

## Commands

```bash
npm install && npx playwright install chromium   # first-time setup
npx tsc --noEmit                                  # type-check (run after every change)
npx playwright test                               # full suite (Chromium)
npx playwright test tests/cart/cart.spec.ts       # one file
npx playwright test --grep "CH01"                 # one test by ID
npx playwright test --grep "@regression"          # by tag
npm run test:headed | test:ui | test:report
```

`npm test` does **not** run the suite. It runs only `C01`, headed.

## Architecture

```
tests/           Specs by feature: product/ (P), cart/ (C), checkout/ (CH)
pages/           Page objects: locators + single-page actions
common_actions/  ShopFacade: multi-page flows (search → add to cart → cart/checkout → guest checkout)
fixtures/        Custom `test` that injects homePage, cartPage, checkoutPage, productPage, shopFacade
data/            Static test data (PRODUCTS, USERS)
utils/           Helpers (parseCurrency; addProductToCart/loginViaUI duplicate the facade)
```

- Specs import `test` and `expect` from `fixtures/`, not from `@playwright/test`.
- `playwright.config.ts` loads `.env` via dotenv. `BASE_URL` overrides the site. Timeout is 15s, retries 0, fully parallel, Chromium only.
- `tests/auth.setup.ts` writes `auth.json`, but no config project uses it yet. `auth.json` is not in `.gitignore`, so add it there before you enable authenticated tests.

## Conventions

- **Test titles:** `<ID> <description> <@tag>`, e.g. `C03 increase item quantity @regression`. IDs are unique and never reused. Prefixes: `P`, `C`, `CH`, and for new areas `A` (auth) and `AC` (account). Tags: `@smoke`, `@regression`, `@demo`, `@flaky`.
- **Locators:** use `getByRole`/`getByLabel` first, then `[data-test=...]`, then CSS. Never use XPath or position-based locators. Locators belong in page objects, not specs.
- **Setup:** put multi-step setup in `ShopFacade`. Do not copy it between specs.
- **Assertions:** use web-first `expect` with a message that states intent. Assert the real outcome (a value, an order, or a count), not only that something is visible.
- **Waits:** never use `waitForTimeout`. In new code, wait for a specific element or response instead of `networkidle`.
- **Independence:** each test sets up its own state and must pass alone, in any order, and in parallel.
- **Shared demo site:** do not change the seeded customer account (`data/users.ts`). Do not load-test the site. Generate unique data (timestamp or random suffix) for anything you create.

## Known quirks

- `CartPage.navigate()` goes to `/checkout`, but `ShopFacade` uses `/cart`. See TEST_STRATEGY §11 for this and other known issues before you "fix" something that is already tracked.
- `C99` in `cart_static_checks.spec.ts` is a workshop demo, not a real test.
