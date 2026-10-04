---
name: pw-code-review
description: Reviews Playwright + TypeScript changes in the pw_starter repo against agent-context/CODING_GUIDELINES.md and probes for weak coverage. Use whenever the user asks to review, code-review, or check their tests, spec, page object, facade, diff, branch, or PR in this repo — e.g. "review my changes", "review the cart spec", "is this ready for PR", or explicit invocation via /pw-code-review. Report-only; never edits code.
---

# pw-code-review

Review changes against the repo's standards. The standards live only in `agent-context/CODING_GUIDELINES.md` — never restate or rely on memory of them.

## Workflow

1. **Read standards.** Read `agent-context/CODING_GUIDELINES.md` in full, every run.
2. **Scope.** Default: `git diff main...HEAD` plus uncommitted and untracked files (`git status`). If the user gives a path or spec name, review only that. Read each changed file in full, not just hunks — layering and ID-uniqueness checks need full context.
3. **Guideline pass.** Check every changed file against each relevant guideline section; cite as `§N`. Linting, type-checking and formatting are out of scope (enforced elsewhere) — don't check, run, or report them. Focus on what tooling can't see: layering, locator priority (§4), naming, data placement, test design, and:
   - New test IDs are unique and area-prefixed — grep `tests/` for each one.
   - `CLAUDE.md` Architecture section updated if structure changed (new page object, fixture, `tests/` dir, skill).
4. **Investigative pass.** Beyond the written rules, flag: missing boundary/negative/empty-input cases, tests that cannot fail, order-dependence or shared-state risk on the live site, unstated assumptions, assertions on implementation detail.
5. **Run checks (read-only).** Only the affected specs (`npx playwright test <file>` or `--grep "<ID>"`). Never the full suite. Never edit code.
6. **Report.**

## Output format

No preamble, no trailing summary. Group by severity:

- **Blocker** — breaks a MUST-level rule (secrets, test can't fail, failing test)
- **Major** — layering, locator priority, data isolation
- **Minor** — naming, comments
- **Suggestion** — investigative coverage gaps

Each finding: `file:line — §N — issue — fix`. Investigative findings have no § — write `—` there.

End with one line: `tests: <n> passed / <n> failed`. If nothing is found, say so in one line.

## Rules

- Report only. Offer fixes as a next-step question; never apply them unasked.
- Never commit or push.
- If the guidelines file is missing, stop and say so.
