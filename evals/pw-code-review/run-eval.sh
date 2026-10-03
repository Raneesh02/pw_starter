#!/usr/bin/env bash
# Eval for the pw-code-review skill: seed a change on main, run the skill, score the report.
# Usage: npm run eval:review [-- <task-id>]   (TRIALS=<n> to change the default of 3 per task)
#        BASELINE=update npm run eval:review  (record this run's medians in baseline.json)
# Test runs are not allowed: this grades the review findings only, not the live-site test results.
#
# Checks per trial (weights in summarize()):
#   defect: found (keyword anywhere) · severity (keyword at >= minSeverity) · location (file:line ±3)
#   clean:  noFalseAlarm (no Blocker/Major findings)
#   both:   format (`reviewers:` line) · dispatched (the 3 reviewer agents each called once,
#           from the transcript) · parallel (one message) · withinBudget (budget.json)
#   gates (score 0 if false): reportOnly (worktree untouched) · noForbiddenTools (no edits,
#           tests, lint, tsc or format)
# Metrics per trial (from the stream-json transcript, see metrics.jq): time, cost, tokens, tool
# calls per agent. Per-task medians are compared against baseline.json (tolerance in budget.json).
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"
EVAL_DIR="$ROOT/evals/pw-code-review"
RESULTS="$EVAL_DIR/results"
BASELINE_FILE="$EVAL_DIR/baseline.json"
TRIALS="${TRIALS:-3}"
REVIEWERS='["pw-architecture-reviewer","pw-code-guidelines-reviewer","pw-security-reviewer"]'
FORBIDDEN_BASH='(^|[;&|(]) *(npx )?(playwright test|npm (run )?(test|lint|format)|tsc|eslint|prettier)( |$)'
# Fresh results every run, so the summary only covers this run.
rm -rf "$RESULTS"
mkdir -p "$RESULTS"

# Lines under a severity heading (e.g. "**Blocker**" or "### Major") until the next heading.
section() {
  awk -v want="$1" '
    tolower($0) ~ /^[#* ]*(blocker|major|minor|suggestion)/ { sec = tolower($0) ~ tolower(want); next }
    /^(reviewers|tests):/ { sec = 0 }
    sec' "$2"
}

# All sections at or above a severity, e.g. "Major" -> Blocker + Major.
at_least() {
  for sev in Blocker Major Minor Suggestion; do
    section "$sev" "$2"
    [[ "$sev" == "$1" ]] && break
  done
}

# stdin mentions any of the task's keywords.
mentions() { grep -qiF -f <(jq -r '.keywords[]' <<<"$1"); }

# A report line naming a keyword also points at file:line within ±3 of the expected line.
near_line() {
  local task="$1" report="$2" want file
  want=$(jq -r '.line' <<<"$task")
  file=$(basename "$(jq -r '.file' <<<"$task")")
  grep -iF -f <(jq -r '.keywords[]' <<<"$task") "$report" | grep -oE "$file:[0-9]+" | cut -d: -f2 |
    { while read -r n; do ((n >= want - 3 && n <= want + 3)) && exit 0; done; exit 1; }
}

bool() { "$@" && echo true || echo false; }

setup_trial() {
  local id="$1" wt="$2" branch="$3"
  git -C "$ROOT" worktree add -q -b "$branch" "$wt" main
  git -C "$wt" apply "$EVAL_DIR/tasks/$id.diff"
  git -C "$wt" commit -qam "eval: $id"
  # Review with the skill/agents from the current working tree (not main's), hidden from git so
  # they don't show up in the diff the skill reviews.
  cp -R "$ROOT/.claude/skills" "$ROOT/.claude/agents" "$wt/.claude/"
  git -C "$wt" ls-files -m .claude | xargs git -C "$wt" update-index --skip-worktree
}

# Writes <out>.jsonl (full transcript), <out>.md (final report), <out>.exit, <out>.stderr.
run_trial() {
  local wt="$1" out="$2"
  (cd "$wt" && claude -p "/pw-code-review" --output-format stream-json --verbose \
    --allowedTools "Read Grep Glob Agent Skill Bash(git diff:*) Bash(git status:*) Bash(git log:*)" \
    >"$out.jsonl" 2>"$out.stderr")
  echo $? >"$out.exit"
  jq -rs 'map(select(.type == "result")) | last | .result // empty' "$out.jsonl" >"$out.md" 2>/dev/null
}

score_trial() {
  local task="$1" t="$2" wt="$3" out="$4" report="$4.md" kind checks metrics exit_code budget
  kind=$(jq -r '.kind' <<<"$task")
  exit_code=$(cat "$out.exit")
  metrics=$(jq -s -f "$EVAL_DIR/metrics.jq" "$out.jsonl" 2>/dev/null) || metrics='{"error": true}'
  # Crashed/errored runs (auth, rate limit, ...) are not skill regressions: exclude from scores.
  if [[ "$exit_code" != 0 ]] || [[ "$(jq '.error' <<<"$metrics")" == true ]]; then
    jq -n --argjson task "$task" --argjson trial "$t" --argjson exitCode "$exit_code" \
      --argjson metrics "$metrics" \
      '{task: $task.id, kind: $task.kind, $trial, error: true, $exitCode, $metrics, checks: {}}'
    return
  fi
  if [[ "$kind" == "defect" ]]; then
    checks=$(jq -n \
      --argjson found "$(bool mentions "$task" <"$report")" \
      --argjson severity "$(at_least "$(jq -r '.minSeverity' <<<"$task")" "$report" | bool mentions "$task")" \
      --argjson location "$(bool near_line "$task" "$report")" \
      '{$found, $severity, $location}')
  else
    checks=$(jq -n \
      --argjson noFalseAlarm "$(at_least Major "$report" | grep -qE '^\s*([-*]|[0-9]+\.)\s' && echo false || echo true)" \
      '{$noFalseAlarm}')
  fi
  budget=$(jq -c --argjson task "$task" '.default + ($task.budget // {})' "$EVAL_DIR/budget.json")
  jq -n --argjson task "$task" --argjson trial "$t" --argjson checks "$checks" \
    --argjson metrics "$metrics" --argjson budget "$budget" --argjson reviewers "$REVIEWERS" \
    --arg forbiddenBash "$FORBIDDEN_BASH" \
    --argjson format "$(bool grep -q '^reviewers:' "$report")" \
    --argjson reportOnly "$([[ -z "$(git -C "$wt" status --porcelain -- .)" ]] && echo true || echo false)" \
    '{task: $task.id, kind: $task.kind, $trial, error: false, $metrics, checks: ($checks + {
        $format,
        dispatched: ($metrics.agents == $reviewers),
        parallel: $metrics.parallel,
        withinBudget: ($metrics.costUsd <= $budget.maxCostUsd
          and $metrics.durationMs <= $budget.maxDurationMs
          and $metrics.toolCalls.total <= $budget.maxToolCalls),
        $reportOnly,
        noForbiddenTools: (($metrics.edits | length) == 0
          and ($metrics.bashCommands | map(test($forbiddenBash)) | any | not))
      })}'
}

summarize() {
  jq -s '
    def weights: {found: 1, severity: 1, location: 1, noFalseAlarm: 1, dispatched: 1,
                  format: 0.5, parallel: 0.5, withinBudget: 0.5};
    def gates: ["reportOnly", "noForbiddenTools"];
    def score: if [.checks[gates[]]] | all | not then 0 else
      ([.checks | to_entries[] | select(.key | IN(gates[]) | not) | select(.value) | weights[.key]] | add // 0)
      / ([.checks | keys[] | select(IN(gates[]) | not) | weights[.]] | add) end;
    def ratio(sel; ok): [.[] | select(sel)] | if length == 0 then null else ([.[] | select(ok)] | length) / length end;
    def median: sort | if length == 0 then null
      elif length % 2 == 1 then .[length / 2 | floor]
      else (.[length / 2 - 1] + .[length / 2]) / 2 end;
    def stats(f): map(f) | {p50: median, max: max};
    (map(select(.error | not)) | map(. + {score: score})) as $trials
    | (map(select(.error)) | length) as $errors
    | ($trials | group_by(.task) | map({
        task: .[0].task, kind: .[0].kind, trials: length,
        passes: [.[] | select(.score == 1)] | length,
        meanScore: (map(.score) | add / length),
        scores: map(.score),
        failedChecks: [.[] | .checks | to_entries[] | select(.value | not) | .key] | unique,
        metrics: {
          durationMs: stats(.metrics.durationMs),
          apiMs: stats(.metrics.apiMs),
          costUsd: stats(.metrics.costUsd),
          outputTokens: stats(.metrics.tokens.output),
          toolCalls: stats(.metrics.toolCalls.total),
          dispatched: ([.[] | select(.checks.dispatched)] | length)
        }
      })) as $tasks
    | {
        tasks: $tasks,
        errors: $errors,
        recall: ($trials | ratio(.kind == "defect"; .checks.found)),
        falsePositiveRate: ($trials | ratio(.kind == "clean"; .checks.noFalseAlarm | not)),
        score: (if ($tasks | length) == 0 then null else $tasks | map(.meanScore) | add / length end),
        passAtK: [$tasks[] | select(.passes > 0)] | length,
        passAllK: [$tasks[] | select(.passes == .trials)] | length,
        taskCount: $tasks | length,
        totals: {
          costUsd: ($trials | map(.metrics.costUsd) | add),
          outputTokens: ($trials | map(.metrics.tokens.output) | add),
          toolCalls: ($trials | map(.metrics.toolCalls.total) | add)
        }
      }' "$RESULTS"/*-t*.json
}

# Per-task medians kept in baseline.json (merged, so a single-task run only updates that task).
baseline_of() {
  jq '{recall, falsePositiveRate,
       tasks: (.tasks | map({key: .task, value: (.metrics | {apiMs: .apiMs.p50, costUsd: .costUsd.p50,
         outputTokens: .outputTokens.p50, toolCalls: .toolCalls.p50})}) | from_entries)}' <<<"$1"
}

# Regressions vs baseline: any task median > baseline × (1 + per-metric tolerance), or worse
# recall/FP rate.
regressions() {
  jq -r --slurpfile base "$BASELINE_FILE" --slurpfile budget "$EVAL_DIR/budget.json" '
    $base[0] as $b | $budget[0].tolerance as $tol
    | (.tasks[] | . as $t | $b.tasks[$t.task] // empty | to_entries[]
        | ($t.metrics[.key].p50) as $cur
        | select(.value != null and $cur != null and $cur > .value * (1 + ($tol[.key] // 0.25)))
        | "REGRESSION \($t.task) \(.key): \($cur) vs baseline \(.value)"),
      (select(.recall != null and $b.recall != null and .recall < $b.recall)
        | "REGRESSION recall: \(.recall) vs baseline \($b.recall)"),
      (select(.falsePositiveRate != null and $b.falsePositiveRate != null
          and .falsePositiveRate > $b.falsePositiveRate)
        | "REGRESSION falsePositiveRate: \(.falsePositiveRate) vs baseline \($b.falsePositiveRate)")
  ' <<<"$1"
}

pct() { awk -v x="$1" 'BEGIN { if (x == "null") print "n/a"; else printf "%d%%", x * 100 + 0.5 }'; }

ids=$(jq -r '.[].id' "$EVAL_DIR/tasks.json")
[[ -n "${1:-}" ]] && ids="$1"

for id in $ids; do
  task=$(jq -c --arg id "$id" '.[] | select(.id == $id)' "$EVAL_DIR/tasks.json")
  [[ -z "$task" ]] && { echo "unknown task: $id"; exit 2; }
  tmp="$(mktemp -d)"

  echo "… running $id × $TRIALS"
  for t in $(seq "$TRIALS"); do setup_trial "$id" "$tmp/t$t" "eval/$id-t$t"; done
  for t in $(seq "$TRIALS"); do run_trial "$tmp/t$t" "$RESULTS/$id-t$t" & done
  wait
  for t in $(seq "$TRIALS"); do
    score_trial "$task" "$t" "$tmp/t$t" "$RESULTS/$id-t$t" >"$RESULTS/$id-t$t.json"
    git -C "$ROOT" worktree remove --force "$tmp/t$t"
    git -C "$ROOT" branch -qD "eval/$id-t$t"
  done
done

summary=$(summarize)
echo "$summary" >"$RESULTS/summary.json"

echo
jq -r '.tasks[] | "\(.task)\t\(.passes)/\(.trials) pass\tscores \(.scores | map(. * 100 | round | tostring + "%") | join(" "))\(if (.failedChecks | length) > 0 then "\tfailed: " + (.failedChecks | join(", ")) else "" end)"' <<<"$summary" | column -t -s $'\t'
echo
{
  echo $'task\tp50 time\tp50 api\tp50 cost\tp50 out-tokens\tp50 tools\tdispatched'
  jq -r '.tasks[] | .metrics as $m | [.task,
      "\($m.durationMs.p50 / 1000 | round)s", "\($m.apiMs.p50 / 1000 | round)s",
      "$\($m.costUsd.p50 * 100 | round / 100)", "\($m.outputTokens.p50 | round)",
      "\($m.toolCalls.p50)", "\($m.dispatched)/\(.trials)"] | @tsv' <<<"$summary"
} | column -t -s $'\t'
echo
echo "score $(pct "$(jq '.score' <<<"$summary")") · recall $(pct "$(jq '.recall' <<<"$summary")") · false positives $(pct "$(jq '.falsePositiveRate' <<<"$summary")") · pass@$TRIALS $(jq -r '"\(.passAtK)/\(.taskCount)"' <<<"$summary") · pass^$TRIALS $(jq -r '"\(.passAllK)/\(.taskCount)"' <<<"$summary")"
echo "total cost \$$(jq '.totals.costUsd * 100 | round / 100' <<<"$summary") · output tokens $(jq '.totals.outputTokens' <<<"$summary") · tool calls $(jq '.totals.toolCalls' <<<"$summary") · wall ${SECONDS}s"
errors=$(jq '.errors' <<<"$summary")
((errors > 0)) && echo "errored trials (excluded from scores): $errors — see results/*.stderr"
echo "reports: $RESULTS"

regressed=""
if [[ "${BASELINE:-}" == update ]]; then
  new=$(baseline_of "$summary")
  [[ -f "$BASELINE_FILE" ]] && new=$(jq -s '.[0] * .[1]' "$BASELINE_FILE" - <<<"$new")
  echo "$new" >"$BASELINE_FILE"
  echo "baseline updated: $BASELINE_FILE"
elif [[ -f "$BASELINE_FILE" ]]; then
  regressed=$(regressions "$summary")
  [[ -n "$regressed" ]] && echo "$regressed" || echo "no regressions vs baseline"
else
  echo "no baseline yet — run BASELINE=update npm run eval:review"
fi

[[ "$(jq '.passAllK == .taskCount and .taskCount > 0' <<<"$summary")" == "true" && -z "$regressed" ]]
