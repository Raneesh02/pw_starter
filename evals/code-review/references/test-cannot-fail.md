**Blocker**
- tests/cart/cart.spec.ts:25 — §5 — C02 never asserts anything (it only calls `cartPage.goto()` twice), so it can never fail — assert the product is still listed, e.g. `await expect(cartPage.cartItems).toHaveCount(1)`

tests: n/a
