# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Playwright + TypeScript E2E test suite for the demo shop https://practicesoftwaretesting.com. Starter repo for the Claude Code Workshop.

See [CODING_GUIDELINES.md](CODING_GUIDELINES.md) for naming, style, and lint/format rules.

## Commands

```bash
npm install
npx playwright install chromium   # first-time browser install

npx tsc --noEmit                  # type-check (run after any TS change)

npx playwright test                           # run full suite
npx playwright test tests/cart/cart.spec.ts   # run one file
npx playwright test --grep "C01"              # run one test by its ID (test names are prefixed C01, P01, CH01, etc.)
npx playwright test --grep "@regression"      # run tests by tag

npm run test:headed                           # run with browser visible
npm run test:ui                                # Playwright UI mode
npm run test:report                            # open last HTML report
npm run setup                                   # run tests/auth.setup.ts to generate auth.json
```

`npm test` only runs the `C01` test in headed mode — it is a smoke command, not the full-suite runner.

## MCP

The Playwright MCP server is configured in `.mcp.json` (project scope, `npx @playwright/mcp@latest`). Use its browser tools (`browser_navigate`, `browser_snapshot`, `browser_click`, etc.) to inspect real app behavior — actual `data-test` attributes, locators, DOM changes — before writing or fixing assertions, instead of guessing.

## Architecture

- **`fixtures/index.ts`** is the entry point for every spec: it extends Playwright's `test` with auto-injected fixtures — `homePage`, `cartPage`, `checkoutPage`, `productPage`, `shopFacade` — and re-exports `expect`. Specs import `{ expect, test }` from `../../fixtures`, never directly from `@playwright/test`.
- **`pages/`** — Page Object Model. Each page class (`home.page.ts`, `cart.page.ts`, `checkout.page.ts`, `product.page.ts`) holds only locators and low-level actions for that page. `base.page.ts` provides a shared `navigate()`. Locators prefer role-based queries (`getByRole`, `getByLabel`) with `[data-test="..."]` as fallback for elements without accessible roles.
- **`common_actions/shop.facade.ts`** — `ShopFacade` composes page objects into cross-page workflows reused across spec files (e.g. `addToCart`, `addToCartAndGoToCheckout`, `fullGuestCheckout`). Use this facade for multi-step setup in `beforeEach` rather than duplicating flows in specs.
- **`data/`** — test data (`products.ts`, `users.ts`) kept out of specs.
- **`tests/`** — specs grouped by feature (`cart/`, `checkout/`, `product/`). Assertions live in specs; locators/actions live in page objects. `tests/auth.setup.ts` logs in via UI and saves `auth.json` storage state for authenticated runs.
- **`utils/helpers.ts`** — standalone helper functions (currently overlapping with `ShopFacade`/`auth.setup.ts`; prefer the facade and fixtures for new tests).

## Conventions

- Locators: prefer user-facing queries (`getByRole`, `getByLabel`, `getByText`) over CSS/XPath.
- Assertions: use web-first assertions (`await expect(locator)...`); no fixed waits (`waitForTimeout`).
- Tests are independent — state is set up via `shopFacade`/fixtures in `beforeEach`, not by depending on other tests.
- Test IDs (`C01`, `P01`, `CH01`, ...) plus `@regression` tag are used for targeted runs via `--grep`.
- Parameterized tests: not yet used in this repo — see [reference/reference.md](reference/reference.md) for the `for...of` loop pattern to follow when adding them.
