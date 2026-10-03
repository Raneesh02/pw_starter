# ShopFacade & Page Object Inventory

Authoritative source: `common_actions/shop.facade.ts` and `pages/*.ts`. This file is a
convenience index to check before adding a new method — if it's out of date, trust the
source files.

## ShopFacade (common_actions/shop.facade.ts)
Constructed from `(page, homePage, checkoutPage, productPage)` — note `cartPage` is
NOT injected into ShopFacade's constructor; ShopFacade cannot call CartPage methods
directly.

- `addToCart(keyword: string): Promise<string>` — search, open first result, add to
  cart, returns product name.
- `addToCartAndGoToCart(keyword: string): Promise<string>` — above + navigate to `/cart`.
- `addToCartAndGoToCheckout(keyword: string): Promise<void>` — above + navigate to
  `/checkout`.
- `fullGuestCheckout(keyword, guest: {email, firstName, lastName}, address: AddressData,
  payment: PaymentData): Promise<void>` — full guest checkout flow.

## Page objects

**pages/cart.page.ts**
- Locators: `cartTable`, `cartRows` (row role, excludes columnheader), `cartTotal`,
  `continueShoppingButton`, `proceedToCheckoutButton` (`[data-test="proceed-1"]`).
- Methods: `getItemQuantityInput(name)`, `getItemRemoveButton(name)`,
  `updateQuantity()`, `proceedToCheckout()`.
- `navigate()` goes to `/checkout`, NOT `/cart` — a known inconsistency with
  ShopFacade's `/cart` navigation (issue #7). Don't silently "fix" it.

**pages/product.page.ts**
- Locators mix `data-test` (`unit-price`, `category`, `brand`, `add-to-cart`) and
  `getByRole` (`heading level 1`, spinbutton 'Quantity', buttons). `relatedProducts`
  via a chained locator.
- Methods: `addToCart(qty = 1)`, `setQuantity(qty)`.

**pages/home.page.ts**
- Locators: `searchInput`/`searchButton`, `sortDropdown`, `productCards` (CSS class
  filter + role heading).
- Methods: `searchFor()`, `filterByCategory()`, `sortBy()`, `clickProduct()`,
  `getProductCardNames()`, `getCartBadge()`, `getPaginationButton()`.

**pages/checkout.page.ts**
- Exports `AddressData` / `PaymentData` interfaces.
- Guest/address/payment step locators (mostly `data-test`, some `getByLabel`).
- Methods: `continueAsGuest()`, `fillAddress()`, `fillPayment()`.

**pages/base.page.ts**
- Minimal: `navigate(path = '/')`. Effectively orphaned — HomePage, CartPage, etc. do
  NOT extend it; each defines its own `navigate()`. Don't assume new page objects
  should extend it unless asked to fix that.

## Data
- `data/products.ts` — `PRODUCTS` (includes `search.validKeyword` etc.)
- `data/users.ts` — `USERS`, the seeded demo customer. Never mutate this account's
  state via a test.

## Representative spec pattern (tests/cart/cart.spec.ts)

```ts
import { expect, test } from '../../fixtures';
import { PRODUCTS } from '../../data/products';

test.describe('Cart', () => {
  let itemName: string;
  test.beforeEach(async ({ shopFacade }) => {
    itemName = await shopFacade.addToCartAndGoToCart(PRODUCTS.search.validKeyword);
  });

  test('C01 add single product appears in cart @regression', async ({ cartPage }) => {
    await expect(cartPage.cartRows, 'cart should contain exactly one row').toHaveCount(1);
  });
});
```
