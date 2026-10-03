---
name: pw-code-review
description: Full code review of pw_starter changes via three parallel subagents (pw-code-guidelines-reviewer, pw-architecture-reviewer, pw-security-reviewer) plus affected-test checks. Use whenever the user asks to review, code-review, or check their tests, spec, page object, facade, diff, branch, or PR in this repo — e.g. "review my changes", "review the cart spec", "is this ready for PR", or explicit invocation via /pw-code-review. Report-only; never edits code.
---

# pw-code-review

Review changes against `agent-context/CODING_GUIDELINES.md` and this repo's architecture and
security norms, using three subagents in parallel rather than one pass trying to cover
everything. The standards live only in the guidelines file — never restate or rely on memory
of them.

## Workflow

1. **Scope.** Default: `git diff main...HEAD` plus uncommitted/untracked files (`git status`).
   If the user gives a path/spec name, scope to that instead. Resolve this to a concrete list
   of changed files once — don't read them yourself, the subagents each read in full
   independently.

2. **Dispatch in parallel.** In one message, call the Agent tool three times, one per
   subagent, each given the same scope (changed-file list / diff description / explicit path)
   and told to read `agent-context/CODING_GUIDELINES.md` itself:
   - `pw-code-guidelines-reviewer` — compliance with the guidelines (layering, naming,
     TypeScript, locator priority, assertions/waits, test design, style, secrets).
   - `pw-architecture-reviewer` — design: layering boundaries, duplication, fixture/facade
     composition, consistency across page objects, scalability.
   - `pw-security-reviewer` — secrets/credentials, gitignore coverage of sensitive artifacts,
     unsafe dynamic locator/data construction, config/dependency risk.

   Don't summarize or pre-filter the scope for them beyond stating it — each one reads the
   actual files.

3. **Run checks yourself, read-only**, while or after the subagents run: only the affected
   spec(s) (`npx playwright test <file>` or `--grep "<ID>"`). Never the full suite. Never edit
   code. Linting, type-checking and formatting are covered by the static-checks CI, not here.

4. **Aggregate.** Collect all three reports. Drop duplicates (the same file:line/issue
   surfacing from more than one subagent — keep the one from the most relevant subagent:
   security wins over architecture, architecture wins over a plain style echo). Otherwise
   preserve each subagent's findings as given.

5. **Report** (see format below).

## Output format

No preamble, no trailing summary. One combined list, grouped by severity across all three
subagents (map each subagent's severity names onto these four):

- **Blocker** — breaks a MUST-level guideline (`test.only`, secrets, test can't fail, failing
  test); includes any subagent's Blocker/Critical
- **Major** — layering, locator priority, fixed waits, data isolation, real duplication, an
  inconsistent pattern, or a credential/gitignore gap that isn't outright Critical
- **Minor** — naming, style, PII-like data, small structural inconsistency
- **Suggestion** — investigative coverage gaps, consolidation opportunities, standing gaps
  restated for awareness

Each finding: `file:line — §N — issue — fix`. Findings with no guideline section (most
architecture/security ones) write `—` there. Tag which subagent raised it only if it's not
obvious from the content.

Immediately before the final tests line, add one line naming which subagents ran:
`reviewers: pw-code-guidelines-reviewer, pw-architecture-reviewer, pw-security-reviewer` —
this is how a run (local or CI) is confirmed to have used them.

End with one line: `tests: <n> passed / <n> failed`. If all three subagents found nothing,
say so in one line.

## Rules

- Report only. Offer fixes as a next-step question; never apply them unasked.
- Never commit or push.
- If `agent-context/CODING_GUIDELINES.md` is missing, stop and say so — don't improvise
  standards from memory.
- If a subagent call fails or times out, say so explicitly in the report rather than silently
  dropping that category.
- Subagents are report-only; don't widen their toolsets.
