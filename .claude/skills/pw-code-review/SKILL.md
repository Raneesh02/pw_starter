---
name: pw-code-review
description: Reviews Playwright + TypeScript changes in the pw_starter repo with four parallel reviewers — coding standards (agent-context/CODING_GUIDELINES.md), architecture, security, and test coverage. Use whenever the user asks to review, code-review, or check their tests, spec, page object, facade, diff, branch, or PR in this repo — e.g. "review my changes", "review the cart spec", "is this ready for PR", or explicit invocation via /pw-code-review. Report-only; never edits code.
---

# pw-code-review

Review changes against the repo's standards. The standards live only in `agent-context/CODING_GUIDELINES.md` — never restate or rely on memory of them.

## Workflow

1. **Read standards.** Read `agent-context/CODING_GUIDELINES.md` in full, every run.
2. **Scope.** Default: `git diff main...HEAD` plus uncommitted and untracked files (`git status`). If the user gives a path or spec name, review only that. Resolve this to a concrete list of changed files once.
3. **Dispatch reviewers in parallel.** In one message, launch all four sub-agents, each given the same file list and diff scope:
   - `pw-guideline-reviewer` `[standards]` — coding standards from `agent-context/CODING_GUIDELINES.md` §2–§8: naming, typing, locator priority, assertions & waiting, test design, stability, comments, test-ID uniqueness. Linting/type-checking/formatting are out of scope.
   - `pw-architecture-reviewer` `[architecture]` — §1 layering across specs/page objects/facade/fixtures/data, duplication and reuse of existing abstractions, fixture wiring, `CLAUDE.md` sync for structural changes.
   - `pw-security-reviewer` `[security]` — §9 secrets & config, credential/PII leakage, unsafe GitHub Actions workflows (untrusted triggers, script injection, broad permissions), risky dependencies, unsafe code.
   - `pw-investigative-reviewer` `[coverage]` — probes beyond the written rules: missing boundary/negative/empty-input cases, tests that cannot fail, order-dependence or shared-state risk on the live site, unstated assumptions, assertions on implementation detail.

   All four are read-only by tool restriction (`Read, Grep, Glob` only) — they cannot edit code, run commands, or commit. Do not run them one after another.
4. **Merge.** Combine all agents' findings into one list; dedupe near-identical findings reported by more than one, keeping the original `file:line — §N/— — [category] issue — fix` format (keep the more severe category's tag).
5. **Run checks (read-only).** Only the affected specs (`npx playwright test <file>` or `--grep "<ID>"`). Never the full suite. Never edit code.
6. **Report.**

## Output format

No preamble, no trailing summary. Group by severity:

- **Blocker** — breaks a MUST-level rule (secrets, exploitable workflow/security issue, test can't fail, failing test)
- **Major** — layering, locator priority, data isolation, non-exploitable security hardening
- **Minor** — naming, comments
- **Suggestion** — investigative coverage gaps

Each finding: `file:line — §N — [category] issue — fix`, where category is `standards`, `architecture`, `security` or `coverage`. Findings with no guideline section write `—` for §.

Immediately before the final tests line, add one line naming which sub-agents ran: `reviewers: pw-guideline-reviewer, pw-architecture-reviewer, pw-security-reviewer, pw-investigative-reviewer` — this is how a run (local or CI) is confirmed to have used them.

End with one line: `tests: <n> passed / <n> failed`. If nothing is found, say so in one line.

## Rules

- Report only. Offer fixes as a next-step question; never apply them unasked.
- Never commit or push.
- If the guidelines file is missing, stop and say so.
- The four sub-agents are read-only by tool restriction, not just instruction — don't widen their toolsets.
