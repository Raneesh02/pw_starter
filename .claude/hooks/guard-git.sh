#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash).
# Blocks git commit/push so the agent always asks the user first, per
# CLAUDE.md ("never commit or push on your own") and the pw-test-writer
# skill's own checklist (step 10).
set -euo pipefail

input="$(cat)"
command="$(echo "$input" | jq -r '.tool_input.command // ""')"

if echo "$command" | grep -qE '(^|[;&|]\s*)git[[:space:]]+(commit|push)\b'; then
  echo "Blocked: \"$command\" is a commit/push. Project convention requires asking the user before committing or pushing — surface this in chat instead of running it." >&2
  exit 2
fi

exit 0
