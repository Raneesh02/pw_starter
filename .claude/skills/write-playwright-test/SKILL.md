---
name: write-playwright-test
description: Write new Playwright + TypeScript UI tests for this repo (pw_starter, practicesoftwaretesting.com demo shop) so they follow the project's fixtures, page objects, test data, ID/tag naming and locator rules. Use this whenever the user asks to add, write, create or automate a test, test case, spec or scenario (cart, checkout, product, contact, login, search, etc.), even if they only describe the scenario in plain words and never say "Playwright".
---

# Write a Playwright test for pw_starter

Follow the repo's conventions so new tests look like the existing ones and can be run alone with `--grep`.

## Steps

1. **Understand the scenario.** If the steps or expected result are unclear, ask one short question. Otherwise continue.
2. **Read before writing.** Open the closest existing spec in `tests/<area>/` and the page objects it uses in `pages/`. Reuse what is there.
3. **Pick the file.** Add to the existing `tests/<area>/<area>.spec.ts` if the area exists. Create a new folder and spec only for a new area.
4. **Pick the test ID.** Find the highest ID with that area's prefix (`grep` the folder) and use the next number. Prefixes: `C` cart, `CH` checkout, and follow the existing prefix for other areas. For a new area, choose a short new prefix and tell the user.
5. **Write the test** using the rules below.
6. **Verify.** Run `npx tsc --noEmit`, then `npx playwright test --grep "<ID>"`. If it fails, read the error, fix the test, and rerun. Do not report done until it passes, or say clearly that it does not.

## Rules

- **Imports:** `import { expect, test } from '../../fixtures';` — never from `@playwright/test`. Import data from `../../data/...`.
- **Fixtures:** use `homePage`, `cartPage`, `checkoutPage`, `productPage`, `contactPage`, `shopFacade` in the test arguments. Do not call `new SomePage(page)` in a spec.
- **Setup:** use `ShopFacade` in `beforeEach` for multi-page flows (`addToCartAndGoToCart`, `addToCartAndGoToCheckout`, `fullGuestCheckout`). Do not repeat search → open → add steps in a spec.
- **New page object:** put it in `pages/`, add its locators in the constructor, and **register it in `fixtures/index.ts`** (type + fixture), or the spec cannot use it. If logic spans several pages, add a method to `ShopFacade`.
- **Test data:** use `PRODUCTS` / `USERS` (and `data/contact.ts`) constants. If a value is missing, add it to `data/` instead of writing a literal in the spec.
- **Locators:** `getByRole` first, then `[data-test="..."]`. Keep locators in page objects when they are reused.
- **Waiting:** no fixed `waitForTimeout`. Use web-first assertions (`await expect(locator).toHaveText(...)`). The product list shows skeleton cards while loading, so wait for `[class="card skeleton"]` to be hidden before clicking results.
- **Title format:** `'<ID> <what is verified> @<tag>'`, for example `'C08 cart shows product price @regression'`. Use `@regression` by default. Add other tags only if the area already uses them.
- **Assertions:** every test must assert an outcome. Add a message to `expect` when the failure would be unclear.
- **Timeout:** tests have 15s. Do not raise it unless the user agrees.
- Match the surrounding code style (2-space indent, single quotes, semicolons).

## Do not

- Do not touch `playwright.config.ts`, `auth.json` or `tests/auth.setup.ts`. Storage state is not wired in, so tests start logged out.
- Do not use `utils/helpers.ts`; the facade replaces it.
- Do not commit or push.

## Finish

Reply briefly: which file and ID you added, the run result, and any new data, page object or facade method you created.
