---
name: test-automation
description: Use when writing, extending, or fixing Playwright/TypeScript tests in this repo (pw_starter) — e.g. "add tests for the X page", "write a spec for Y", "extend the checkout tests", "add a page object for Z". Encodes this repo's fixture/POM/facade/data-file conventions, ID+@regression naming, and the required workflow of inspecting real app behavior with a throwaway script before writing assertions, so Claude doesn't guess or reverse-engineer patterns from scratch. Do not use for non-Playwright TypeScript work, reviewing/refactoring unrelated app code, or other repos.
---

# Test Automation (pw_starter)

Follow this workflow whenever adding or extending Playwright tests in this repo, instead of inferring conventions from scratch each time.

## Before you start

- Read [references/conventions.md](references/conventions.md) for the exact rules per file layer (fixtures, page objects, facade, data, specs).
- Read [references/commands.md](references/commands.md) for the exact commands to run.
- `CLAUDE.md` (project root) and `reference/reference.md` (parameterized tests) remain the source of truth for architecture — this skill summarizes them for quick lookup, it doesn't replace them.

## Golden-path workflow

1. **Check for existing coverage.** Look in `pages/`, `fixtures/index.ts`, and `data/` for a page object, fixture, or data file that already covers this feature. Reuse it — don't duplicate.
2. **Verify real app behavior before writing assertions — never guess.** If the page's actual locators, error text, success message, or post-action DOM changes aren't already known from existing code, inspect the live app before writing assertions. Prefer the Playwright MCP server (configured in `.mcp.json`, project scope) — use `browser_navigate` + `browser_snapshot`/`browser_click`/etc. to drive the real app interactively and read actual `data-test` attributes, validation/success copy, and DOM changes. If MCP tools aren't available, fall back to a disposable Node/TS script (using `@playwright/test`'s `chromium.launch()`) run headless against the real app. This step caught two wrong assumptions in a prior session — an assumed "form clears its values" turned out to actually be "the whole form is replaced by a success message div", and an initial error-locator strategy was wrong — both only caught by running against the live app. Treat this step as required, not optional busywork.
3. **Build/extend the page object** (`pages/<feature>.page.ts`): only locators (readonly `Locator` properties built in the constructor) and low-level actions. Prefer role-based locators (`getByRole`, `getByLabel`, `getByText`) with `[data-test="..."]` as fallback.
4. **Build/extend the data file** (`data/<feature>.ts`): plain exported const object holding test data. No literals hard-coded inline in specs.
5. **Wire the fixture**: add the new page object to `TestFixtures` and `test.extend` in `fixtures/index.ts`. If it participates in a cross-page flow, add a method to `ShopFacade` (`common_actions/shop.facade.ts`) instead of duplicating the flow in a spec.
6. **Write the spec** (`tests/<feature>/<feature>.spec.ts`):
   - Import `{ expect, test }` from `../../fixtures` — never from `@playwright/test` directly.
   - One `test.describe` per feature; `beforeEach` sets up state via fixtures/facade.
   - Each test titled `"<ID> <short description> @regression"`, using the next free number in the right ID prefix family (check existing specs for the last used number — don't hardcode from memory).
   - Assertions live in the spec (web-first only, e.g. `await expect(locator)...`); locators/actions live in the page object. Never use `waitForTimeout`.
7. **Type-check**: run `npx tsc --noEmit` and fix any errors.
8. **Run the spec for real**: `npx playwright test tests/<feature>/<feature>.spec.ts`. Never claim tests pass without actually executing them.
9. **On failures, trust the live app over assumptions.** Re-inspect with the throwaway script if needed, fix the page object or spec, rerun until green.
10. **Clean up** any throwaway inspection scripts or HTML dumps created in step 2 — don't leave them in the repo.
11. **Summarize** what was added/changed and the actual pass/fail result.

## Hard rules (never violate)

- Specs import `{ expect, test }` from `../../fixtures` only.
- Locators and low-level actions live in page objects; assertions live in specs.
- Locators prefer `getByRole`/`getByLabel`/`getByText`/`getByTestId` over CSS/XPath; `[data-test]` is a fallback, not a first choice.
- Web-first assertions only — never fixed waits (`waitForTimeout`).
- Tests are independent: set up state via `beforeEach` + fixtures/`shopFacade`, never by relying on another test's side effects.
- Test IDs (`C01`, `CT01`, `P01`, `CH01`, ...) plus the `@regression` tag on every test.
- Test data lives in `data/*.ts`, not inline in specs.
- `npm test` is a smoke command only (`--grep "C01" --headed`) — never treat it as "run the full suite."

## References

- [references/conventions.md](references/conventions.md) — detailed per-layer conventions with real examples.
- [references/commands.md](references/commands.md) — exact command cheat sheet.
- `CLAUDE.md` (project root) — authoritative architecture doc.
- `reference/reference.md` — parameterized test pattern.
