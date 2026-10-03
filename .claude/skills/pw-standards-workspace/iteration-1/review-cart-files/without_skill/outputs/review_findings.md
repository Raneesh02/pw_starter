# Cart Files Review Findings

Files reviewed:
- `tests/cart/cart.spec.ts`
- `pages/cart.page.ts`

---

## HIGH

### H1 — Shared mutable `itemName` in `describe` scope causes parallel-test race conditions (`cart.spec.ts` line 5)

```ts
let itemName = '';
test.beforeEach(async ({ shopFacade }) => {
  itemName = await shopFacade.addToCartAndGoToCart(PRODUCTS.search.validKeyword);
});
```

The project runs tests fully in parallel (`playwright.config.ts`). A `let` variable captured in the `describe` closure is shared across worker instances, so concurrent tests can overwrite each other's `itemName` and read the wrong value. Each test must own its state. Fix: move the `beforeEach` result into a per-test local variable (use a test-scoped fixture or declare `itemName` inside each test that needs it).

---

### H2 — `CartPage.navigate()` goes to `/checkout` instead of `/cart` (`pages/cart.page.ts` line 22)

```ts
async navigate() {
  await this.page.goto('/checkout');
}
```

The method is named `navigate()` on `CartPage` but navigates to the checkout URL. Any consumer calling `cartPage.navigate()` expecting the cart page will silently land on the wrong route and tests will fail in unexpected ways. (CLAUDE.md §"Known quirks" acknowledges this but it remains a real defect that should be fixed or the method should be renamed/documented to match its actual behaviour.)

---

## MEDIUM

### M1 — Locators and navigation inline in spec instead of page objects (`cart.spec.ts` lines 20–21)

```ts
await page.locator('[data-test="add-to-cart"]').click();
await page.goto('/cart');
```

CLAUDE.md convention: "Locators belong in page objects, not specs." Both the `[data-test="add-to-cart"]` locator and the raw `page.goto('/cart')` call should live in a page object or the `ShopFacade`, not directly in a spec.

---

### M2 — Assertions in C03/C04 do not verify the real outcome (`cart.spec.ts` lines 30, 38–39)

```ts
await input.fill('3');
await input.press('Tab');
await expect(input).toHaveValue('3');
```

Asserting that an input has the value you just typed is trivially true and does not confirm the cart accepted the change. CLAUDE.md convention: "Assert the real outcome (a value, an order, or a count), not only that something is visible." A meaningful assertion would verify the cart total or line-item subtotal updated to reflect the new quantity, or that a page reload still shows the new quantity.

---

### M3 — `getItemRemoveButton` uses fragile CSS and position-based selectors (`pages/cart.page.ts` line 30)

```ts
return this.page
  .getByRole('row', { name: new RegExp(itemName) })
  .locator('img[src*="trash"], img[alt*="delete"], td:last-child img')
  .last();
```

This mixes three different fallback strategies. `td:last-child img` is position-based (explicitly prohibited by CLAUDE.md). `img[src*="trash"]` couples the locator to a specific asset path that could change. Preferred strategy: use a `[data-test=...]` attribute on the remove button, or at minimum a `getByRole('button', { name: /remove/i })` scoped inside the row.

---

### M4 — `cartTotal` locator uses parent traversal and positional `.last()` (`pages/cart.page.ts` line 16)

```ts
this.cartTotal = page
  .getByRole('cell', { name: 'Total' })
  .locator('..')
  .getByRole('cell')
  .last();
```

`locator('..')` parent traversal and `.last()` are fragile: adding or reordering columns breaks the locator silently. If the site exposes a `[data-test=...]` attribute on the total cell, that should be used instead. If not, scope the search to the `tfoot` row containing the "Total" cell rather than traversing to the parent and then picking the last sibling.

---

### M5 — `updateQuantity` helper leaves the input in an unsaved state (`pages/cart.page.ts` lines 33–35)

```ts
async updateQuantity(itemName: string, qty: number) {
  await this.getItemQuantityInput(itemName).fill(String(qty));
}
```

Specs that change quantity (C03, C04, C07) all call `input.press('Tab')` after filling to trigger the cart update. The `updateQuantity` method only calls `fill()` and does not commit the change, making it unusable in its current form. It should call `.press('Tab')` (or dispatch a `change`/`blur` event) after filling, to match the real interaction the site expects.

---

## LOW

### L1 — C05 and C06 test the same action without clearly differentiated purposes (`cart.spec.ts` lines 42–51)

C05 asserts `rows` count drops to 0; C06 asserts the empty-cart text appears — both after removing the same single item. This is not wrong, but both tests share an identical action sequence. If removal is ever broken, both fail together without additional signal. Consider merging them into one test that checks both conditions, or make C06 start from a multi-item cart so it tests a distinct scenario.

---

### L2 — Missing `expect` messages on most assertions (`cart.spec.ts` lines 13, 23, 30, 38, 45, 50)

Only C07 includes an `expect` message (`'cart total should update after quantity change'`). CLAUDE.md convention: "use web-first `expect` with a message that states intent." All other assertions lack messages, making test-failure output less informative.

---

### L3 — `proceedToCheckoutButton` uses a numbered `data-test` attribute (`pages/cart.page.ts` line 18)

```ts
this.proceedToCheckoutButton = page.locator('[data-test="proceed-1"]');
```

The `-1` numeric suffix suggests this may be fragile if the page gains additional proceed buttons or the numbering changes. A role-based locator such as `page.getByRole('button', { name: /proceed to checkout/i })` would be more resilient and self-documenting.
