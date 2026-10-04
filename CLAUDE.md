# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Playwright + TypeScript end-to-end test suite for the demo shop https://practicesoftwaretesting.com. Starter repo for the Claude Code Workshop.

## Commands

```bash
npm install
npx playwright install chromium   # first-time browser install

npx tsc --noEmit                  # type-check (no build step / no dist output used)

npx playwright test                          # run the whole suite
npx playwright test tests/cart/cart.spec.ts  # run one file
npx playwright test --grep "CH01"            # run one test by its ID (e.g. C01, P03, CH06)
npx playwright test --grep "@regression"     # run tests by tag
npm run test:headed                          # run with browser visible
npm run test:ui                              # Playwright UI mode
npm run test:report                          # open last HTML report
npm run setup                                # runs tests/auth.setup.ts to save auth.json
```

`npm test` is special-cased to `playwright test --grep "C01" --headed` — it only runs the single `C01` test, not the full suite.

Base URL defaults to `https://practicesoftwaretesting.com` and can be overridden with `BASE_URL` in a `.env` file (loaded via `dotenv` in `playwright.config.ts`).

## Architecture

Page Object Model + facade, wired together through a custom Playwright fixture:

- `pages/*.page.ts` — one class per page/component (`HomePage`, `ProductPage`, `CartPage`, `CheckoutPage`), holding locators and low-level actions. `BasePage` provides a shared `navigate()` that goes to a path and waits for `networkidle`; not all page objects extend it.
- `common_actions/shop.facade.ts` (`ShopFacade`) — composes page objects into multi-step business flows (e.g. `addToCart`, `addToCartAndGoToCheckout`, `fullGuestCheckout`) so specs read as flows, not click-by-click steps.
- `fixtures/index.ts` — extends Playwright's `test` to inject `homePage`, `cartPage`, `checkoutPage`, `productPage`, and `shopFacade` into every test. Specs import `test`/`expect` from `../../fixtures`, not from `@playwright/test` directly.
- `data/` — static fixtures (`products.ts` search keywords/categories/sort options, `users.ts` credentials) kept out of specs.
- `utils/helpers.ts` — standalone helper functions (`addProductToCart`, `loginViaUI`, `parseCurrency`) that predate/duplicate some `ShopFacade`/page-object behavior; prefer the facade and page objects for new tests.
- `tests/auth.setup.ts` — logs in via UI and persists `auth.json` storage state (used when a test needs a pre-authenticated session).

- `.claude/skills/` — project skills: `pw-test-writer` (generate specs), `test-automation` (write/debug tests), `pw-code-review` (review local changes, report-only), `pw-pr-review` (review a GitHub PR via `gh`, report-only unless asked to post).
- `evals/code-review/` — code-based grader, LLM judge and eval tasks for the `pw-code-review` skill (see its `README.md`). `npm run eval:review:grader` self-tests both graders (free); `npm run eval:review` runs the skill live via `claude -p` (costs tokens), with an optional LLM judge (`EVAL_JUDGE=1`) calibrated by `npm run eval:review:judge`. Has its own `playwright.config.ts`; not part of the e2e suite.

Specs live under `tests/<feature>/*.spec.ts` (`cart`, `checkout`, `product`). Each test title is prefixed with a short ID (`C01`, `P03`, `CH06`, etc.) and tagged `@regression`, enabling targeted runs via `--grep`.

`playwright.config.ts`: Chromium only, `fullyParallel: true`, no retries, 15s test timeout, screenshots/traces captured only on failure, video off.
