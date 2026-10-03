# Commands Reference

```bash
npx tsc --noEmit                              # type-check — run after any TypeScript change

npx playwright test                           # full suite
npx playwright test tests/cart/cart.spec.ts   # run one file
npx playwright test --grep "C01"              # run one test by its ID
npx playwright test --grep "@regression"      # run tests by tag

npm run test:headed                           # run with browser visible
npm run test:ui                               # Playwright UI mode
npm run test:report                           # open last HTML report
npm run setup                                 # run tests/auth.setup.ts to generate auth.json (needed before authenticated-flow tests)
```

**Warning:** `npm test` runs only `--grep "C01" --headed` — it is a smoke command, not the full-suite runner. Never treat a passing `npm test` as "the suite passes."

## Playwright MCP

A Playwright MCP server is configured project-scoped in `.mcp.json` (`npx @playwright/mcp@latest`). Use its browser tools (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, etc.) to drive the real app and inspect actual locators/DOM/copy before writing assertions — this is the preferred way to do step 2 of the golden-path workflow (live-app verification), instead of a throwaway script.

## Typical sequence when adding/changing a spec

1. `npx tsc --noEmit`
2. `npx playwright test tests/<feature>/<feature>.spec.ts`
3. If failing, fix and repeat step 2 until green.
4. Optionally `npx playwright test --grep "@regression"` if the change could affect other specs (e.g. shared fixture/facade edits).
