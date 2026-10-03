---
name: pr-code-review
description: Reviews a PR/diff in this repo against CODE_REVIEW_GUIDELINES.md (risk triage, framework compliance, locator quality, test quality, isolation, naming, config-change care, hygiene). Use whenever the user asks to review a PR, branch, or diff against the repo's code review guidelines, or when invoked as a CI step after static checks pass. Report-only; never edits code.
---

# pr-code-review

Review changes against `CODE_REVIEW_GUIDELINES.md` — the checklist in that file only. Never restate
or rely on memory of it; re-read it every run, it may change.

## Principle

Don't re-review what a tool already checks. `tsc --noEmit` and the configured ESLint rules must pass
before this review runs — when running as a CI step, that is already enforced by the prior static-checks
job. This skill covers what those tools cannot catch: layering, locator quality, test isolation, business
meaning of assertions, coverage gaps, naming/tagging conventions, and config-change blast radius.

## Workflow

1. **Read the checklist.** Read `CODE_REVIEW_GUIDELINES.md` in full.
2. **Scope the diff.** Default to `git diff origin/main...HEAD` (plus any uncommitted/untracked files via
   `git status` when run locally). In CI, diff against the PR's base ref. Resolve this to a concrete list
   of changed files once.
3. **Risk triage (§1 first).** Classify the overall change as LOW / MEDIUM / HIGH per the table — this
   decides how deep the rest of the review needs to go. Call out any HIGH-tier files explicitly; they
   always warrant careful review regardless of diff size.
4. **Walk the checklist**, section by section, only against files actually in the diff:
   - §2 Framework compliance (fixtures import path, page-object registration, facade vs `helpers.ts`)
   - §3 Locator quality (role/data-test vs raw CSS, locators living in page objects not specs)
   - §4 Test quality & assertions (business-meaningful assertions, negative/boundary coverage for
     `@regression`, no hard sleeps)
   - §5 Test isolation & data (shared-state collisions, no real credentials/PII)
   - §6 Naming & tagging (ID + suite tag in test titles, folder-per-feature)
   - §7 Config/framework-critical changes (end-to-end wiring, lockfile changes isolated)
   - §8 Hygiene (no secrets, no generated output committed, no `test.only`/`debugger`/`console.log`/
     commented-out code)
5. **Apply §9 (what NOT to do):** don't restate lint/tsc output, don't nitpick unstated conventions,
   don't block solely on a coverage judgment call — flag it and let a human decide.
6. **Report** using the §10 format for every finding: category, severity, concrete file/line evidence,
   and a citation to the repo's own existing pattern where applicable — not a generic rule restatement.

## Output format

No preamble, no trailing summary beyond what's specified below. Group findings by severity:

- **Blocker** — secrets/credentials committed, framework-critical wiring broken, a claimed `@regression`
  test that cannot fail
- **Major** — layering violations (locators/assertions in the wrong layer), locator-quality violations,
  test isolation/shared-state risk
- **Minor** — naming/tagging gaps, hygiene nits (generated output, leftover debug statements)
- **Suggestion** — coverage gaps (missing negative/boundary cases) a human should judge

Each finding: `file:line — [Guideline section] — issue — fix`, in the citation style from §10 of
`CODE_REVIEW_GUIDELINES.md`.

End with one line: `risk: Low | Medium | High` (from the §1 triage) and one line:
`checklist: CODE_REVIEW_GUIDELINES.md`. If nothing is found, say so in one line plus the risk/checklist
lines.

## Rules

- Report only. Never edit files, commit, or push.
- If `CODE_REVIEW_GUIDELINES.md` is missing, stop and say so — do not improvise a checklist.
- Don't duplicate findings the static-checks/lint/typecheck step already reports.
