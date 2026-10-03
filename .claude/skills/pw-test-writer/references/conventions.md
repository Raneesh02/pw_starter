# pw_starter test conventions

## Fixtures (`fixtures/index.ts`)

Specs always import from the custom fixture file, never `@playwright/test` directly:

```ts
import { expect, test } from '../../fixtures';
```

Available fixtures: `homePage`, `cartPage`, `checkoutPage`, `productPage`, `shopFacade` (composes `homePage`/`checkoutPage`/`productPage`). A new page object gets its own fixture entry in `fixtures/index.ts`, wrapped in `await use(new XPage(page))`.

## Page Objects (`pages/*.page.ts`)

Fields declared above the constructor, constructor assigns `this.page` then each locator; no parameter-property shorthand here (unlike `BasePage`/`ShopFacade`). `BasePage` exists (`navigate()`) but none of the concrete page classes extend it — keep that as-is.

Locator preference order: `getByRole(...)` first, then `[data-test="..."]`, then CSS class selectors as a last resort. A locator that depends on runtime data (e.g. an item name) becomes a **getter method**, not a field.

```ts
export class HomePage {
  readonly page: Page;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
  }

  async searchFor(keyword: string) {
    await this.searchInput.fill(keyword);
  }

  getItemRemoveButton(itemName: string): Locator {
    return this.page.getByRole('row', { name: itemName }).getByRole('button', { name: 'Remove' });
  }
}
```

Action methods are `async`, named as user-facing verbs (`searchFor`, `addToCart`, `fillAddress`).

## Facade (`common_actions/shop.facade.ts`)

Holds cross-page, multi-step flows. Constructor uses `private readonly` parameter properties. Build larger flows by composing smaller ones — never duplicate navigation logic inside spec files.

```ts
export class ShopFacade {
  constructor(
    private readonly page: Page,
    private readonly homePage: HomePage,
    private readonly checkoutPage: CheckoutPage,
    private readonly productPage: ProductPage,
  ) {}

  async addToCartAndGoToCheckout(keyword: string): Promise<void> {
    await this.addToCart(keyword);
    await this.page.goto('/checkout');
  }
}
```

## Test data (`data/*.ts`)

Plain literal objects/typed arrays only — no classes/builders.

```ts
export type QuantityCase = { id: string; qty: number };

export const QUANTITY_CASES: QuantityCase[] = Array.from({ length: 10 }, (_, i) => ({
  id: `C04-${String(i + 1).padStart(2, '0')}`,
  qty: i + 1,
}));

export const PRODUCTS = {
  search: { validKeyword: 'Pliers', invalidKeyword: 'xyzabc123' },
};
```

## Specs (`tests/<area>/<area>.spec.ts`)

One `test.describe('<Area>', ...)` per file (capitalized singular name). Shared arrange logic goes in `test.beforeEach`. Test title format:

```
'<PREFIX><NN> <lowercase description> @regression'
```

Prefixes taken so far: `P` (product), `C` (cart), `CH` (checkout) — zero-padded 2-digit, sequential, unique per file. Parameterized sub-cases use compound IDs (`C04-01`). Every title ends with `@regression`.

```ts
import { expect, test } from '../../fixtures';
import { PRODUCTS } from '../../data/products';

test.describe('Cart', () => {
  test.beforeEach(async ({ shopFacade }) => {
    await shopFacade.addToCartAndGoToCart(PRODUCTS.search.validKeyword);
  });

  test('C01 add single product appears in cart @regression', async ({ page }) => {
    const rows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
    await expect(rows).toHaveCount(1);
  });
});
```

Only destructure fixtures actually used in the test. Assertions are exclusively web-first async Playwright assertions (`toBeVisible`, `toHaveCount`, `toHaveValue`, `toHaveText`/`.not.toHaveText`, `toHaveURL`) — never `page.waitForTimeout`. Pass a descriptive message as the second arg to `expect()` when useful.

## Config facts relevant to writing tests (`playwright.config.ts`)

- `testDir: './tests'`, `baseURL` from `.env` (`BASE_URL`), defaults to the live demo site — page objects/specs use relative `page.goto('/path')`, never absolute URLs.
- Single `chromium` project, `timeout: 15000`, no retries, `trace: retain-on-failure`.
