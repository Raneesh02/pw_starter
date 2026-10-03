# pw-test-writer checklist

## Pre-flight

- [ ] Imports `{ expect, test }` from `'../../fixtures'` (or correct relative depth), never `@playwright/test` directly.
- [ ] Grepped the target spec for the highest existing ID of the prefix — new ID is the next sequential zero-padded number.
- [ ] New feature area? Confirmed prefix doesn't collide with `P`/`C`/`CH`.
- [ ] Reusing `beforeEach` for shared arrange steps instead of repeating them per test.
- [ ] No raw `page.locator(...)` inline in the spec — locator lives in a page object.
- [ ] No cross-page navigation inline in the spec — flow lives in `ShopFacade`.
- [ ] No literal test data inline in the spec — lives in `data/`.

## Post-flight

- [ ] `npx tsc --noEmit` passes.
- [ ] Ran only the affected spec file (`npx playwright test tests/<area>/<area>.spec.ts`), not the full suite.
- [ ] No `page.waitForTimeout` / manual waits — web-first assertions only.
- [ ] No `any` types; explicit typing throughout.
- [ ] Every test title ends with `@regression`.
- [ ] Asked before committing/pushing.
- [ ] Asked before editing `CLAUDE.md`, if a structural change (new area/page object/fixture) was made.
