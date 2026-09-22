# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Playwright + TypeScript (strict) E2E suite for the public demo shop https://practicesoftwaretesting.com. Target is overridable via `BASE_URL` (loaded from `.env` by `dotenv`). Chromium only, `fullyParallel`, no retries, 15s per-test timeout.

## Commands

- `npx playwright test` — run everything
- `npx playwright test tests/cart/cart.spec.ts` — one file
- `npx playwright test --grep "CH01"` — one test by ID prefix in its title
- `npx playwright test --grep "@regression"` — by tag
- `npm test` — NOTE: hardcoded to `--grep "C01" --headed`, not the full suite
- `npm run test:ui` / `test:headed` / `test:report` — UI mode / headed / open the HTML report
- `npm run setup` — runs `tests/auth.setup.ts`, which logs in and writes `auth.json`
- `npx tsc --noEmit` — type check (no lint or build script exists)

## Architecture

Layered; specs should only talk to fixtures:

- `fixtures/index.ts` extends Playwright's `test` to inject page objects (`homePage`, `cartPage`, `checkoutPage`, `productPage`) and `shopFacade`. Specs import `test`/`expect` from `../../fixtures`, not `@playwright/test`. Register new page objects here.
- `pages/*.page.ts` are page objects. All extend `BasePage` (`navigate()` goes to a path and waits for network idle). Keep assertions out of them.
- `common_actions/shop.facade.ts` (`ShopFacade`) composes page objects into multi-step flows (search, open product, add to cart, go to `/cart` or `/checkout`, full guest checkout). Most `beforeEach` blocks use it to arrange state through the UI.
- `data/` holds test data (`USERS`, `PRODUCTS`); reference these rather than inlining values.
- `utils/helpers.ts` holds older standalone helpers (`addProductToCart`, `loginViaUI`, `parseCurrency`) that overlap with `ShopFacade` and `auth.setup.ts`. Prefer the facade/fixtures for new code.

## Conventions

Full rules for page objects, test structure, assertion messages, banned patterns, and test IDs live in **[CODING_GUIDELINES.md](CODING_GUIDELINES.md)** — read it before writing or modifying any test or page object. Repo-specific notes not covered there:

- Test titles start with an ID and end with `@regression`: `'C01 add single product appears in cart @regression'`. Prefixes: `C` cart, `CH` checkout, and so on. Keep IDs unique because `--grep` selects on them. `@regression` is currently the only tag in use.
- Locators: role/text preferred; `[data-test="..."]` is the app's own test attribute and is used throughout.
- Generated output (`test-output/`, `playwright-report/`, `auth.json`) should not be committed.

## Gotchas

- `auth.setup.ts` is not wired as a Playwright `setup` project in `playwright.config.ts`, and no spec loads `auth.json`. Auth is not automatic; tests run as guests.
- `tests/cart/cart_static_checks.spec.ts` (C99) is a placeholder demo with no real product assertions.
- Existing specs predate CODING_GUIDELINES.md and are not yet fully compliant — notably, existing `expect()` calls don't have custom messages. Apply the guidelines to new and modified code; don't assume old specs are a compliant reference.
