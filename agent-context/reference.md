# Parameterized Test Cases

Guidance for writing data-driven (parameterized) tests in this repo. Playwright has no built-in `test.each` — parameterization is done with a plain `for` loop over a typed array, generating one `test()` per entry so each case shows up individually in the report and can be targeted with `--grep`.

## Pattern

1. Define the cases as a typed array in `data/`, not inline in the spec.
2. Loop over the array at the top of `test.describe`, calling `test()` once per case inside the loop.
3. Build the test title from the case data (and a test ID) so each run is uniquely identifiable in the report and `--grep`-able.

```ts
// data/products.ts
export type CategoryCase = {
  id: string; // e.g. 'P08'
  category: string;
};

export const CATEGORY_CASES: CategoryCase[] = [
  { id: 'P08', category: 'Hand Tools' },
  { id: 'P09', category: 'Power Tools' },
  { id: 'P10', category: 'Other' },
];
```

```ts
// tests/product/product.spec.ts
import { expect, test } from '../../fixtures';
import { CATEGORY_CASES } from '../../data/products';

test.describe('Product', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  for (const { id, category } of CATEGORY_CASES) {
    test(`${id} filter by ${category} shows results @regression`, async ({ homePage }) => {
      await homePage.filterByCategory(category);
      await expect(homePage.productCards.first()).toBeVisible();
    });
  }
});
```

## Rules

- **Data lives in `data/`.** Keep the case array next to the other static data (e.g. add to `data/products.ts` or `data/users.ts`) — don't inline arrays of cases in spec files.
- **Type the cases explicitly.** No `any`; define a named `type`/`interface` for each case shape.
- **Keep each test ID unique per generated case.** Follow the existing `P`/`C`/`CH` prefix convention (see main `CLAUDE.md`) and give every case its own ID (`P08`, `P09`, ...) rather than reusing one ID for a whole loop — this keeps `--grep "P08"` targeting a single case.
- **Put the varying value in the title**, not just the ID, so failures are readable in the HTML report without cross-referencing the data file.
- **Tag consistently.** Apply `@regression` (or another existing tag) the same way non-parameterized tests do, inside the generated title string.
- **One assertion focus per case.** Don't parameterize unrelated assertions into the same loop — if two dimensions vary independently (e.g. category and sort order), either use one array of combined cases or two separate `describe` blocks, whichever keeps failures unambiguous.
- **Avoid parameterizing just to avoid duplication of trivial tests.** If cases don't share the same arrange/act/assert shape, write them as separate tests instead of forcing a loop.
- **Fixtures still apply.** Parameterized tests use the same `test`/`expect` from `../../fixtures` and the same page-object/fixture pattern as regular tests — nothing about parameterization changes that.

## When to reach for this

Use this pattern when the same action + assertion shape needs to run across a set of inputs (multiple categories, multiple sort options, multiple invalid-input variants, boundary values for quantity fields, etc.) — a good fit for this project's "probe edge cases and boundary conditions" testing style. Don't use it for a single one-off case, or for cases with divergent flows (write those as individual tests).
