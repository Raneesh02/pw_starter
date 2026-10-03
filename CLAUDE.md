# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Playwright + TypeScript test framework for the demo shop https://practicesoftwaretesting.com (a workshop starter repo). Tests run against the live demo site — there is no local app to start.

## Commands

```bash
npm install && npx playwright install chromium   # one-time setup
npx tsc --noEmit                                  # typecheck (no build step exists otherwise)
npm run lint                                      # ESLint (lint:fix to autofix)
npm run format:check                              # Prettier check (npm run format to write)

npx playwright test                               # run full suite
npx playwright test tests/cart/cart.spec.ts       # run one file
npx playwright test --grep "C01"                  # run one test by its ID (e.g. C01, CH03, P05)
npx playwright test --grep "@regression"          # run by tag
npm run test:headed                               # headed mode
npm run test:ui                                   # Playwright UI mode
npm run test:report                               # open last HTML report
```

Note: `npm test` only runs the `C01` test in headed mode — it is a quick smoke check, not the suite.

ESLint (`eslint.config.mjs`, flat config with `typescript-eslint` + `eslint-plugin-playwright`) and Prettier (`.prettierrc`: single quotes, semicolons, trailing commas, 100 cols) enforce `agent-context/CODING_GUIDELINES.md`. Rules with existing violations (`no-nth-methods`, `no-networkidle`, raw `page.*`/`locator()` in specs, test-title format) are set to `warn`; new code should not add to them.

## Architecture

- **`pages/`** — Page Object Model classes (`HomePage`, `ProductPage`, `CartPage`, `CheckoutPage`, `LoginPage`, `AccountPage`). Each declares its own `Locator` fields in the constructor; only `BasePage` exists as a shared base (with `navigate()`), but the concrete page classes above do not currently extend it.
- **`common_actions/shop.facade.ts`** — `ShopFacade`, a facade over multiple page objects for multi-step flows spanning pages (e.g. `addToCartAndGoToCheckout`, `fullGuestCheckout`). Add new cross-page flows here rather than duplicating navigation logic inside spec files.
- **`fixtures/index.ts`** — custom Playwright `test`/`expect`, extending base `test` with fixtures for each page object (including `loginPage`, `accountPage`) plus `shopFacade`. Specs import `test`/`expect` from `../../fixtures`, not from `@playwright/test` directly.
- **`data/`** — static test data (`users.ts`, `products.ts`) imported by specs; `users.ts` reads the admin password from `ADMIN_PASSWORD` (see `.env.example`; `.env` is gitignored); keep new fixtures/test data here rather than inlined in specs.
- **`utils/helpers.ts`** — standalone helper functions duplicating some facade/page logic; not currently imported by any spec. Prefer the fixtures/facade pattern for new tests over adding to this file.
- **`tests/auth.setup.ts`** — Playwright setup project that logs in via UI and saves storage state to `auth.json` (gitignored); run via `npm run setup`. Note: no project in `playwright.config.ts` currently depends on this setup or consumes `auth.json` as `storageState`.
- Test IDs are prefixed by feature area and are how tests are usually targeted with `--grep`: `P` (product), `C` (cart), `CH` (checkout), `A` (account/login). Tests are also tagged `@regression`.
- **`.claude/skills/pw-test-writer/`** — project skill that generates new Playwright specs (plus supporting page-object/facade/data changes) matching this repo's conventions; triggered by `/pw-test-writer` or natural-language "write/add a test for..." requests.
- **`.claude/skills/pw-code-review/`** — project skill that reviews changes (git diff by default) against `agent-context/CODING_GUIDELINES.md`; static review only (no test runs, lint, tsc or format checks), report-only. Triggered by `/pw-code-review` or "review my changes/spec" requests. Dispatches three report-only sub-agents in parallel (`.claude/agents/pw-code-guidelines-reviewer.md`, `pw-architecture-reviewer.md`, `pw-security-reviewer.md`) for the guidelines, architecture and security passes, then merges their findings.
- **`evals/pw-code-review/`** — starter eval for the review skill: `npm run eval:review [-- <task-id>]` applies each `tasks/*.diff` to `main` in a throwaway worktree, runs `claude -p "/pw-code-review"`, and greps the report against `tasks.json` (PASS/FAIL per task; reports in gitignored `results/`). Evaluates the skill as committed on `main`.
- **`.claude/agents/`** — custom agent definitions (`tools:`-restricted via frontmatter) used by skills: `pw-code-guidelines-reviewer`, `pw-architecture-reviewer`, `pw-security-reviewer` (`Read, Grep, Glob, Bash`; report-only by instruction).

- **`.github/workflows/ai-review.yml`** — PR comment `ai_review` (collaborators only) runs `anthropics/claude-code-action` with the `pw-code-review` skill and posts one PR review with inline per-line comments (agent writes `review.json`, a workflow step posts it, falling back to a summary-only review on a 422); gated on the `static-checks` commit status (comment `static_check` first) and sets an `ai-review` status. Requires the `CLAUDE_CODE_OAUTH_TOKEN` repo secret (generate with `claude setup-token`).

## References

- **`agent-context/CODING_GUIDELINES.md`** — coding standards for SDETs (layering, naming, locators, assertions, test design, review checklist). Follow it for all new code.
- **`agent-context/reference.md`** — guidance for writing parameterized (data-driven) test cases.
