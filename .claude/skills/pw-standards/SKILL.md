---
name: pw-standards
description: >
  Generate a TEST_AUTOMATION_STANDARDS.md coding-standards document and/or review
  Playwright + TypeScript test files against best practices — for ANY Playwright + TS
  project, not just pw_starter. Use this skill whenever someone asks to: generate test
  coding standards, create a test quality document, write a coding guideline for tests,
  review a spec or page object for correctness or convention adherence, audit test code
  quality, or establish best practices for a Playwright project. Also trigger it when the
  user mentions "code reviewer" and tests in the same breath, even without the exact
  phrase "standards".
---

# Playwright Standards — Generate & Review

This skill works on **any** Playwright + TypeScript project. It has two modes that
often combine:

- **Generate**: Explore the project, then write `TEST_AUTOMATION_STANDARDS.md`
- **Review**: Check files against best practices and report findings

Read the user's request and determine the mode(s) to run.

---

## Step 1: Explore the project (always — 2–3 minutes)

Before generating or reviewing, build a picture of the project's own conventions.
Look for the following signals (read a representative file from each area, not the
whole tree):

| Signal | What to look for |
|---|---|
| Directory layout | `tests/`, `pages/`, fixture file, shared actions, data dir |
| Page-object style | Plain class or extends base? Locators in constructor or inline? |
| Locator strategies | `getByRole`, `getByTestId`, `[data-test=...]`, CSS, XPath |
| Fixture wiring | Custom `test` from `base.extend`? What fixtures are registered? |
| Test title format | ID prefix + description + tag? What prefixes/tags exist? |
| Setup pattern | `beforeEach`? Shared facade/helper? Inline steps? |
| Assertion style | Web-first `expect`? Intent message? Asserting visibility only? |
| Wait patterns | `waitForTimeout`? `networkidle`? Element-scoped waits? |
| Data management | Central `data/` constants? Inline per-spec? Mixed? |
| TypeScript config | `strict` on? Named interfaces for form inputs? |

Also check for any existing standards or strategy docs (`TEST_STRATEGY.md`,
`CLAUDE.md`, `CONTRIBUTING.md`, similar) — they are the source of truth and the
generated document must not contradict them.

---

## Step 2A — Generate Mode: Write `TEST_AUTOMATION_STANDARDS.md`

Produce a document tailored to **this project's actual patterns**. The document
covers *how* to write code, complementing any existing strategy/coverage doc.

### Document structure

Use this skeleton, filling each section from what you observed in Step 1. Where the
project already follows a best practice, describe it positively. Where it deviates,
call the deviation out explicitly as a "known issue to address" with a concrete fix.

```
# Test Automation Coding Standards — <project name>

> Companion to <existing docs if any>. Covers how to write test code.
> Last updated: <date>

## 1. Overview
## 2. Architecture quick-reference
   - Layer diagram (one-liner per layer: what it holds, what depends on it)
   - Rule: which file to import `test`/`expect` from
## 3. Page Objects
   - Class structure (plain class vs extends base, constructor pattern)
   - Locator priority (ordered rule, with examples from this repo)
   - Where locators live (page object vs spec)
   - Method naming conventions
   - `navigate()` pattern (waitUntil + key element wait — not networkidle)
   - Typed parameters for complex form inputs
## 4. Shared Actions / Facade (if present)
   - When to use it vs a page object method
   - How to add a new multi-page flow
   - Anti-pattern: duplicating facade logic in utils/helpers
## 5. Fixtures
   - How to register a new page object
   - Fixture scope (test-scoped = new instance per test)
   - How the facade shares instances with specs
## 6. Test Specs
   - Import line
   - Test title format (<ID> <description> <@tag>), with ID prefix map
   - `test.describe` name convention
   - `beforeEach` — what belongs there
   - How to share state between `beforeEach` and test body
   - `test.setTimeout` override pattern
   - Rule: no raw locators in specs
## 7. Assertions
   - Web-first `expect(locator, 'intent message')`
   - What "intent message" means (state WHY, not what element)
   - Assert real outcomes (values, counts, order) not just visibility
   - Anti-patterns (non-web-first count, broad-text regex assertions)
## 8. Waits
   - ❌ Never `waitForTimeout`
   - ❌ Avoid `networkidle`
   - ✅ Element-scoped `waitFor({ state: 'visible' })`
   - ✅ `waitForResponse` / `waitForURL` for network-driven state changes
## 9. Test Data
   - Where static constants live
   - Uniqueness rule for data tests create (timestamp/random suffix)
   - Do not mutate seeded accounts
## 10. TypeScript
    - `strict: true` — no `any` without justification
    - Run `npx tsc --noEmit` after every change
    - Export named interfaces for complex parameter types
## 11. Code Review Checklist
    (A concise table: check | good pattern | anti-pattern — 10–15 rows)
```

**Tone**: assertive but not bureaucratic. Explain *why* each rule exists in one
sentence. A future reviewer using this document should understand the reasoning, not
just the rule.

**Length target**: 400–700 lines. Comprehensive enough to use as a review checklist,
tight enough to read in one sitting.

**Format**: write the file to `TEST_AUTOMATION_STANDARDS.md` at the repo root.

---

## Step 2B — Review Mode: Report findings

When asked to review a file or diff, check every item in the checklist below.
Report findings grouped by severity:

- **HIGH**: bugs that will cause incorrect results or flaky tests
- **MEDIUM**: convention violations that hurt maintainability
- **LOW**: style / housekeeping issues

For each finding:
```
[SEVERITY] <file>:<approx-line>
Rule: <which rule is broken>
Fix: <one-line concrete change>
```

### Universal Playwright review checklist

**Imports**
- `test` and `expect` come from the project's own fixtures entry point, not directly
  from `@playwright/test`

**Test titles**
- Format is `<ID> <description> <@tag>` (or the project's equivalent convention)
- ID is unique in the test suite
- Tag is one of the project's defined set

**Locators**
- All locators live in a page object — none built raw inside a spec
- Priority: semantic (`getByRole`/`getByLabel`/`getByPlaceholder`) → test-ID
  attribute → CSS; no XPath; no positional selectors used as identity

**Waits**
- No `waitForTimeout` in non-diagnostic code
- No `waitForLoadState('networkidle')` in new code

**Setup**
- Multi-step multi-page setup uses the project's shared action layer, not inline
  duplication or copy-pasted helper logic

**Assertions**
- Web-first `expect(locator)` — not `expect(await locator.someMethod())`
- Asserts a real outcome (value, count, order) not just `.toBeVisible()`
- Carries an intent message (the second argument to `expect()` or the assertion method)

**Test independence**
- Test sets up its own state; does not rely on another test leaving something behind
- Data created by the test uses a unique suffix (timestamp/random) for parallel safety

**Data**
- Reusable static inputs (addresses, payments, form payloads) live in a central
  `data/` directory, not as inline `const` objects inside the spec

**TypeScript**
- No unguarded `any`; `tsc --noEmit` would pass

**Page objects** (when reviewing a page object file)
- Extends the project's base class if one exists
- No logic that spans multiple pages — that belongs in the shared action layer

---

## Step 3 — Both Modes

If the user asked for both (generate + review), do them in order:
1. Run Step 1 (explore)
2. Run Step 2A (generate `TEST_AUTOMATION_STANDARDS.md`)
3. Run Step 2B (review the requested files, using the newly generated standards as
   the detailed checklist rather than the generic one above)

When reviewing after generating, reference the standards document's section numbers
in your findings so the reader can look up the rule ("violates §3 — locators must
live in page objects").

---

## Finishing up

After generating and/or reviewing:
- If you generated `TEST_AUTOMATION_STANDARDS.md`, confirm the file was written and
  mention that it should be committed alongside `CLAUDE.md` / `TEST_STRATEGY.md`.
- If you reviewed, end with a one-line summary: `N HIGH, N MEDIUM, N LOW findings`.
- Run `npx tsc --noEmit` if you made any code changes (not needed for a Markdown-only
  generate run).
