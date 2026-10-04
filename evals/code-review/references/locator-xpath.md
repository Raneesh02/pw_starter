**Major**
- pages/cart.page.ts:11 — §4 — `removeButton` uses an XPath with a positional `tr[1]` and a class selector, which breaks the locator priority — use `page.getByRole('button', { name: 'Remove' })` or `getByTestId`

**Suggestion**
- pages/cart.page.ts:19 — — — `removeFirstItem` has no test covering it — add a spec that removes an item and asserts the cart is empty

tests: n/a
