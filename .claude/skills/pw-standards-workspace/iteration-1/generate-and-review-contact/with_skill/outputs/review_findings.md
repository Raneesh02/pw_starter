# Review Findings — `tests/contact/contact.spec.ts`

Reviewed against `TEST_AUTOMATION_STANDARDS.md` generated in the same session.
Also cross-referenced against `pages/contact.page.ts` (the companion page object).

---

## Summary

**0 HIGH, 3 MEDIUM, 4 LOW findings**

The contact spec and page object are in good shape. The import, fixture wiring,
assertion style, and locator discipline all follow the project's conventions. The
`ContactPage.navigate()` override is a positive example — it correctly avoids
`networkidle` and waits for a key element instead. Findings below are maintainability
and convention issues, not correctness bugs.

---

## HIGH findings

None.

---

## MEDIUM findings

**[MEDIUM] tests/contact/contact.spec.ts:25–29**
Rule: violates §7 — raw locators must not be built inline in a spec (also §3,
"Where locators live")
Fix: The error-element assertions (`page.getByTestId('first-name-error')`, etc.) are
built with raw calls to `page.getByTestId(...)` directly in the spec. `ContactPage`
already has a `getFieldError(fieldTestId)` method that returns the locator via a
structured lookup (`page.getByTestId(testId).locator('..').getByRole('alert')`). CT02
and CT03–CT06 should call `contactPage.getFieldError('first-name-error')` etc. instead
of `page.getByTestId(...)` in the spec body.

```ts
// Current (in spec)
await expect(page.getByTestId('first-name-error'), '…').toBeVisible();

// Correct (via page object)
await expect(contactPage.getFieldError('first-name-error'), '…').toBeVisible();
```

---

**[MEDIUM] tests/contact/contact.spec.ts:64–69**
Rule: violates §3 ("no raw locators in specs") and §6 ("no raw locators in specs")
Fix: CT07 uses `page.getByTestId('nav-contact')` and `page.getByTestId('first-name')`
directly in the spec. The nav-contact link belongs in `HomePage` (it's a navigation
element on the home page, or in a shared nav page object). The `first-name` input
is already exposed as `contactPage.firstNameInput`. CT07 should be rewritten to use
those page-object members:

```ts
// page.getByTestId('nav-contact')  →  homePage.contactNavLink  (add to HomePage)
// page.getByTestId('first-name')   →  contactPage.firstNameInput  (already exists)
```

---

**[MEDIUM] tests/contact/contact.spec.ts:3–9**
Rule: violates §9 — reusable static form-payload constants should live in `data/`,
not as inline `const` objects inside the spec
Fix: `VALID_PAYLOAD` is a test-data constant reused across six tests. It belongs in
`data/contact.ts` (create if not present) and should be imported:

```ts
// data/contact.ts
export const CONTACT_PAYLOADS = {
  valid: {
    firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@example.com',
    subject: 'webmaster',
    message: 'This is a test message that is long enough to pass validation requirements.',
  },
};

// spec
import { CONTACT_PAYLOADS } from '../../data/contact';
```

---

## LOW findings

**[LOW] tests/contact/contact.spec.ts:18**
Rule: violates §6 — test ID prefix is `CT` but the project's defined prefix list in
`TEST_STRATEGY.md` §5 and `CLAUDE.md` only define `P`, `C`, `CH`, `A`, `AC`. The
Contact area is listed as P4 coverage in TEST_STRATEGY §11. `CT` is a reasonable
extension but it is not yet officially registered in the strategy doc.
Fix: Add `CT` (Contact) to the ID-prefix table in `TEST_STRATEGY.md` §5 to make it
official. No code change needed in the spec itself — the `CT` prefix is fine once
documented.

---

**[LOW] tests/contact/contact.spec.ts:18 and 64**
Rule: violates §7 — CT01 and CT07 are both tagged `@smoke` but CT01 asserts only
`.toBeVisible()` on the success alert rather than asserting the content of the
confirmation message.
Fix: This is a low-severity observation since `.toBeVisible()` is acceptable when
"a banner appeared" is the real outcome. However, asserting the banner's text content
(e.g. `toContainText('Thanks for your message')`) would give more confidence that
the correct confirmation was shown:

```ts
await expect(contactPage.successAlert, 'success banner should confirm submission').toContainText('Thanks');
```

---

**[LOW] tests/contact/contact.spec.ts:11**
Rule: violates §6 — `test.setTimeout(45000)` is three times the global 15s timeout
configured in `playwright.config.ts`. The comment-less override may surprise a reader.
Fix: Add a brief inline comment explaining why the extended timeout is needed for this
suite, e.g.:

```ts
// Extended: contact form waits for a server-side email queue; 15s is too tight.
test.setTimeout(45000);
```

---

**[LOW] pages/contact.page.ts:22**
Rule: violates §3 ("locator strategy") — `successAlert` uses `.locator('.alert-success')`,
a CSS class name. The priority order in §3 prefers semantic locators first. If the
success element carries a `data-test` attribute on the live site, prefer
`page.getByTestId('alert-success')` or `page.getByRole('alert')`.
Fix: Check whether `<div class="alert-success">` has a `data-test` attribute or an
ARIA role of `alert` on the live site. If so, update to `page.getByRole('alert')` or
`page.getByTestId(...)`. If not, `.locator('.alert-success')` is acceptable given the
constraint — add a comment noting why the CSS class was chosen.

---

## What is done well

- Import is correctly from `'../../fixtures'` (§6, import rule)
- `test.describe('Contact', ...)` follows the feature-area naming convention (§6)
- All assertions use web-first `expect(locator, 'intent message')` syntax (§7)
- Intent messages are present on every `expect()` call (§7)
- `beforeEach` correctly handles navigation only — no assertions (§6)
- `ContactPage.navigate()` correctly overrides `BasePage.navigate()` with
  `waitUntil: 'load'` + element `waitFor` instead of `networkidle` (§3, §8)
- `ContactPage` extends `BasePage` (§3, class structure)
- `fillAndSubmit` uses a typed parameter object, consistent with §3 (typed parameters)
- No `waitForTimeout` anywhere in spec or page object (§8)
- Tests CT02–CT06 each assert a specific field-error element rather than a broad
  regex — this is a good improvement over `checkout.spec.ts` CH02/CH03 (§7)
