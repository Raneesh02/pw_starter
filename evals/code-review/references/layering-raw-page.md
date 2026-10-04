**Major**
- tests/cart/cart.spec.ts:22 — §1 — the spec calls `page.getByRole(...).click()` directly, so a locator and navigation step live in the spec — move it into a `HomePage` action (e.g. `openCart()`) and call that from the spec

**Suggestion**
- tests/cart/cart.spec.ts:17 — — — no negative case for an empty cart — add an `@negative` test that opens the cart with nothing added

tests: n/a
