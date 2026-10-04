# Writing Parameterized Test Cases

Guidance for turning repeated, single-case tests in this suite into data-driven ones. Applies to specs under `tests/<feature>/*.spec.ts`.

## When to parameterize

Parameterize when the same flow is repeated with only the input data changing — e.g. `P03`/`P04` (filter by category) or `P05`/`P06` (sort by option) in [tests/product/product.spec.ts](../tests/product/product.spec.ts) differ only in the value passed to `homePage.filterByCategory()` / `homePage.sortBy()`.

Don't parameterize when:
- Each case asserts something structurally different (different page, different facade flow).
- There are only 2 cases and combining them would hurt readability more than it saves lines.

## Pattern: loop over a data array with `test.describe` + `for`

Playwright has no built-in `test.each`. The idiomatic approach is a plain `for` loop that calls `test(...)` inside a `describe` block.

```ts
import { expect, test } from '../../fixtures';
import { PRODUCTS } from '../../data/products';

test.describe('Product filtering', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  const categoryCases = [
    { id: 'P03', label: PRODUCTS.categories.handTools },
    { id: 'P04', label: PRODUCTS.categories.powerTools },
  ];

  for (const { id, label } of categoryCases) {
    test(`${id} filter by ${label} shows results @regression`, async ({ homePage }) => {
      await homePage.filterByCategory(label);
      await expect(homePage.productCards.first()).toBeVisible();
    });
  }
});
```

Key points:
- Keep the short ID (`P03`, `CH06`, ...) and the `@regression` tag in the generated title — targeted runs via `--grep` depend on both.
- Build the title string so each generated test has a unique, greppable name (`--grep "P03"` must still match exactly one test).
- Declare the case array with `const` directly above the loop, or import it from `data/` if it's reused across spec files.

## Where the case data lives

- **One-off cases** (used in a single spec file): define the array inline in the spec, near the `describe` block, as shown above.
- **Shared cases** (used across multiple specs, or long enough to clutter the spec): add them to the relevant file in [data/](../data/) as a plain exported array/object, following the existing style of `PRODUCTS` / `USERS` in [data/products.ts](../data/products.ts) and [data/users.ts](../data/users.ts).

```ts
// data/products.ts
export const CATEGORY_CASES = [
  { id: 'P03', label: PRODUCTS.categories.handTools },
  { id: 'P04', label: PRODUCTS.categories.powerTools },
];
```

Don't put case data in `utils/helpers.ts` — that file is legacy; prefer `data/` and the facade/page objects per [CLAUDE.md](../CLAUDE.md).

## Fixtures still apply

Parameterized tests use the same custom fixtures as any other test — import `test`/`expect` from `../../fixtures`, not `@playwright/test`. Destructure whichever fixtures the loop body needs (`homePage`, `shopFacade`, etc.) exactly as a normal test would.

## Parameterizing multi-step flows via the facade

For flows that go through `ShopFacade` (e.g. checkout variants), loop over case objects that describe the flow's inputs, and let the facade do the multi-step work:

```ts
const checkoutCases = [
  { id: 'CH04', user: USERS.customer, expectSuccess: true },
  { id: 'CH05', user: USERS.guest, expectSuccess: true },
];

for (const { id, user, expectSuccess } of checkoutCases) {
  test(`${id} checkout as ${user.email} @regression`, async ({ shopFacade, page }) => {
    await shopFacade.fullGuestCheckout(user);
    if (expectSuccess) {
      await expect(page.getByText(/order confirmed/i)).toBeVisible();
    }
  });
}
```

## Naming and tagging checklist

- [ ] Each generated test title still starts with a unique short ID.
- [ ] Each generated test title still includes `@regression` (or the appropriate tag).
- [ ] `npx playwright test --grep "<ID>"` matches exactly one test after parameterization.
- [ ] Case data is typed (avoid `any[]`) so `npx tsc --noEmit` catches shape mismatches.
- [ ] Shared case data lives in `data/`, not duplicated across spec files.

## Verifying

After parameterizing, confirm nothing was lost:

```bash
npx tsc --noEmit
npx playwright test --grep "@regression" --list   # confirm expected test count/titles
npx playwright test tests/<feature>/<file>.spec.ts
```
