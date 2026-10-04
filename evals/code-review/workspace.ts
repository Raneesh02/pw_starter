import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Task, WorkspaceOutcome } from './grader';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURES = path.join(__dirname, 'fixtures');

/** Repo files the skill reads at review time; copied so the sandbox sees the real, current ones. */
const REPO_INPUTS = ['agent-context', '.claude/skills/pw-code-review', 'CLAUDE.md'];

export interface Workspace {
  dir: string;
  /** HEAD of the `feature` branch before the agent ran. */
  head: string;
  /** Content hash per file before the agent ran. */
  snapshot: Record<string, string>;
}

function copyTree(src: string, dest: string, stripTxt: boolean): void {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, path.join(dest, entry.name), stripTxt);
    } else {
      // Fixtures carry a `.txt` suffix so tsc/eslint ignore their intentional defects.
      const name = stripTxt ? entry.name.replace(/\.txt$/, '') : entry.name;
      fs.mkdirSync(dest, { recursive: true });
      fs.copyFileSync(from, path.join(dest, name));
    }
  }
}

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
}

/** `.git` is internal state and `.claude` is where the CLI keeps session files; neither is "code". */
function snapshotOf(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === '.claude') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const rel = path.relative(dir, full).replace(/\\/g, '/');
        out[rel] = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      }
    }
  };
  walk(dir);
  return out;
}

/**
 * Builds a throwaway git repo: `main` holds the base fixture plus the guidelines and the skill,
 * `feature` adds the task's overlay. Each trial gets its own directory, so trials share no state.
 */
export function createWorkspace(task: Task): Workspace {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `review-eval-${task.id}-`));

  copyTree(path.join(FIXTURES, '_base'), dir, true);
  for (const input of REPO_INPUTS) {
    const from = path.join(REPO_ROOT, input);
    if (fs.statSync(from).isDirectory()) copyTree(from, path.join(dir, input), false);
    else fs.copyFileSync(from, path.join(dir, input));
  }

  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'eval@example.com');
  git(dir, 'config', 'user.name', 'eval');
  git(dir, 'config', 'commit.gpgsign', 'false');
  git(dir, 'config', 'core.autocrlf', 'false');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');

  git(dir, 'checkout', '-q', '-b', 'feature');
  copyTree(path.join(FIXTURES, task.id), dir, true);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'change');

  return { dir, head: git(dir, 'rev-parse', 'HEAD'), snapshot: snapshotOf(dir) };
}

export function inspectWorkspace(ws: Workspace): WorkspaceOutcome {
  const after = snapshotOf(ws.dir);
  const paths = new Set([...Object.keys(ws.snapshot), ...Object.keys(after)]);
  const changedFiles = [...paths].filter((p) => ws.snapshot[p] !== after[p]).sort();
  return { changedFiles, headMoved: git(ws.dir, 'rev-parse', 'HEAD') !== ws.head };
}

export function removeWorkspace(ws: Workspace): void {
  fs.rmSync(ws.dir, { recursive: true, force: true });
}

export interface AgentRun {
  report: string;
  isError: boolean;
  /** Tracked, never graded: turns, wall time and cost say how the run went, not whether it was right. */
  metrics: { numTurns?: number; durationMs?: number; costUsd?: number };
}

/** Quote an argument that may be empty or contain shell metacharacters (Windows runs via cmd). */
const quote = (arg: string): string => (process.platform === 'win32' ? `"${arg}"` : arg);

/**
 * Runs `claude -p` headlessly in `cwd`. The prompt goes in on stdin to avoid shell quoting on
 * Windows. `extraArgs` carries the per-caller tool and permission policy.
 */
export function runClaude(cwd: string, prompt: string, extraArgs: string[]): AgentRun {
  const win = process.platform === 'win32';
  const args = ['-p', '--output-format', 'json', ...extraArgs];
  if (process.env.EVAL_MODEL) args.push('--model', process.env.EVAL_MODEL);

  const res = spawnSync(process.env.CLAUDE_BIN ?? 'claude', args, {
    cwd,
    input: prompt,
    encoding: 'utf8',
    shell: win,
    timeout: 9 * 60_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.error) throw res.error;

  try {
    const json = JSON.parse(res.stdout) as {
      result?: string;
      is_error?: boolean;
      num_turns?: number;
      duration_ms?: number;
      total_cost_usd?: number;
    };
    return {
      report: json.result ?? '',
      isError: Boolean(json.is_error),
      metrics: {
        numTurns: json.num_turns,
        durationMs: json.duration_ms,
        costUsd: json.total_cost_usd,
      },
    };
  } catch {
    throw new Error(`claude did not return JSON (exit ${res.status}): ${res.stderr || res.stdout}`);
  }
}

/**
 * Runs the skill. Edits are auto-accepted on purpose: the sandbox is disposable, and the outcome
 * check proves whether the skill stayed read-only instead of a permission wall hiding a violation.
 */
export function runSkill(cwd: string, prompt: string): AgentRun {
  return runClaude(cwd, prompt, [
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    quote('Bash(git:*)'),
  ]);
}

/** Runs a judge: no tools, no skills, so the verdict rests on the prompt alone. */
export function runJudge(cwd: string, prompt: string): AgentRun {
  return runClaude(cwd, prompt, ['--tools', quote(''), '--disable-slash-commands']);
}

const NL = '\n';

const GUIDELINES = 'agent-context/CODING_GUIDELINES.md';

/**
 * Everything a judge needs to verify a review's claims: the branch diff, the repo files at HEAD
 * (the diff alone cannot show, e.g., that test ID C01 already exists in another file), and the
 * guidelines the review cites by section number.
 */
export function describeChange(ws: Workspace): string {
  const diff = git(ws.dir, 'diff', 'main...HEAD');
  const files = Object.keys(ws.snapshot)
    .filter((p) => p === GUIDELINES || (!p.startsWith('agent-context/') && p !== 'CLAUDE.md'))
    .sort()
    .map((p) => ['--- ' + p, fs.readFileSync(path.join(ws.dir, p), 'utf8')].join(NL));
  return ['## Diff (main...HEAD)', diff, '', '## Repository files at HEAD', files.join(NL)].join(
    NL,
  );
}
