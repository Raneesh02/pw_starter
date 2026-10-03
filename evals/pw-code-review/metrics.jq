# Per-trial metrics from a slurped `claude -p --output-format stream-json --verbose` transcript.
# Usage: jq -s -f metrics.jq <trial>.jsonl

def counts: group_by(.name) | map({key: .[0].name, value: length}) | from_entries;
def total(f): map(f // 0) | add // 0;
def epochMs: (sub("\\.[0-9]+Z$"; "Z") | fromdate) * 1000
  + ((capture("\\.(?<ms>[0-9]{1,3})") | .ms | tonumber) // 0);

# Background subagents make -p emit one `result` per resumed turn: cost/usage are cumulative (take
# the last), duration_ms is per turn, so wall time comes from the message timestamps instead.
map(select(.type == "result")) as $results
| ($results | last) as $r
| [.[] | .timestamp? // empty | epochMs] as $ts
# Every tool_use block, tagged with its message id (one API message can span several lines) and
# the Agent call it ran under (null = the main loop).
| [.[] | select(.type == "assistant") | . as $m | .message.content[]? | select(.type == "tool_use")
    | {name, id, input, msg: $m.message.id, parent: $m.parent_tool_use_id}
    | select(.name != "SubagentHandback")] as $calls
| [$calls[] | select(.name == "Agent" and .parent == null)] as $agents
| ($agents | map({key: .id, value: (.input.subagent_type // "general-purpose")}) | from_entries) as $agentOf
| [$r.modelUsage // {} | .[]] as $models
| {
    error: ($r == null or $r.is_error == true),
    durationMs: (if ($ts | length) > 1 then ($ts | max) - ($ts | min) else $results | total(.duration_ms) end),
    apiMs: $r.duration_api_ms,
    turns: ($results | total(.num_turns)),
    costUsd: $r.total_cost_usd,
    # modelUsage includes subagents; top-level `usage` is the main loop only.
    tokens: {
      input: ($models | total(.inputTokens)),
      output: ($models | total(.outputTokens)),
      cacheRead: ($models | total(.cacheReadInputTokens)),
      cacheCreate: ($models | total(.cacheCreationInputTokens))
    },
    byModel: ($r.modelUsage // {} | map_values({inputTokens, outputTokens, costUSD})),
    toolCalls: {
      total: ($calls | length),
      main: ([$calls[] | select(.parent == null)] | counts),
      subagents: ([$calls[] | select(.parent != null) | . + {agent: ($agentOf[.parent] // "nested")}]
        | group_by(.agent) | map({key: .[0].agent, value: counts}) | from_entries)
    },
    agents: ([$agents[].input.subagent_type] | sort),
    # All Agent calls issued in one API message = dispatched in parallel.
    parallel: (($agents | length) > 0 and ($agents | map(.msg) | unique | length) == 1),
    edits: [$calls[] | select(.name | IN("Edit", "Write", "NotebookEdit")) | .name],
    bashCommands: [$calls[] | select(.name == "Bash") | .input.command],
    denied: [$r.permission_denials[]? | .tool_name]
  }
