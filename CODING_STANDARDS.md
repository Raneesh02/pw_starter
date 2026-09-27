# Coding Standards — pw_starter

Playwright + TypeScript E2E suite for https://practicesoftwaretesting.com. These standards extend the conventions in `CLAUDE.md` and `.claude/skills/test-automation/SKILL.md`.

## 1. Structure & organization

- Mirror the app's flows, not test types: specs live under `tests/<feature>/` (cart, checkout, product).
- Page Object Model only — every page extends `BasePage`; multi-page flows go in `ShopFacade`, never duplicated in specs or ad-hoc helpers.
- One behavior per test.

## 2. Naming

- Test titles: `<ID> <behavior description> @tag` (e.g. `C05 remove item reduces cart count @regression`).
- Page objects named `<Feature>Page`; facade methods named after the user flow (`addToCartAndGoToCheckout`), not implementation detail.

## 3. Test design

- Arrange (fixture/`beforeEach`) → Act (page object/facade call) → Assert (in the spec).
- Tests must not depend on each other or on execution order (`fullyParallel: true` assumes this).
- No conditional logic (`if/else`) inside specs. Conditionals belong in page objects/facades if the flow itself branches (e.g. payment method), never in the test body.

## 4. Waits & synchronization

- No hard sleeps, ever.
- Prefer Playwright auto-waits and explicit element-state waits over `waitForLoadState('networkidle')`, which is flaky by nature.
- Timeouts live in `playwright.config.ts`, not as magic numbers scattered in specs. If a one-off timeout override is unavoidable, justify it with a comment.

## 5. Locators

- Order of preference: `data-test` attributes → role/accessible name (`getByRole`, `getByText`) → CSS → XPath as a last resort.
- Locators live only inside page objects. Specs and `ShopFacade` call page-object methods/properties, never `page.locator(...)` or `page.getByRole(...)` directly.

## 6. Test data

- Static data lives in `data/`, never inline in specs.
- No hardcoded credentials in source — load `USERS.customer.password` (and any other secret) from environment variables via `.env`.
- `.env` and any generated auth/session state (e.g. `auth.json`) must be in `.gitignore`.

## 7. Assertions

- Assertions belong only in specs, never in page objects or `ShopFacade`.
- Include a failure message on `expect(...)` whenever the assertion isn't self-explanatory.

## 8. Configuration

- `BASE_URL`, timeouts, and retries stay in `playwright.config.ts` / env vars so the suite runs unchanged locally, in CI, and across environments.

## 9. Reliability & flakiness

- Track and fix or quarantine flaky tests — don't paper over them with retries.
- Keep `retries: 0` locally; if CI needs retries, set them at the framework level (`playwright.config.ts`), log them, and keep the count low.

## 10. Reporting & debugging

- Keep `screenshot: only-on-failure` and `trace: retain-on-failure` enabled.
- Tag tests with `@smoke` (fast, PR-gating subset) in addition to `@regression` (full suite), so CI can run a quick check before the full run.

## 11. Code quality

- Apply the same review bar as production code: lint, format, and review test code too.
- No dead or duplicate logic — if a helper already exists in a page object or `ShopFacade`, reuse it instead of reimplementing it elsewhere (e.g. don't hand-roll locators in `utils/`).
- Remove scratch/demo specs before merging; `tests/` should contain only real feature coverage.

## 12. CI/CD

- Run `@smoke` on every PR; run the full `@regression` suite nightly or on merge to main.
- A failing test blocks the merge — don't let failures pile up.
- Run tests in parallel; this requires tests to stay independent (see §3).

## Known gaps to address

These were flagged against the current codebase and aren't yet fixed:

- Specs bypassing page objects with inline locators: `tests/cart/cart.spec.ts`, `tests/checkout/checkout.spec.ts`.
- Duplicate/dead logic in `utils/helpers.ts` (reimplements `ShopFacade.addToCart` and the login flow in `tests/auth.setup.ts`).
- Hardcoded password in `data/users.ts`.
- `auth.json` not excluded in `.gitignore`.
- `waitForLoadState('networkidle')` used in `pages/base.page.ts`, `common_actions/shop.facade.ts`, and `utils/helpers.ts`.
- `tests/cart/cart_static_checks.spec.ts` is a leftover demo file with no real assertions.
- No ESLint/Prettier config.
- No CI workflow (`.github/workflows`).
- Only `@regression` tag exists; no `@smoke` subset.
- `npm test` only runs test `C01` in headed mode — it is not a stand-in for the full suite.
