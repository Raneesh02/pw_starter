# Code Review Guidelines — pw_starter

Practical checklist for reviewing PRs in this repo. Grounded in the architecture and conventions already
documented in [CLAUDE.md](CLAUDE.md) — read that first; this file is the review-time checklist derived
from it, not a replacement for it.

Principle: **don't review what a tool already checks.** `tsc --noEmit` must pass before a human looks at
a PR. This checklist covers what `tsc` and Playwright's runner can't catch on their own.

## 1. Risk triage (check this first — decides how deep the review needs to go)

| Tier | Changed paths | What it means |
|---|---|---|
| **LOW** | Only `tests/**`, or value edits in `data/*.ts` | New/changed test logic only |
| **MEDIUM** | `pages/*.page.ts`, `common_actions/*`, new fixture entries, structural `data/*` changes | Shared surface — check who else consumes it |
| **HIGH** | `fixtures/index.ts`, `playwright.config.ts`, `tsconfig.json`, `tests/auth.setup.ts`, anything touching auth/storageState, `package.json`/lockfile, CI config | Framework-critical — always requires careful, full manual review, no matter how small the diff |

## 2. Framework compliance

- [ ] Specs import `test`/`expect` from `../../fixtures` (or the correct relative path to `fixtures/index.ts`), **never** directly from `@playwright/test`. A direct import silently loses every injected page object/facade.
- [ ] A new page object is registered in `fixtures/index.ts` (and passed into `ShopFacade`'s constructor if the facade needs it).
- [ ] New multi-step flows belong in `common_actions/shop.facade.ts`, not copy-pasted across specs or added to `utils/helpers.ts`. `helpers.ts` is legacy — it duplicates flows the facade already implements correctly; don't extend it.

## 3. Locator quality

- [ ] Prefer `getByRole` / `[data-test="..."]`, matching the existing style in `pages/*.page.ts`.
- [ ] Flag new raw CSS class/tag selectors (e.g. `[class="..."]`) unless there is genuinely no stable
      alternative — and if one is added, check whether it duplicates a locator that should instead live in
      a page object once, not be repeated inline in multiple files.
- [ ] Locators belong in page objects, not inline in specs. A spec calling `page.locator(...)` directly for
      something a page object could expose is a layering violation, not a style nit.

## 4. Test quality & assertions

- [ ] Assertions should check business-meaningful state (e.g. "total changed", "row removed"), not just
      "something rendered." A row-count-only check is acceptable for a smoke path but call it out if it's
      standing in for a stronger assertion the test's name promises.
- [ ] Negative/boundary cases aren't optional for anything claiming `@regression` — empty states, invalid
      input, error paths.
- [ ] No hard `page.waitForTimeout(...)` sleeps. This repo relies on `waitForLoadState('networkidle')` and
      explicit `waitFor({state:...})` — keep new waits consistent with that, and prefer web-first
      assertions (`expect(locator).toBeVisible()`, etc.) over manual polling.

## 5. Test isolation & data

- [ ] Static data in `data/*.ts` is shared across all fully-parallel tests — fine for read-only/guest flows
      against the public demo shop. Flag any new test that writes state without cleanup, or that could
      collide with another parallel test over the same shared record.
- [ ] No real/production credentials, card numbers, or PII — synthetic values only (this repo is already
      clean: `USERS`/payment data are synthetic).

## 6. Naming & tagging

- [ ] Test titles start with an ID (`C01`, `CH04`, `P07`, ...) and end with a suite tag (`@regression`,
      etc.) — required for `--grep` to work as documented in `CLAUDE.md`.
- [ ] Specs live under `tests/<feature>/`, one feature per folder.

## 7. Config / framework-critical changes (always human, always careful)

- [ ] Any change to `fixtures/index.ts`, `playwright.config.ts`, or `tsconfig.json` — confirm the change is
      actually wired end-to-end, not half-connected (e.g. a new `setup` project or `storageState` addition
      must be referenced from every project that should use it, not just declared).
- [ ] Dependency/lockfile changes reviewed on their own, never bundled silently into an unrelated test PR.

## 8. Hygiene

- [ ] No secrets, tokens, or real credentials in code, logs, or committed test data.
- [ ] `playwright-report/`, `test-results/`, and `auth.json` must not be committed — verify `.gitignore`
      actually excludes them before merging changes to it.
- [ ] No `test.only`/`it.only`, `debugger`, leftover `console.log`, or commented-out code.

## 9. What NOT to do in review

- Don't re-flag anything `tsc --noEmit` or a configured linter already catches — trust the tool, don't
  restate its output as a comment.
- Don't nitpick style where the repo has no stated convention.
- Don't block a PR on a coverage-gap judgment call alone — flag it, let a human decide if it's acceptable
  for that PR's scope.

## 10. Review comment format

State the category, severity, the concrete file/line evidence, and (where applicable) a citation to the
repo's own existing pattern — not just a generic rule. Example:

> **[Locator quality — Low]** `common_actions/shop.facade.ts:18` uses a raw class selector
> (`[class="card skeleton"]`). Every other locator in `pages/*.page.ts` uses `getByRole`/`data-test`.
> Consider adding a `data-test` hook upstream or centralizing this in `HomePage` instead of repeating it
> inline (it's duplicated in `utils/helpers.ts:9`).
