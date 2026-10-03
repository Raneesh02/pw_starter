# Coding Guidelines

Conventions for writing and reviewing test code in this repo. These describe what the existing code already does — follow them for new code, and use them as the checklist for reviews (see the `review-playwright-test` skill).

There is no lint step configured (no eslint/prettier). `npx tsc --noEmit` is the only automated static check — run it before every review and before every new test.

## Imports

- Specs import `test` and `expect` from `fixtures` (e.g. `import { expect, test } from '../../fixtures';`), never from `@playwright/test` directly.
- Test data is imported from `data/` (`PRODUCTS`, `USERS`, `data/contact.ts`), not hardcoded as literals in a spec.

## Structure

- **Page objects** (`pages/`) hold locators and single-page actions. `BasePage` exists with a `navigate()` that waits for `networkidle`, but current page objects define their own `page` field and locators directly in the constructor rather than extending it. Match the existing pattern unless asked to refactor it.
- **`ShopFacade`** (`common_actions/shop.facade.ts`) composes page objects into multi-page flows (search → open product → add to cart → go to cart/checkout). Use it in `test.beforeEach` for setup. Add a new facade method instead of repeating a multi-page flow inline in a spec.
- **Fixtures** (`fixtures/index.ts`) register every page object and the facade as test fixtures. A new page object must be added here (type + fixture) before a spec can use it. Specs never call `new SomePage(page)` directly.
- `utils/helpers.ts` is legacy and superseded by the facade. Do not add to it or import from it in new code.

## Locators

- Prefer `getByRole` first, then `[data-test="..."]` attributes.
- Keep locators inside page objects when they're reused across tests; keep one-off locators inline in the spec only when nothing else uses them.

## Waiting

- No fixed `waitForTimeout`. Use Playwright's web-first assertions (`await expect(locator).toHaveText(...)`, `.toBeVisible()`, etc.) so waits are tied to real state.
- The product list shows skeleton cards while loading — wait for `[class="card skeleton"]` to be hidden before clicking into product results (see `ShopFacade.addToCart`).

## Test data

- Use the constants in `data/` (`PRODUCTS`, `USERS`, contact fields). If a value a test needs doesn't exist yet, add it to `data/` rather than writing a literal in the spec.

## Naming and tagging

- Test titles: `'<ID> <what is verified> @<tag>'`, e.g. `'C08 cart shows product price @regression'`.
- ID prefixes group by area (`C` cart, `CH` checkout, etc.) and are what `--grep` targets for running a single test. Use the next free number for an existing prefix; pick a new short prefix for a new area.
- Default tag is `@regression`. Only add another tag if the area already uses one.

## Assertions

- Every test asserts a concrete outcome — a test that only exercises steps without checking a result is incomplete.
- Add a message as the second argument to `expect` when a bare failure wouldn't make the cause obvious.

## TypeScript / style

- 2-space indentation, single quotes, semicolons — match surrounding code.
- `const`/`let`, never `var`.
- No unused variables or imports.
- `npx tsc --noEmit` must pass with no errors.

## Config and timeouts

- Don't modify `playwright.config.ts`, `auth.json`, or `tests/auth.setup.ts`. Storage state isn't wired into the config, so tests run logged out by default.
- Default test timeout is 15s. Don't raise it on an individual test without a stated reason.

## Don't

- Don't commit or push without being asked.
- Don't install new dependencies without asking.
- Don't use `utils/helpers.ts`.
