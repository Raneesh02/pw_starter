# Triage Playbook & Known Quirks

Authoritative source: TEST_STRATEGY.md §7 (suites), §9 (entry/exit), §10 (defect
triage), §11 (known issues). This file is a working summary — if it disagrees with
TEST_STRATEGY.md, the doc wins.

## Known quirks — already tracked, do NOT silently "fix"

These are logged issues. If you hit one while authoring or triaging, don't rewrite it
as a drive-by fix unless the user explicitly asks you to address that issue number.

- **Issue #7**: `CartPage.navigate()` (pages/cart.page.ts) goes to `/checkout` while
  `ShopFacade` navigates to `/cart` — inconsistent on purpose (tracked), not a typo to
  "correct".
- **Issue #6**: `C99` in `tests/cart/cart_static_checks.spec.ts` is a workshop demo
  placeholder, currently mistagged `@regression` (should be `@demo`). It is not a real
  test — don't copy its pattern as a model for new tests.
- **Issue #8**: `utils/helpers.ts`'s `addProductToCart()` and `loginViaUI()` duplicate
  `ShopFacade` logic. New code should use the facade/page objects, not these. Its
  `parseCurrency()` is a legitimate pure helper, fine to reuse.
- **Issue #1**: Sort tests (P05/P06) don't actually verify sort order.
- **Issue #2**: Back-nav test CH05 only checks the URL, not page content.
- **Issue #3**: CH01/CH04 duplicate setup steps.
- **Issue #4**: CH02/CH03 use broad regex assertions on error text instead of a
  specific `data-test` element.
- **Issue #5**: Several specs build raw locators directly in the spec instead of going
  through a page object.
- **Issue #9**: ShopFacade/BasePage rely on `networkidle` and a `card skeleton` CSS
  class instead of waiting on a specific element/response.
- **Issue #10**: No `@smoke` tags exist yet on most tests, and there is no CI workflow.
- `tests/auth.setup.ts` writes `auth.json`, but no `playwright.config.ts` project
  consumes it yet, and `auth.json` is not yet in `.gitignore` — don't assume storage
  state auth is wired up.

If you're asked to fix one of these specifically, treat the issue number as the
tracking reference in your commit/PR description.

## Failure triage checklist

When a test goes red:

1. Reproduce it in isolation: `npx playwright test --grep "<ID>"`. Check the HTML
   report / trace (`trace: retain-on-failure`) and the failure screenshot
   (`screenshot: only-on-failure`).
2. Determine whether the app's actual behavior is wrong (product bug), the test's
   logic/locators/data are wrong (test bug), or the failure is inconsistent across
   reruns with no clear cause (flaky).
3. **Product bug**: file/log it referencing the test ID + trace + screenshot, then mark
   the test `test.fail()` with a code comment linking the issue so the suite reports
   green while the underlying bug remains open and tracked.
4. **Test bug**: fix it within the same sprint. Never mask it with retries, added
   `waitForTimeout` calls, or loosened/broadened assertions — that just hides a future
   product regression.
5. **Flaky**: tag it `@flaky`, remove it from the tags used by gating runs
   (`@smoke`/`@regression`), and either root-cause and fix it within a week or delete
   the test. Don't leave `@flaky` tests unowned indefinitely.
6. Before declaring the run "clean": confirm no failure was skipped or bypassed without
   one of the three classifications above, and that no `test.skip`/`test.fixme` exists
   without a linked reason.
