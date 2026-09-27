---
name: code-review
description: Use when reviewing a diff, spec, page object, fixture, or PR in pw_starter against this repo's coding standards. Checks the change against CODING_STANDARDS.md and flags violations.
---

# Code Review (pw_starter)

Reviews changes in this repo against `CODING_STANDARDS.md`, the source of truth for conventions here. Read that file first if it's not already in context — don't restate its prose, apply it.

## What to review

- A git diff (`git diff`, `git diff main...HEAD`) when reviewing a branch or PR.
- Specific files when asked to review a spec, page object, fixture, or facade change.

## Checklist (mapped to CODING_STANDARDS.md sections)

1. **Structure** — new pages extend `BasePage`; multi-page flows added to `ShopFacade`, not duplicated in specs or one-off helpers.
2. **Naming** — test titles follow `<ID> <behavior> @tag`; page objects named `<Feature>Page`; facade methods named after the user flow.
3. **Test design** — Arrange/Act/Assert layout; no inter-test dependency; no `if/else` branching inside spec bodies.
4. **Waits** — no hard sleeps (`page.waitForTimeout`, `setTimeout`); no new `waitForLoadState('networkidle')`; no magic-number timeouts inline without justification.
5. **Locators** — `data-test` > role/accessible name > CSS > XPath; locators defined only in page objects, never inline in specs or `ShopFacade` (`page.locator(...)` / `page.getByRole(...)` in a `.spec.ts` file is a violation).
6. **Test data** — no inline literals that belong in `data/`; no hardcoded credentials; any new generated secrets/session files added to `.gitignore`.
7. **Assertions** — `expect(...)` only in specs, never in page objects/`ShopFacade`; meaningful failure messages on non-obvious assertions.
8. **Configuration** — no hardcoded URLs/timeouts that belong in `playwright.config.ts` or env vars.
9. **Reliability** — no retry logic added inside individual tests to mask flakiness.
10. **Reporting** — new regression tests tagged `@regression`; fast/critical-path tests also tagged `@smoke` where appropriate.
11. **Code quality** — no dead code or reimplementation of existing page-object/facade logic; no leftover scratch/demo tests.
12. **CI/CD** — changes to `playwright.config.ts` or scripts don't break the smoke/regression split or parallelization.

## How to report findings

For each violation found:
- Cite `file:line`.
- Name the specific CODING_STANDARDS.md section it violates.
- State the concrete fix (not just "this is bad").

Group findings by section, most severe first (correctness/security like hardcoded secrets or leaking locators outside page objects, before style/tagging nits). If nothing violates the standards, say so plainly — don't invent nitpicks.

Do not fix violations unless explicitly asked; this skill is for review only. If asked to also fix, apply the minimal change needed to satisfy the specific checklist item.
