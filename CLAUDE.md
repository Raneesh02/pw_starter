# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Playwright + TypeScript UI test framework (starter repo for a Claude Code workshop). Tests run against the demo shop https://practicesoftwaretesting.com (override with `BASE_URL` in `.env`, loaded via `dotenv` in `playwright.config.ts`). Only the `chromium` project is configured.

## Commands

```bash
npm install && npx playwright install chromium   # setup
npx tsc --noEmit                                  # type check (there is no lint step)
npx playwright test                               # full suite
npx playwright test tests/cart/cart.spec.ts       # one file
npx playwright test --grep "C03"                  # one test by its ID
npx playwright test --grep "@regression"          # by tag
npm run test:ui                                   # UI mode
npm run test:report                               # open last HTML report
```

`npm test` is NOT the full suite: it runs only `C01` in headed mode.

## Architecture

- **Specs import `test`/`expect` from `fixtures/index.ts`, not from `@playwright/test`.** The fixture file extends the base test with page objects (`homePage`, `cartPage`, `checkoutPage`, `productPage`) and `shopFacade`. A new page object must be registered there to be usable as a fixture.
- **Page objects** live in `pages/`. `BasePage` exists (with a `navigate()` that waits for `networkidle`), but current page objects define their own `page` field and locators in the constructor and do not extend it.
- **`ShopFacade`** (`common_actions/shop.facade.ts`, exported from `common_actions/index.ts`) composes page objects into multi-page flows (search → open product → add to cart → go to cart / checkout). Tests typically use it in `beforeEach` for setup.
- **Test data** lives in `data/` (`PRODUCTS`, `USERS`); specs reference these constants instead of literals.
- `utils/helpers.ts` holds older function-style helpers (`addProductToCart`, `loginViaUI`, `parseCurrency`) that overlap with the facade; they are not currently imported by any spec.
- `tests/auth.setup.ts` logs in and writes `auth.json` storage state, but no setup project or `storageState` is wired into `playwright.config.ts`, so tests do not use it.

## Conventions

- Test titles start with an ID and end with tags, e.g. `'C03 increase item quantity @regression'`. ID prefixes group by area (`C` cart, `CH` checkout, etc.), which is how `--grep` targets single tests.
- Locators: `getByRole` first, then `[data-test="..."]` attributes.
- The product list shows skeleton cards while loading; wait for `[class="card skeleton"]` to be hidden before clicking results (see `ShopFacade.addToCart`).
- Config: `fullyParallel: true`, `retries: 0`, 15s test timeout, screenshots and traces kept only on failure (in `test-results/`).

## Other folders

- `docs/ai-chat-test-strategy.md`: test strategy draft for an LLM-backed chat assistant.
- `test-apps/chat/index.html`: a static demo chat page that strategy refers to.
