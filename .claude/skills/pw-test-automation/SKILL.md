---
name: pw-test-automation
description: Guidance for this Playwright + TypeScript E2E repo (practicesoftwaretesting.com demo shop) for writing new tests, page objects, or ShopFacade methods, and for running or triaging test results (smoke/regression/demo, product bug vs test bug vs flaky). Use whenever adding/modifying a spec, page object, or facade method in this repo, or running/interpreting Playwright test output here.
---

# Playwright Test Automation (pw_starter)

This repo's source of truth is **CLAUDE.md** (conventions) and **TEST_STRATEGY.md**
(strategy, suites, triage process). This skill is a condensed, actionable summary —
if anything here conflicts with those docs, the docs win; re-read them and flag the
mismatch rather than trusting this file blindly.

## Authoring a new test / page object / facade method

**Test titles**: `<ID> <description> <@tag>`, e.g. `C03 increase item quantity @regression`.
- IDs are unique and never reused. Prefixes: `P` (product), `C` (cart), `CH` (checkout),
  `A` (auth, unused so far), `AC` (account, unused so far).
- Tags: `@smoke` (one P1 journey per area), `@regression` (all functional tests),
  `@demo` (workshop-only, never CI), `@flaky` (excluded from gating suites).

**Imports**: always `import { expect, test } from '../../fixtures';` — never import
from `@playwright/test` directly. Available fixtures: `homePage`, `cartPage`,
`checkoutPage`, `productPage`, `contactPage`, `shopFacade`.

**Locators** — in this priority order, and only inside page objects (never build raw
locators in a spec):
1. `getByRole` / `getByLabel`
2. `[data-test=...]`
3. CSS (last resort)
Never XPath, never position-based selectors.

**Setup**: any multi-step setup (search → add to cart → go to cart/checkout, guest
checkout, etc.) belongs in `ShopFacade` (`common_actions/shop.facade.ts`), called from
`test.beforeEach`. Do not copy-paste setup steps between specs. Do not use
`utils/helpers.ts`'s `addProductToCart()` / `loginViaUI()` — they duplicate ShopFacade
logic (tracked as issue #8); use the facade/page objects instead. `parseCurrency()` in
that file is a legitimate pure helper and is fine to use.
See `references/api-inventory.md` for the full ShopFacade/page-object method list before
adding a new method, to avoid duplicating an existing one.

**Assertions**: use web-first `expect(...)` with an intent message (the second arg
describing what's being verified), and assert the actual outcome — a value, an order,
a count — not just element visibility.

**Waits**: never `waitForTimeout`. Avoid `networkidle` in new code; wait on a specific
element or response instead.

**Independence**: every test must set up its own state and pass alone, in any order,
and in parallel with others. Never rely on another test's leftover state.

**Shared demo site**: never mutate the seeded account in `data/users.ts`. No load
testing. Any data your test creates must use a unique suffix (timestamp/random) so
parallel/rerun runs don't collide.

### Before calling authoring done
1. `npx tsc --noEmit` — must be clean.
2. Run the new test by ID: `npx playwright test --grep "<ID>"`.
3. Run it again alone/in isolation to confirm it doesn't depend on execution order or
   another test's state.
4. Confirm the tag matches its suite: one P1 journey per area = `@smoke`; everything
   functional = `@regression`; workshop-only example = `@demo` (never add `@demo` tests
   to CI-gating runs).

## Running and triaging

- Smoke (fast, every push/PR, <2 min): `npx playwright test --grep "@smoke"`
- Regression (PR to main + nightly, <10 min): `npx playwright test --grep "@regression"`
- Full suite: `npx playwright test`
- Single test by ID: `npx playwright test --grep "<ID>"`
- `npm test` is NOT the full suite — it only runs C01 headed. Don't use it to judge
  overall health.
- Entry criteria before trusting a run: project compiles, site is reachable, smoke
  passes. Exit criteria: 100% P1/P2 pass, every failure triaged, no `@flaky` test
  unticketed for >1 week, no untracked `skip`/`fixme`.

### Failure decision tree
For every red test, classify it as exactly one of:

1. **Product bug** (the app is actually broken) →
   - Log it with the test ID, trace, and screenshot.
   - Mark the test `test.fail()` with a comment linking the issue, so the suite stays
     green while the bug is open. Do not delete or silently skip the test.
2. **Test bug** (the test itself is wrong — bad locator, wrong assertion, stale data) →
   - Fix it in the same sprint.
   - Never paper over it with retries, `waitForTimeout`, or loosened assertions.
3. **Flaky** (intermittent, no clear product or test defect yet) →
   - Tag it `@flaky` and exclude it from gating suites (`@smoke`/`@regression`).
   - Fix within a week or delete it — don't let `@flaky` become permanent parking.

For the full known-quirks list (already-tracked issues you should NOT "fix" on your
own initiative — they have issue numbers in TEST_STRATEGY §11) and a more detailed
triage checklist, see `references/triage-playbook.md`.

## Playwright config notes
`playwright.config.ts`: `testDir: './tests'`, `fullyParallel: true`, `retries: 0`,
`timeout: 15000`, `baseURL` from `BASE_URL` env, screenshots on failure only, video off,
trace `retain-on-failure`, single `chromium` project. No tag/grep config is baked in —
all suite filtering is CLI-only (`--grep`).
