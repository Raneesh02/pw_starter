#!/usr/bin/env bash
# PreToolUse hook (matcher: the Jira MCP server's comment-creating tool).
# Flat block: no AI-authored Jira comments, ever.
#
# NOTE: the matcher in settings.json below is a best-effort name
# ("mcp__jira__*comment*") since this session has no live connection to the
# project's Jira MCP server to read its exact tool names. Before relying on
# this hook, run `/mcp` (or inspect tool names in a session where the Jira
# server is connected) and, if the real tool name differs, update the
# matcher in .claude/settings.json to match it exactly.
set -euo pipefail

input="$(cat)"
tool_name="$(echo "$input" | jq -r '.tool_name // ""')"

echo "Blocked: \"$tool_name\" would post an AI-authored Jira comment. Jira comments must be posted by a human, not the agent." >&2
exit 2
