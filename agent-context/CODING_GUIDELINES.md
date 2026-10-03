# Coding Guidelines

Audience: SDETs contributing Playwright + TypeScript tests. Keep tests readable, independent, and deterministic.

## 1. Structure & layering

- **Specs** state intent only. No locators, no raw `page.` calls, no navigation logic.
- **Page Objects** own locators and single-page actions. They return data/state and do not assert (minimal, explicit `expectXxx` helpers are the exception).
- **Facade/flows** own multi-page journeys. Add a new cross-page flow there; never copy it between specs.
- **Data** lives in `data/`, typed. No inline literals in specs. Use factories/builders for dynamic data.
- One page object per page/component. Share behavior via composition or a common base, not copy-paste.

## 2. Naming & files

- Files: `kebab-case.spec.ts`, `xxx.page.ts`. Classes: `PascalCase`.
- Methods verb-first (`addToCart`); locators are nouns (`submitButton`).
- One feature area per spec file, one `test.describe` per feature.
- Test title: `ID – should <outcome> when <condition>`. IDs are area-prefixed, unique, never reused.

## 3. TypeScript

- `readonly` locators.
- `interface`/`type` for data shapes; union types/enums over magic strings.

## 4. Locators (in priority order)

1. `getByRole`
2. `getByLabel` / `getByPlaceholder` / `getByText`
3. `getByTestId`
4. CSS — last resort, with a comment explaining why

No XPath. No `nth`/positional selectors unless position is what's under test. Scope with chained locators rather than long selectors.

```ts
// good
readonly addToCartButton: Locator = page.getByRole('button', { name: 'Add to cart' });
// bad
readonly addToCartButton = page.locator('div > div:nth-child(3) button.btn');
```

## 5. Assertions & waiting

- Wait on state (locator, URL, response), never time.
- Use `waitForResponse` for network-dependent steps.
- Assert observable outcomes, not implementation details.
- One logical behavior per test; `expect.soft` is fine for grouped checks of one outcome.
- Every test must be able to fail.

## 6. Test design

- Tests are independent, order-agnostic, and parallel-safe. Each owns its data and cleanup.
- Set up via API/storage state, not UI, unless the UI is what's under test.
- Go beyond the happy path: boundaries, invalid/empty input, unstated assumptions.
- Tags: `@smoke`, `@regression`, `@negative`, `@boundary`.
- Parameterize with typed data tables instead of duplicating tests.
- Live/shared site: don't assume exclusive state; document known-flaky external dependencies.
- Known bugs: `test.fail()` / `test.fixme()` with an issue link. Never silently skip or delete.

## 7. Stability & flakiness

- No retries locally. CI retries max 1–2 with `trace: 'on-first-retry'`.
- Flaky test: tag for quarantine and raise a ticket within 1 day; fix or delete.
- Timeouts live in `playwright.config.ts`, not scattered through tests.

## 8. Comments

- Comments explain _why_, not _what_. No commented-out code.

## 9. Secrets & config

- No credentials in the repo. Use gitignored `.env` plus a committed `.env.example`, read via one typed config module.
- Environment comes from config, never hard-coded in tests.

## 10. Review & contribution

Before opening a PR:

- [ ] Affected tests pass 3× locally
- [ ] New test IDs are unique
- [ ] CLAUDE.md/docs updated if structure changed

Reviewers check: layering respected, locator priority, test can fail, data isolated. Small PRs, one feature area each; conventional commit messages.
