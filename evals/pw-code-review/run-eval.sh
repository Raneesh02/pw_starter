#!/usr/bin/env bash
# Eval for the pw-code-review skill: seed a change on main, run the skill, score the report.
# Usage: npm run eval:review [-- <task-id>]   (TRIALS=<n> to change the default of 3 per task)
# Test runs are not allowed: this grades the review findings only, not the live-site test results.
#
# Checks per trial (weights in summarize()):
#   defect: found (keyword anywhere) · severity (keyword at >= minSeverity) · location (file:line ±3)
#   clean:  noFalseAlarm (no Blocker/Major findings)
#   both:   format (`reviewers:` line) · reportOnly (worktree untouched — a gate: score 0 if false)
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"
EVAL_DIR="$ROOT/evals/pw-code-review"
RESULTS="$EVAL_DIR/results"
TRIALS="${TRIALS:-3}"
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

run_trial() {
  (cd "$1" && claude -p "/pw-code-review" \
    --allowedTools "Read Grep Glob Agent Skill Bash(git diff:*) Bash(git status:*) Bash(git log:*)" \
    >"$2" 2>&1)
}

score_trial() {
  local task="$1" t="$2" wt="$3" report="$4" kind checks
  kind=$(jq -r '.kind' <<<"$task")
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
  jq -n --argjson task "$task" --argjson trial "$t" --argjson checks "$checks" \
    --argjson format "$(bool grep -q '^reviewers:' "$report")" \
    --argjson reportOnly "$([[ -z "$(git -C "$wt" status --porcelain -- .)" ]] && echo true || echo false)" \
    '{task: $task.id, kind: $task.kind, $trial, checks: ($checks + {$format, $reportOnly})}'
}

summarize() {
  jq -s '
    def weights: {found: 1, severity: 1, location: 1, noFalseAlarm: 1, format: 0.5};
    def score: if .checks.reportOnly | not then 0 else
      ([.checks | to_entries[] | select(.key != "reportOnly" and .value) | weights[.key]] | add // 0)
      / ([.checks | keys[] | select(. != "reportOnly") | weights[.]] | add) end;
    def ratio(sel; ok): [.[] | select(sel)] | if length == 0 then null else ([.[] | select(ok)] | length) / length end;
    map(. + {score: score}) as $trials
    | ($trials | group_by(.task) | map({
        task: .[0].task, kind: .[0].kind, trials: length,
        passes: [.[] | select(.score == 1)] | length,
        meanScore: (map(.score) | add / length),
        scores: map(.score),
        failedChecks: [.[] | .checks | to_entries[] | select(.value | not) | .key] | unique
      })) as $tasks
    | {
        tasks: $tasks,
        recall: ($trials | ratio(.kind == "defect"; .checks.found)),
        falsePositiveRate: ($trials | ratio(.kind == "clean"; .checks.noFalseAlarm | not)),
        score: ($tasks | map(.meanScore) | add / length),
        passAtK: [$tasks[] | select(.passes > 0)] | length,
        passAllK: [$tasks[] | select(.passes == .trials)] | length,
        taskCount: $tasks | length
      }' "$RESULTS"/*-t*.json
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
  for t in $(seq "$TRIALS"); do run_trial "$tmp/t$t" "$RESULTS/$id-t$t.md" & done
  wait
  for t in $(seq "$TRIALS"); do
    score_trial "$task" "$t" "$tmp/t$t" "$RESULTS/$id-t$t.md" >"$RESULTS/$id-t$t.json"
    git -C "$ROOT" worktree remove --force "$tmp/t$t"
    git -C "$ROOT" branch -qD "eval/$id-t$t"
  done
done

summary=$(summarize)
echo "$summary" >"$RESULTS/summary.json"

echo
jq -r '.tasks[] | "\(.task)\t\(.passes)/\(.trials) pass\tscores \(.scores | map(. * 100 | round | tostring + "%") | join(" "))\(if (.failedChecks | length) > 0 then "\tfailed: " + (.failedChecks | join(", ")) else "" end)"' <<<"$summary" | column -t -s $'\t'
echo
echo "score $(pct "$(jq '.score' <<<"$summary")") · recall $(pct "$(jq '.recall' <<<"$summary")") · false positives $(pct "$(jq '.falsePositiveRate' <<<"$summary")") · pass@$TRIALS $(jq -r '"\(.passAtK)/\(.taskCount)"' <<<"$summary") · pass^$TRIALS $(jq -r '"\(.passAllK)/\(.taskCount)"' <<<"$summary")"
echo "reports: $RESULTS"

[[ "$(jq '.passAllK == .taskCount' <<<"$summary")" == "true" ]]
