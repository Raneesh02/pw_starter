---
name: review-playwright-test
description: Review Playwright + TypeScript test code in this repo (pw_starter, practicesoftwaretesting.com demo shop) against its static checks and framework conventions. Use this whenever the user asks to review, check, audit, or critique a test file, spec, page object, facade method, or a diff touching tests/, pages/, common_actions/, or fixtures/.
---

# Review a Playwright test for pw_starter

Review in the order below. Report findings as a short list (`file:line — issue — fix`), not an essay. See `CODING_GUIDELINES.md` at the repo root for the full rules this checklist is based on.

## Steps

1. **Static checks first.** Run `npx tsc --noEmit`. Flag any compile error. Also flag on read: `var` instead of `const`/`let`, double quotes instead of single, missing/wrong semicolons, inconsistent indentation (2 spaces), unused variables/imports, and other obvious lint/style issues.
2. **Framework conventions.** Check the file against the rules below.
3. **Test logic.** Check assertions and waiting behavior.
4. **Report.** List findings, most serious first. If nothing is wrong, say so briefly — don't invent findings.

## Framework convention checklist

- Specs import `test`/`expect` from `../../fixtures` (path depth may vary) — never from `@playwright/test` directly.
- No `new SomePage(page)` inside a spec. Page objects are used only via fixtures (`homePage`, `cartPage`, `checkoutPage`, `productPage`, `contactPage`, `shopFacade`).
- A new page object is registered in `fixtures/index.ts` (type + fixture). If it isn't, the spec can't actually use it as written.
- Multi-page setup (search → open product → add to cart → go to cart/checkout) goes through `ShopFacade` in `beforeEach`. Flag a spec that repeats these steps manually instead of calling the facade.
- Test data comes from `data/` (`PRODUCTS`, `USERS`, `data/contact.ts`). Flag hardcoded literals that look like they belong in test data.
- Locators: `getByRole` first, then `[data-test="..."]`. Flag brittle locators (CSS classes, text matches with no `data-test` fallback) when a `data-test` attribute would do.
- Title format: `'<ID> <what is verified> @<tag>'` with the correct area prefix (`C` cart, `CH` checkout, etc.) and `@regression` unless the area already uses another tag.

## Test logic checklist

- Every test has at least one real assertion — not just "the steps ran without throwing."
- No `waitForTimeout`. Waits are web-first assertions or the documented skeleton-card wait (`[class="card skeleton"]` hidden) before clicking product results.
- Assertions that could fail unclearly have a message (second arg to `expect`).
- Missing `await` on a Playwright action or assertion (common source of false-pass tests).

## Flag these regardless of context

- Edits to `playwright.config.ts`, `auth.json`, or `tests/auth.setup.ts` — storage state isn't wired in; flag any change that assumes it is.
- Use of `utils/helpers.ts` — superseded by `ShopFacade`.
- Timeout increases on a test — the suite default is 15s; flag any override without a stated reason.

## Finish

Reply with the findings list only (or "no issues found" if the checklist is clean). Don't rewrite the file unless the user asks you to fix it.
