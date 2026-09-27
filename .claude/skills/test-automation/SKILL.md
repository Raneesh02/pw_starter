---
name: test-automation
description: Use when writing or modifying Playwright test specs, page objects, fixtures, or ShopFacade flows in pw_starter, or when running/debugging the test suite. Enforces this repo's structure and conventions.
---

# Test Automation (pw_starter)

Playwright + TypeScript E2E suite for https://practicesoftwaretesting.com.

## Structure

- `pages/` — Page Object Model classes, each extends `BasePage` (`pages/base.page.ts`), which provides `navigate(path)`.
- `common_actions/` — `ShopFacade` composes multiple page objects into higher-level flows (e.g. `addToCart`, `fullGuestCheckout`).
- `fixtures/index.ts` — custom Playwright fixtures; injects page objects and `shopFacade` into tests.
- `data/` — static test data (`products.ts`, `users.ts`).
- `tests/<feature>/*.spec.ts` — specs grouped by feature (`cart`, `checkout`, `product`).
- `tests/auth.setup.ts` — auth setup project.

## Rules (strict — always follow)

- Always import `test` and `expect` from `../../fixtures`, never directly from `@playwright/test`.
- Test titles always start with an ID (`C01`, `CH01`, ...) and end with a tag like `@regression`.
- Locators and low-level interactions belong in page objects, not in specs.
- Multi-page flows belong in `ShopFacade`, not duplicated across page objects or specs.
- Prefer role-based locators (`getByRole`, `getByText`) over CSS selectors where practical.
- When adding a new page or flow: add the page object to `pages/`, wire it into `fixtures/index.ts`, and extend `ShopFacade` if the flow spans multiple pages.

## Workflow for adding a new test

1. Check if the needed page object already exists in `pages/`. If not, create one extending `BasePage`.
2. Wire the new page object into `fixtures/index.ts`.
3. If the test spans multiple pages, add or extend a method in `ShopFacade` (`common_actions/`).
4. Write the spec under `tests/<feature>/`, importing `test`/`expect` from `../../fixtures`.
5. Title the test with an ID and end with a tag (e.g. `C05 - guest can add item to cart @regression`).
6. Run the new test in isolation before running the full suite.

## Browser exploration with Playwright MCP

Before writing or updating page objects or specs, use the Playwright MCP browser tools to navigate the live site and verify locators, roles, and flows rather than guessing.

- Default base URL: `https://practicesoftwaretesting.com`
- If the user specifies a different URL, use that URL instead for that exploration.

## Commands

```bash
npx playwright test                        # run all tests
npx playwright test tests/cart/cart.spec.ts # run one file
npx playwright test --grep "C01"            # run one test by ID
npx playwright test --grep "@regression"    # run by tag
npm run test:headed                         # headed mode
npm run test:ui                             # UI mode
npm run test:report                         # open last HTML report
npx tsc --noEmit                            # type-check
```

Note: `npm test` only runs the `C01` test in headed mode, not the full suite — do not use it as a stand-in for the full run.
