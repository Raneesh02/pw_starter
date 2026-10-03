#!/usr/bin/env bash
# Stop hook. Nudge-only: if this turn touched a directory CLAUDE.md's
# Architecture section documents, remind to check whether that section
# needs updating. Never blocks — this is a judgment call, not a lint rule.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

changed="$(git diff --name-only HEAD 2>/dev/null || true)"
changed+=$'\n'"$(git diff --name-only --cached 2>/dev/null || true)"

dirs="pages/ common_actions/ fixtures/ data/ utils/ .claude/skills/ .claude/agents/"
hit=""
for d in $dirs; do
  if echo "$changed" | grep -q "^${d}"; then
    hit+="${d} "
  fi
done

if [ -n "$hit" ]; then
  echo "Structure under: ${hit}changed this turn — check if CLAUDE.md's Architecture section needs updating." >&2
fi

exit 0
