# Coding Guidelines

Style and quality rules for this repo. `CLAUDE.md` documents _architecture_ (what lives where and why); this doc documents _how to write it_. When they overlap, `CLAUDE.md` wins on structure, this doc wins on style.

## TypeScript

- `tsconfig.json` has `strict: true` — keep it that way. Don't add `// @ts-ignore` or loosen strictness to silence an error; fix the type instead.
- Named exports only. No `export default` anywhere in this repo — stay consistent.
- `async/await` only. No `.then()`/`.catch()` chains.
- Avoid `any`; if you truly need it, it should be rare and obvious why.
- Interfaces are plain PascalCase nouns (`AddressData`, `PaymentData`) — no `I` prefix.
- Small, page-specific data shapes (form inputs, etc.) can live as an `interface` colocated in the page object that consumes them, matching `checkout.page.ts`/`contact.page.ts`. Larger, reusable test data goes in `data/` as a plain object instead (see below) — don't invent a third pattern.

## Naming

| What               | Convention                     | Example                                  |
| ------------------ | ------------------------------ | ---------------------------------------- |
| Page object file   | `<feature>.page.ts`            | `cart.page.ts`                           |
| Spec file          | `<feature>.spec.ts`            | `checkout.spec.ts`                       |
| Facade file        | `<name>.facade.ts`             | `shop.facade.ts`                         |
| Class              | PascalCase, role-suffixed      | `CartPage`, `ShopFacade`                 |
| Interface          | PascalCase noun, no `I` prefix | `PaymentData`                            |
| Method / variable  | camelCase                      | `addToCartAndGoToCheckout`               |
| Data-file constant | SCREAMING_SNAKE_CASE           | `PRODUCTS`, `USERS`                      |
| Locator field      | camelCase, role/type-suffixed  | `searchInput`, `proceedToCheckoutButton` |

Keep new filenames kebab/dot-case — `cart_static_checks.spec.ts` is a pre-existing outlier, not the pattern to copy.

## Page Object Model (`pages/`)

- Static locators are `readonly` class fields built in the constructor. Locators that depend on runtime input (an item name, a label) are methods returning `Locator`, e.g. `getItemQuantityInput(itemName: string): Locator`.
- Locator priority: `getByRole` / `getByLabel` / `getByText` first; `[data-test="..."]` only when there's no accessible role/label to hook into.
- Action methods are `async`, verb-first, camelCase (`searchFor`, `fillAddress`, `addToCart`).
- Page objects hold locators and actions only — **no assertions**. Assertions belong in specs.
- No try/catch for expected UI states; rely on Playwright's built-in auto-waiting and web-first assertions in the spec instead of manual error handling.

## Facade (`common_actions/`)

- Only add a facade method when a multi-page workflow is reused by more than one spec file. A single spec's own setup can call page-object methods directly in its `beforeEach`.
- Name facade methods by the steps they chain, e.g. `addToCartAndGoToCheckout` composes `addToCart` + navigation to checkout — the name should tell you the composition without reading the body.

## Data (`data/`)

- Plain `export const NAME = {...}` object literals, `SCREAMING_SNAKE_CASE`, grouped/nested by concern (`PRODUCTS.search.validKeyword`).
- No hard-coded literals inline in specs for anything reusable — put it in `data/` instead.

## Tests (`tests/`)

- Import `{ expect, test }` from `../../fixtures` — never `@playwright/test` directly (the one sanctioned exception is `auth.setup.ts`, which needs `test as setup`).
- One `test.describe('<Feature>', ...)` per spec file.
- Every test title: `"<ID> <lowercase description> @regression"` — check the feature's existing spec file for the next free ID (`C`=cart, `CH`=checkout, `CT`=contact, `P`=product) rather than guessing.
- Assertions are web-first (`await expect(locator).toBeVisible()`, `.toHaveText()`, `.toHaveCount()`, ...). Never use `waitForTimeout`.
- Tests are independent: set up state via `beforeEach` + fixtures/`shopFacade`, never by relying on another test's side effects or execution order.
- Prefer a case-insensitive regex for copy that might reasonably change wording (`/no products found/i`) over an exact string match, matching existing specs.

## Verifying real app behavior

Before writing an assertion whose expected text/locator/DOM-state you don't already know from existing code, verify it against the live app — don't guess. Prefer the Playwright MCP server configured in `.mcp.json` (`browser_navigate`, `browser_snapshot`, `browser_click`, etc.) to drive the real app interactively; a disposable Node/TS script with `chromium.launch()` is the fallback if MCP tools aren't available. See the `test-automation` skill for the full workflow.

## Linting & formatting

ESLint (`eslint.config.mjs`, TypeScript + `eslint-plugin-playwright` rules) and Prettier (`.prettierrc.json`) are configured. Before committing:

```bash
npm run lint          # eslint .
npm run lint:fix       # eslint . --fix
npm run format         # prettier --write .
npm run format:check   # prettier --check .
npx tsc --noEmit       # type-check
```

These are not yet wired into a CI/pre-commit hook — run them manually until that's set up.

## Git hygiene

`.gitignore` excludes `node_modules/`, `dist/`, `test-results/`, `playwright-report/`, `auth.json`, and `.env`. `auth.json` holds storage-state (session) data from `tests/auth.setup.ts` and `.env` may hold secrets like `BASE_URL` overrides or credentials — never commit either. Generated report/output directories don't belong in version control.
