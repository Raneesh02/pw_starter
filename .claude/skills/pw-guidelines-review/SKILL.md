---
name: pw-guidelines-review
description: Run a combined guidelines + architecture + security review of a pull request (or the current diff) for this Playwright test repo, using three parallel sub-agents, then post one merged inline PR review. Use when the user asks to "review this PR", "check the PR against the guidelines", "guidelines review", "full review", "multi-agent review", or invokes /pw-guidelines-review, for this Playwright test repo specifically (page objects, fixtures, test IDs, banned patterns, architecture layering, repo-specific security hygiene). For a general non-repo-specific correctness review, prefer the code-review skill instead. For generic security scanning not scoped to this repo's Playwright/PR conventions, prefer the security-review skill instead.
---

# PW Starter Multi-Agent Review

Reviews changed Playwright test code in a PR using **three independent, parallel sub-agents**, each
scoped to one concern:

1. **Guidelines** — strictly against `CODING_GUIDELINES.md` (not general code quality).
2. **Architecture** — structural/layering health per `CLAUDE.md` (fixtures/page-objects/facade
   composition), distinct from the line-level style rules the guidelines agent already covers.
3. **Security** — repo-realistic risks (credential handling, `.gitignore` gaps, secret hygiene) for
   this Playwright E2E suite, not generic OWASP-style scanning.

All three run against the same diff and the orchestrator posts **one combined inline PR review** —
never three separate reviews.

## 0. Precheck: `gh` availability

Before anything else, verify the tooling this skill depends on:
```
gh --version
gh auth status
```
- If `gh` is not installed (`command not found`), stop and tell the user to install the GitHub CLI
  (https://cli.github.com/) — do not attempt a workaround via raw GitHub API calls unless they ask.
- If `gh` is installed but not authenticated (`gh auth status` fails), stop and tell the user to run
  `gh auth login`, then wait for them to retry.
- Only proceed to step 1 once both checks pass. This precheck is required every time the skill runs —
  don't assume a prior successful run means auth is still valid.

## 1. Resolve the target

- If the user gave a PR number or URL, use that.
- Else if on a feature branch with an open PR, use `gh pr view --json number,url` to find it.
- Else, fall back to reviewing the local diff (`git diff main...HEAD`) and skip the "post to PR" step
  (just print findings), telling the user there's no PR to post to.

Confirm the resolved target (PR number/URL, or "local diff, no PR") before doing anything destructive
(posting comments is outward-facing — always state which PR you're about to comment on and get
confirmation first, unless the user already named that exact PR explicitly in this turn).

## 2. Gather shared context (once, by you — not by the sub-agents)

Get the diff and commit info:
```
gh pr diff <number>
gh pr diff <number> --name-only               # changed files
gh pr view <number> --json headRefOid --jq .headRefOid   # head commit SHA, needed for posting
```
Read every changed file **in full** at the PR head ref (not just the diff hunk) — you'll paste full
file contents into each sub-agent's prompt, since fresh sub-agents have no memory of this conversation
and can't re-derive surrounding context on their own.

You don't need to read `CODING_GUIDELINES.md` or `CLAUDE.md` yourself for this step — each checklist
now lives as the system prompt of its own subagent definition (`.claude/agents/pw-guidelines-reviewer.md`,
`pw-architecture-reviewer.md`, `pw-security-reviewer.md`), and each of those subagents can `Read` those
files itself if it needs more context than what's pasted into its prompt.

## 3. Launch three parallel sub-agents

Launch three `Agent` tool calls **in a single message**, one per named subagent:

- `subagent_type: "pw-guidelines-reviewer"`
- `subagent_type: "pw-architecture-reviewer"`
- `subagent_type: "pw-security-reviewer"`

Each is a custom subagent defined in `.claude/agents/`, already pinned to `model: sonnet` and scoped
to read-only tools in its own frontmatter — don't pass a `model` override here, and don't use
`"fork"` (a fork would inherit this session's context and bias each review toward the others'
framing; independent fresh agents catch more and keep findings cleanly attributable by source).

Each subagent already has its checklist, output format, and effort level baked into its own system
prompt, so the `prompt` you pass here only needs the PR-specific data:

```
PR: <owner>/<repo>#<number>
Head commit SHA: <headRefOid>

Full diff:
<gh pr diff <number> output, verbatim>

Changed files (full content at PR head, not just hunks):
<each changed file's full text, labeled with its path>
```

Each subagent returns a JSON array of findings in the shared `{path, line, side, body}` /
`{path, start_line, line, side, body}` / `{path: null, body}` format (see any of the three
`.claude/agents/pw-*-reviewer.md` files for the exact schema). Tag each finding with its source
yourself when merging (step 4) — `pw-guidelines-reviewer` → `[Guidelines]`, `pw-architecture-reviewer`
→ `[Architecture]`, `pw-security-reviewer` → `[Security]`.

## 4. Collect and merge findings

After all three sub-agents return, merge their JSON arrays yourself:

1. Concatenate all `comments`-eligible findings (those with `path` + `line`) across all three arrays.
2. Group by `(path, line)` or `(path, start_line, line)`. If two or more agents flag the *same* line,
   merge into **one** comment object whose body lists each finding as a separate bullet, tagged by
   source:
   ```
   **[Guidelines]** Raw `page.locator()` call inside a `.spec.ts` file — move into a page object method.
   **[Architecture]** This flow duplicates `ShopFacade.addToCart` — call the facade instead of
   reimplementing search/click/add-to-cart inline.
   ```
3. Findings on different lines stay as separate `comments` entries, each still `[Source]`-tagged.
4. Unanchored findings (`path: null`) from any agent go into a `## Additional findings (not tied to a
   specific diff line)` section in the review's top-level `body`, `[Source]`-tagged.

Skip anything you're not confident is actually a violation — don't pad the review with nitpicks the
checklists don't state. If nothing violates any checklist, say so plainly rather than inventing findings.

## 5. Show findings, then post automatically

Show the user the merged, source-tagged findings list, then post it immediately — do not wait for a
confirmation before posting. (This does not relax step 1's target confirmation.)

## 6. Post to the PR

Post findings as **one combined inline review, anchored to exact lines**, via the GitHub review API
(`gh pr comment`'s single body comment is a fallback only — see below).

1. You already have the head commit SHA from step 2 (`headRefOid`).
2. Build a JSON payload in the scratchpad directory (not `/tmp`), combining all merged/deduped
   findings from step 4:
   ```json
   {
     "commit_id": "<headRefOid>",
     "event": "COMMENT",
     "body": "Multi-agent review (guidelines + architecture + security). Inline comments below.\n\n## Additional findings (not tied to a specific diff line)\n**[Security]** auth.json is not listed in .gitignore — session storage state could be committed.",
     "comments": [
       {
         "path": "tests/cart/cart.spec.ts",
         "line": 61,
         "side": "RIGHT",
         "body": "**[Guidelines]** <rule broken + one-line fix>"
       }
     ]
   }
   ```
   - `line` is the line number in the file as it exists on the PR branch (`side: "RIGHT"`), not the diff
     hunk offset — get this from reading the file at the PR's head ref, or carefully re-deriving it from
     the `@@ -a,b +c,d @@` hunk header, not by guessing.
   - For a finding spanning multiple contiguous lines, use `start_line` (first line) plus `line` (last
     line) instead of just `line`.
   - If two unrelated findings fall on non-contiguous lines, use separate comment entries — a single
     GitHub comment can't span a gap.
   - Only comment on lines that are actually part of the diff (added or changed lines); GitHub rejects
     comments anchored to untouched lines.
3. Post the review:
   ```
   gh api repos/<owner>/<repo>/pulls/<number>/reviews -X POST --input <tmp-file>
   ```
   Use `event: "COMMENT"` by default. Always use `"COMMENT"` (never `"REQUEST_CHANGES"`) when the PR
   author is the authenticated `gh` user — GitHub rejects `REQUEST_CHANGES` on your own PR. If the user
   explicitly asks for a request-changes verdict and isn't the PR author, use `"REQUEST_CHANGES"`.

Exactly **one** review is posted, combining all three agents' findings — never one review per agent.

If the user explicitly asks for a single summary comment instead of inline comments, fall back to:
```
gh pr comment <number> --body-file <tmp-file>
```
with the body formatted as:
```markdown
## Multi-agent review (CODING_GUIDELINES.md + architecture + security)

### Guidelines
<one finding per bullet: `path/to/file.ts:LINE` — rule broken — suggested fix>

### Architecture
<one finding per bullet>

### Security
<one finding per bullet>

_Reviewed by three parallel sub-agents against CODING_GUIDELINES.md, CLAUDE.md's architecture, and
repo-realistic security risks._
```

Use the scratchpad directory for all temporary payload/body files, not `/tmp`.
