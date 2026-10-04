# pw-code-review eval

Code-based grader for the `pw-code-review` skill, designed after Anthropic's
[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

## Run

```bash
npm run eval:review:grader        # free, deterministic: validates both graders' plumbing
npm run eval:review               # live: runs the skill via `claude -p` (costs tokens)
EVAL_TRIALS=3 npm run eval:review # 3 trials per task -> pass@k / pass^k
EVAL_JUDGE=1 npm run eval:review  # also run the LLM judge (3 extra calls per trial, advisory)
npm run eval:review:judge         # live: calibrate the LLM judge against human labels
```

Optional env: `EVAL_TRIALS` (default 1), `EVAL_JUDGE=1`, `EVAL_JUDGE_GATE=1` (a judge `fail` fails the
trial), `EVAL_MODEL`, `CLAUDE_BIN`. Raw reports and grades from
live runs are saved to `results/` (gitignored); read them when a task fails.

## How it follows the guidance

| Guidance                           | Here                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grade outcomes, not paths          | `grader.ts` checks the report and the workspace afterwards. No tool-call order, no turn counts. Turns/time/cost are recorded, never graded.        |
| Avoid brittle checks               | Findings match on file + (cited `§N` **or** keyword) + line range. Bullet style, backticks, dash flavour and wording are free.                    |
| Partial credit                     | Score is the weighted share of passed checks. Severity and output-format checks add credit but never gate. Only required checks decide pass/fail. |
| Unambiguous, solvable tasks        | One seeded defect per task. `references/<id>.md` is a known-good review; `grader.spec.ts` proves the grader gives it a perfect score.            |
| Grader transparency                | Every check is derivable from `tasks.ts` and the skill's own output contract. The prompt names the goal, not the steps.                           |
| Balanced positive/negative         | 5 tasks must produce a finding; `clean-change` and `style-only-change` must not (false positives and out-of-scope lint/format noise).            |
| Isolation                          | Each trial builds a fresh temp git repo (`main` + `feature`) from `fixtures/`. No shared state; deleted afterwards.                               |
| Non-determinism                    | `EVAL_TRIALS` runs N trials per task. `eval-reporter.ts` prints pass@k (any pass) and pass^k (all pass).                                          |
| Environment state check            | `outcome:workspace-unchanged` and `outcome:no-commits` verify the skill stayed report-only, with edits left enabled so a violation is visible.   |

## LLM judge (model-based grader)

The code grader decides whether the right defects were found. It cannot tell whether a fix is
usable, a claim is true, or a severity sensible, so a second grader covers that. It follows the
guide's advice on model graders:

- **One dimension per judge call**, each with its own rubric in `rubrics/`: `fix-actionability`,
  `grounded-claims`, `proportionate-severity`. No single "rate this review" prompt.
- **Reason, then decide.** The judge writes brief reasoning and ends with `VERDICT: pass|fail|unknown`.
  The parser takes the last verdict line, so a quoted example cannot win.
- **`unknown` is a legal verdict** and never counts against the review, so the judge is not forced to guess.
- **Isolated and tool-less.** Each call runs in an empty temp dir with `--tools ""` and slash commands off,
  so it judges only what the prompt contains: the diff, the repo files at HEAD, the guidelines, the report.
- **Advisory by default.** A model's opinion should not fail CI on its own. `EVAL_JUDGE_GATE=1` makes a
  `fail` gate the trial.
- **Calibrated against a human.** `calibration.ts` holds human-labelled reviews (a pass and a fail per
  dimension). `npm run eval:review:judge` checks the judge reproduces those labels. Re-run it whenever a
  rubric or the judge model changes. A disagreement means the rubric needs work, not the label.

## Layout

- `llm-grader.ts` / `judge.ts` / `rubrics/` — LLM judge: prompt, verdict parsing, model call, rubrics
- `calibration.ts` / `calibration.eval.ts` — human-labelled cases and the live check of the judge
- `judge.spec.ts` — free self-tests for the judge plumbing (parsing, prompt, summary, assets)
- `grader.ts` — parser + `gradeReview(report, task, outcome?)`; pure, no I/O
- `tasks.ts` — task definitions (expected findings, forbidden findings, severity caps)
- `fixtures/_base/` + `fixtures/<task-id>/` — base repo and per-task overlay; files carry a `.txt`
  suffix so tsc/eslint ignore their intentional defects (stripped on copy)
- `references/` — known-good reviews, one per task
- `workspace.ts` — sandbox builder, outcome inspection, headless `claude` runner
- `grader.spec.ts` — self-tests (reference passes, wrong reviews fail, wording variation tolerated)
- `agent.eval.ts`, `eval-reporter.ts`, `playwright.config.ts` — live run and aggregation

## Adding a task

1. Add `fixtures/<id>/` with only the files the change touches (mirror the real repo paths, add `.txt`).
2. Seed **one** defect. Add an entry to `tasks.ts` with the file, line range, `§` and keywords.
3. Write `references/<id>.md` in the skill's output format. `npm run eval:review:grader` must pass.
4. Keep the set balanced: for every "must flag" task, consider a nearby "must not flag" one.

## Known limits

- Keyword and line-range matching is deterministic but can miss a valid finding phrased in an
  unexpected way. When a live trial fails on a correct review, widen the task's `keywords`.
- Test execution is skipped in the sandbox (no browsers/network), so the skill's step 5 is not
  covered; `tests:` is only checked for presence.
- The LLM judge is non-deterministic and only calibrated on 8 cases. Treat its score as a signal to
  read the transcript, not as ground truth. Tone is not judged.
