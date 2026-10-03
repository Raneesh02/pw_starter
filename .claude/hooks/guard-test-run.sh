#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash).
# Blocks unscoped "run everything" Playwright invocations. Project convention
# (CLAUDE.md, pw-test-writer skill step 8) is to run only the affected spec
# file or a --grep filter, never the full suite.
set -euo pipefail

input="$(cat)"
command="$(echo "$input" | jq -r '.tool_input.command // ""')"

# Only care about commands that actually invoke the playwright test runner.
if ! echo "$command" | grep -qE '(^|[;&|]\s*)(npx[[:space:]]+)?playwright[[:space:]]+test\b'; then
  exit 0
fi

# `npm test` is just the C01 smoke alias in this repo, not a full-suite run.
if echo "$command" | grep -qE '(^|[;&|]\s*)npm[[:space:]]+(run[[:space:]]+)?test\b'; then
  exit 0
fi

# Allow anything already scoped: a file/dir path, a --grep/-g filter,
# --project, --ui, or show-report/list-mode invocations.
if echo "$command" | grep -qE -- '--grep|--g\b|-g[[:space:]]|--project|--ui|show-report|tests/'; then
  exit 0
fi

echo "Blocked: this looks like an unscoped full-suite Playwright run (\"$command\")." >&2
echo "Project convention is to run only the affected spec file or a --grep filter (e.g. 'npx playwright test tests/cart/cart.spec.ts' or 'npx playwright test --grep \"@regression\"')." >&2
exit 2
