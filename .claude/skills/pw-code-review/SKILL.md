---
name: pw-code-review
description: Full code review of pw_starter changes via three parallel subagents (pw-code-guidelines-reviewer, pw-architecture-reviewer, pw-security-reviewer) plus tsc/affected-test checks. Use whenever the user asks to review, code-review, or check their tests, spec, page object, facade, diff, branch, or PR in this repo — e.g. "review my changes", "review the cart spec", "is this ready for PR", or explicit invocation via /pw-code-review. Report-only; never edits code.
---

# pw-code-review

Review changes against `agent-context/CODING_GUIDELINES.md` and this repo's architecture and
security norms, using three subagents in parallel rather than one pass trying to cover
everything.

## Workflow

1. **Scope.** Default: `git diff main...HEAD` plus uncommitted/untracked files (`git status`).
   If the user gives a path/spec name, scope to that instead. Collect the list of changed
   files — don't read them yourself, the subagents each read in full independently.

2. **Dispatch in parallel.** In one message, call the Agent tool three times, one per
   subagent, each given the same scope (changed-file list / diff description / explicit path)
   and told to read `agent-context/CODING_GUIDELINES.md` itself:
   - `pw-code-guidelines-reviewer`
   - `pw-architecture-reviewer`
   - `pw-security-reviewer`

   Don't summarize or pre-filter the scope for them beyond stating it — each one reads the
   actual files.

3. **Run checks yourself, read-only**, while or after the subagents run: `npx tsc --noEmit`,
   then only the affected spec(s) (`npx playwright test <file>` or `--grep "<ID>"`). Never the
   full suite. Never edit code.

4. **Aggregate.** Collect all three reports. Drop exact duplicates (the same file:line/issue
   surfacing from more than one subagent — keep the one from the most relevant subagent:
   security findings win over architecture, architecture wins over a plain style echo).
   Otherwise preserve each subagent's findings as given.

5. **Report** (see format below).

## Output format

No preamble, no trailing summary. One combined list, grouped by severity across all three
subagents (Blocker/Critical first):

- **Blocker** — breaks a MUST-level guideline or the build (tsc error, `test.only`, secrets,
  assertion-free test) — includes any subagent's Blocker/Critical
- **Major/High** — layering, locator priority, fixed waits, data isolation, real duplication,
  an inconsistent pattern, or a credential/gitignore-gap finding that isn't outright Critical
- **Minor/Medium** — naming, style, PII-like data, small structural inconsistency
- **Suggestion/Note** — investigative coverage gaps, consolidation opportunities, standing
  gaps restated for awareness

Each finding: `file:line — issue — fix` (keep the `§N` guideline citation when the guidelines
subagent gave one). Tag which subagent raised it only if it's not obvious from the content.

End with one line: `tsc: pass|fail · tests: <n> passed / <n> failed`. If all three subagents
found nothing, say so in one line.

## Rules

- Report only. Offer fixes as a next-step question; never apply them unasked.
- Never commit or push.
- If `agent-context/CODING_GUIDELINES.md` is missing, stop and say so — don't improvise
  standards from memory.
- If a subagent call fails or times out, say so explicitly in the report rather than silently
  dropping that category.
