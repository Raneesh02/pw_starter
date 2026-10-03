---
name: conventions-review
description: Use when asked to review changed/new Playwright-TypeScript files in this repo (pw_starter) for convention compliance — e.g. "review this diff against our guidelines", "check this spec/page object follows conventions", "does this PR match our coding guidelines". Checks changes against CODING_GUIDELINES.md and CLAUDE.md layer by layer (page objects, facade, data, specs, fixtures). Do not use for general logic/correctness bug-hunting (use the built-in /code-review command for that) or for writing/extending tests (use the test-automation skill for that).
---

# Conventions Review (pw_starter)

Reviews changed files in this repo against `CODING_GUIDELINES.md` (style/convention rules) and `CLAUDE.md` (architecture). This skill checks **convention compliance only** — naming, structure, layering, lint/format. It does not hunt for logic bugs, race conditions, or flaky-test risk; point the user to the built-in `/code-review` command for that.

## Workflow

1. **Get the diff.** Use `git diff` / `git diff --stat` (or the specific files the user names) to see what changed. Don't review unrelated pre-existing code unless asked.
2. **Classify each changed file** by layer, since each has its own rule set:
   - `pages/*.page.ts` → Page Object rules
   - `common_actions/*.facade.ts` → Facade rules
   - `data/*.ts` → Data rules
   - `tests/**/*.spec.ts` or `tests/auth.setup.ts` → Spec rules
   - `fixtures/index.ts` → Fixture rules
   - Anything else (config, etc.) → general TypeScript rules only
3. **Walk the checklist below for each file's layer.** For every violation found, note: file + line, which guideline rule it breaks (cite the `CODING_GUIDELINES.md` section), and a concrete fix — not just "doesn't follow conventions."
4. **Report grouped by file**, most-significant issues first. If a file is fully compliant, say so briefly rather than staying silent (confirms the check ran).
5. **Suggest running enforcement tools** if the changes weren't already checked: `npm run lint`, `npx prettier --check .`, `npx tsc --noEmit`.

## Checklist

### All TypeScript files
- No `// @ts-ignore` or other strictness loosened to dodge an error — `tsconfig.json` has `strict: true`, fix the type instead.
- Named exports only — no `export default`.
- `async/await` only — no `.then()`/`.catch()` chains.
- No stray `any` without clear justification.
- Interfaces are plain PascalCase nouns (`PaymentData`, not `IPaymentData`).
- New filenames are kebab/dot-case (`<feature>.page.ts`, `<feature>.spec.ts`, `<name>.facade.ts`).

### Page objects (`pages/*.page.ts`)
- Static locators are `readonly` fields built in the constructor; locators needing runtime input are methods returning `Locator` (e.g. `getItemQuantityInput(itemName: string): Locator`).
- Locator priority: `getByRole`/`getByLabel`/`getByText` first, `[data-test="..."]` only when there's no accessible role/label.
- Action methods: `async`, verb-first, camelCase (`searchFor`, `addToCart`).
- **No assertions** in page objects — flag any `expect(...)` found here; it belongs in the spec.
- No manual try/catch for expected UI states — rely on Playwright's auto-waiting instead.

### Facade (`common_actions/*.facade.ts`)
- A new facade method is only justified if the workflow is reused by more than one spec file. If it's only used once, flag it — it should probably be inline in that spec's `beforeEach` instead.
- Method names should describe the steps composed (e.g. `addToCartAndGoToCheckout`), so the name alone documents the flow.

### Data (`data/*.ts`)
- Reusable literals are `export const NAME = {...}`, `SCREAMING_SNAKE_CASE`, grouped by concern — not hard-coded inline in a spec.
- Flag any spec that introduces a reusable-looking literal (a product name, user credentials, form values used more than once) without adding it to `data/`.

### Specs (`tests/**/*.spec.ts`)
- Imports `{ expect, test }` from `../../fixtures` — never `@playwright/test` directly (the sanctioned exception is `auth.setup.ts`, which needs `test as setup`).
- One `test.describe('<Feature>', ...)` per file.
- Every test title matches `"<ID> <lowercase description> @regression"`. Check the same spec file for the next free ID in its prefix family (`C`=cart, `CH`=checkout, `CT`=contact, `P`=product) — don't assume a number, verify it against the file.
- Assertions are web-first (`toBeVisible`, `toHaveText`, `toHaveCount`, ...). Flag any `waitForTimeout`.
- Setup happens via `beforeEach` + fixtures/`shopFacade` — flag any test that depends on another test's side effects or run order.
- Copy-matching assertions prefer a case-insensitive regex (`/no products found/i`) over a brittle exact string, when wording could reasonably vary.

### Fixtures (`fixtures/index.ts`)
- New page objects are added to both the `TestFixtures` type and the `test.extend` registration, following the existing `async ({ page }, use) => { await use(new XPage(page)); }` pattern.
- `expect` continues to be re-exported alongside `test` so specs never need `@playwright/test` directly.

### Linting & formatting
- If the diff wasn't already checked, note that `npm run lint`, `npx prettier --check .`, and `npx tsc --noEmit` should be run before merging.

## References

- `CODING_GUIDELINES.md` (project root) — source of truth this checklist is derived from; cite its section names in findings.
- `CLAUDE.md` (project root) — architecture reference for where things belong.
- For logic/correctness bugs (not convention issues), defer to the `/code-review` command instead of this skill.
