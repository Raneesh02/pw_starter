# pw_starter

Playwright + TypeScript E2E test suite for the demo shop https://practicesoftwaretesting.com.

## Structure

- `pages/` — Page Object Model classes, each extends `BasePage` (`pages/base.page.ts`), which provides `navigate(path)`.
- `common_actions/` — `ShopFacade` composes multiple page objects into higher-level flows (e.g. `addToCart`, `fullGuestCheckout`).
- `fixtures/index.ts` — custom Playwright fixtures; injects page objects and `shopFacade` into tests.
- `data/` — static test data (`products.ts`, `users.ts`).
- `tests/<feature>/*.spec.ts` — specs grouped by feature (`cart`, `checkout`, `product`).
- `tests/auth.setup.ts` — auth setup project.

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

Note: `npm test` only runs the `C01` test in headed mode, not the full suite.

## Conventions

- Import `test` and `expect` from `../../fixtures`, not directly from `@playwright/test`.
- Test titles start with an ID (`C01`, `CH01`, ...) and end with a tag like `@regression`.
- Put element locators and low-level interactions in page objects; put multi-page flows in `ShopFacade`.
- Prefer role-based locators (`getByRole`, `getByText`) over CSS selectors where practical.
- New pages/flows: add the page object to `pages/`, wire it into `fixtures/index.ts`, and extend `ShopFacade` for cross-page actions.
