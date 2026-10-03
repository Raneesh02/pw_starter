---
name: pw-test-writer
description: Generates new Playwright test spec files (and any needed page-object locators/facade methods/test data) for the pw_starter repo, following its exact fixtures/POM/facade/data/spec conventions. Use whenever the user asks to write, add, create, or generate a Playwright test, test case, test spec, or regression test for a page or user flow in this repo — e.g. "write a test for the cart quantity field", "add a test case for guest checkout", "generate a test for product search", or explicit invocation via /pw-test-writer. Also use when asked to add edge-case, boundary, or negative test coverage for an existing feature area (cart, checkout, product).
---

# pw-test-writer

Generate a new Playwright spec (or extend an existing one) for pw_starter, matching repo conventions exactly.

Before writing code, read:
- `references/conventions.md` (in this skill dir) — fixtures/POM/facade/data/spec/ID rules with worked snippets
- `references/checklist.md` (in this skill dir) — pre-flight/post-flight checklist
- `agent-context/reference.md` — only if this task is parameterized/data-driven

## Workflow

1. **Clarify scope.** If the feature/page/flow is ambiguous, ask one concise question rather than guessing. Identify which existing area this belongs to: `cart` (C##), `checkout` (CH##), `product` (P##), or a genuinely new area.
2. **Page objects.** Open `pages/*.page.ts` for the page(s) under test. If a needed locator or action method doesn't exist, add it there — never inline a raw `page.locator(...)` call in the spec. Parameterized locators become getter methods, not fields.
3. **Facade.** If the test needs a flow spanning more than one page, check `common_actions/shop.facade.ts` for an existing method; if none, add one there — never build cross-page navigation inline in the spec.
4. **Data.** If the test needs literal data, or is parameterized, add/extend a plain object or typed array in `data/`, not inline in the spec.
5. **Pick the next test ID.** Grep the target spec file for the highest existing ID of that prefix; use the next sequential zero-padded number. Parameterized cases use the compound `PREFIX##-##` form.
6. **Happy path + investigative coverage.** Don't stop at the literal happy-path case implied by the request — also consider boundary values, invalid/empty input, and unstated assumptions, adding them as additional sequential-ID tests (or a parameterized loop if they share arrange/act/assert shape), unless the user asked for happy-path only.
7. **Write the spec.** One `test.describe`, shared arrange in `beforeEach` via fixtures, only destructure fixtures actually used, title format `'<PREFIX><NN> <lowercase description> @regression'`, web-first async assertions only, no `page.waitForTimeout`.
8. **Validate.** Run `npx tsc --noEmit`, then run only the affected spec file (`npx playwright test tests/<area>/<area>.spec.ts`, optionally `--grep "<ID>"` for just the new test(s)). Fix and re-run on failure; never run the full suite.
9. **Structural changes.** If this task adds a new feature area (new page object / new fixture / new dir under `tests/`), note that `CLAUDE.md`'s Architecture section should be updated, and ask before editing `CLAUDE.md`.
10. Never commit or push without asking first. Keep the final response short — no preamble, no restated plan, just what was created/changed and the validation result.

## New feature area (no existing prefix/page object)

- Confirm the new prefix doesn't collide with the ones already taken: `P`, `C`, `CH`.
- Create `pages/<area>.page.ts` following the existing POM pattern (do **not** extend `BasePage` — none of the existing page objects do, despite it existing).
- Register the new page object as a fixture in `fixtures/index.ts` (and in `ShopFacade`'s constructor only if it participates in cross-page flows).
- Create `tests/<area>/<area>.spec.ts` starting at `<PREFIX>01`.
- Add `data/<area>.ts` only if the area needs its own static data; otherwise reuse `data/products.ts` / `data/users.ts` if genuinely shared.

## Existing feature area

- Reuse the existing page object(s), facade methods, and data files where possible; only extend them for genuinely missing locators/actions/data.
- Append new tests to the existing spec file, continuing the ID sequence — never renumber existing tests.
