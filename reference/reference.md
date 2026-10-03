# Guidance: Writing Parameterized Test Cases (Playwright)

This project doesn't yet have parameterized tests. This doc explains how to
add them consistently with the existing conventions (fixtures, POM, data
files, test IDs).

## When to parameterize

Use a parameterized test when the same steps repeat with only the input data
changing (e.g. sorting by different fields, filtering by different
categories, invalid search keywords). Don't parameterize when the assertions
or flow differ per case — write separate tests instead.

## Pattern: loop over a data array with `for...of`

Playwright doesn't have a built-in "parameterize" API — the idiomatic way is
a plain `for` loop over an array, generating one `test()` per entry so each
case shows up individually in the report and can be targeted with `--grep`.

1. Define the cases in `data/`, next to `products.ts` / `users.ts`.
2. Loop over them inside `test.describe`, using the case's own label in the
   test title so each still gets a distinct `T01`, `T02`... style ID.

### Example data file — `data/sortCases.ts`

```typescript
export const SORT_CASES = [
  { id: 'P05', label: 'price low to high', value: 'price,asc' },
  { id: 'P06', label: 'name A to Z', value: 'name,asc' },
  { id: 'P08', label: 'price high to low', value: 'price,desc' },
];
```

### Example spec — `tests/product/product.spec.ts`

```typescript
import { expect, test } from '../../fixtures';
import { SORT_CASES } from '../../data/sortCases';

test.describe('Product sorting', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  for (const { id, label, value } of SORT_CASES) {
    test(`${id} sort by ${label} @regression`, async ({ homePage }) => {
      await homePage.sortBy(value);
      await expect(homePage.productCards.first()).toBeVisible();
    });
  }
});
```

Each iteration produces its own named test (e.g. `P05 sort by price low to
high @regression`), so `--grep "P05"` or `--grep "@regression"` still work as
usual.

## Keep test data in `data/`, not inline in specs

Follow the existing convention: put the array of cases in a `data/*.ts` file
and import it into the spec, the same way `PRODUCTS` and `USERS` are used.
For cases specific to one spec file only, a local `const` array at the top
of the spec is acceptable, but shared/reusable cases belong in `data/`.

## Locators and assertions stay page-object based

Parameterization only changes *what values* are passed in — it doesn't
change where locators or actions live. Keep using page object methods
(`homePage.sortBy(...)`, `shopFacade.addToCart(...)`, etc.) inside the loop
body; don't inline CSS/XPath selectors into the data file.

## Naming and IDs

- Give each case an explicit `id` (e.g. `P05`) in the data so the generated
  test title keeps a stable, greppable ID — don't rely on array index.
- Keep the `@regression` tag (or other tags) on the generated title if the
  case should run as part of that suite.

## Independence

Each generated test must still be independent — set up state via
`shopFacade`/fixtures in `beforeEach`, not by relying on a previous
iteration's state.
