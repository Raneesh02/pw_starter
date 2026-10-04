/**
 * Code-based grader for the `pw-code-review` skill.
 *
 * Grades the *outcome* (the review report plus the state of the workspace afterwards), never the
 * path the agent took: no tool-call order, no turn counts. Everything checked here is derivable
 * from the task definition, so a task that fails is a task the skill got wrong, not a hidden rule.
 */

export type Severity = 'blocker' | 'major' | 'minor' | 'suggestion';

/** A defect seeded into a fixture that a correct review must surface. */
export interface ExpectedFinding {
  id: string;
  /** Path (or path suffix) the finding must point at. */
  file: string;
  /** Guideline sections (§N) that count as a hit when cited. */
  sections: number[];
  /** Regex sources (case-insensitive) that count as a hit when they match the finding's text. */
  keywords: string[];
  /** Severity groups the skill's output format accepts for this defect. */
  severities: Severity[];
  /** Inclusive line range the finding must point into. Omit to accept any line. */
  lines?: [number, number];
  /** Required findings gate pass/fail; optional ones only add partial credit. */
  required: boolean;
}

/** Something a correct review must NOT report (false positive or out-of-scope noise). */
export interface ForbiddenFinding {
  id: string;
  reason: string;
  /** Restrict to findings pointing at this file. Omit to apply to every finding. */
  file?: string;
  /** Regex sources (case-insensitive); a finding whose text matches any of them is a violation. */
  keywords: string[];
}

export interface Task {
  id: string;
  description: string;
  expected: ExpectedFinding[];
  forbidden: ForbiddenFinding[];
  /** Upper bound on findings per severity group. Used by the negative (clean) tasks. */
  maxFindings?: Partial<Record<Severity, number>>;
}

/** What the workspace looked like after the agent finished (outcome grading). */
export interface WorkspaceOutcome {
  /** Files that differ from the snapshot taken before the run. Empty when the skill stayed read-only. */
  changedFiles: string[];
  /** True when HEAD moved, i.e. the agent committed. */
  headMoved: boolean;
}

export interface ParsedFinding {
  raw: string;
  severity: Severity | null;
  file: string;
  line: number;
  section: number | null;
  /** True when the line follows `file:line — §N — issue — fix` exactly. */
  wellFormed: boolean;
}

export interface Check {
  name: string;
  weight: number;
  /** A failing required check fails the whole task regardless of score. */
  required: boolean;
  passed: boolean;
  detail: string;
}

export interface GradeResult {
  taskId: string;
  passed: boolean;
  /** Weighted share of passed checks, 0..1. Gives partial credit to near-misses. */
  score: number;
  checks: Check[];
  findings: ParsedFinding[];
}

const SEVERITY_HEADING =
  /^\s*(?:#{1,6}\s*)?[*_]*(blocker|major|minor|suggestions?)[*_]*(?:\s*[(—–:-].*)?$/i;

// Tolerant on purpose: bullet style, backticks and dash flavour are presentation, not substance.
const FINDING_LINE =
  /^\s*(?:[-*•]|\d+[.)])?\s*`?([A-Za-z0-9_./\\@-]+\.(?:ts|tsx|js|mjs|cjs|json|md|yml|yaml|txt)):(\d+)(?:[-–]\d+)?`?\s*(.*)$/;

const SECTION_REF = /§\s*(\d+)/;

function toSeverity(word: string): Severity {
  const w = word.toLowerCase();
  return w.startsWith('suggestion') ? 'suggestion' : (w as Severity);
}

function isWellFormed(rest: string): boolean {
  // `— §N — issue — fix`, with `—` allowed in place of §N for investigative findings.
  const parts = rest.split(/\s[—–]\s/).map((p) => p.trim());
  if (parts.length < 4 || parts[0] !== '') return false;
  return /^(§\s*\d+(?:\.\d+)?|[—–-])$/.test(parts[1]) && parts[2] !== '' && parts[3] !== '';
}

export function parseReport(report: string): ParsedFinding[] {
  const findings: ParsedFinding[] = [];
  let severity: Severity | null = null;
  for (const line of report.split(/\r?\n/)) {
    const heading = SEVERITY_HEADING.exec(line);
    if (heading && !FINDING_LINE.test(line)) {
      severity = toSeverity(heading[1]);
      continue;
    }
    const m = FINDING_LINE.exec(line);
    if (!m) continue;
    const section = SECTION_REF.exec(m[3]);
    findings.push({
      raw: line.trim(),
      severity,
      file: m[1].replace(/\\/g, '/').replace(/^\.\//, ''),
      line: Number(m[2]),
      section: section ? Number(section[1]) : null,
      // The finding regex swallows the whitespace after `file:line`; restore it for the dash split.
      wellFormed: isWellFormed(' ' + m[3]),
    });
  }
  return findings;
}

function fileMatches(found: string, wanted: string): boolean {
  const f = found.replace(/\\/g, '/').replace(/^\.\//, '');
  const w = wanted.replace(/\\/g, '/').replace(/^\.\//, '');
  return f === w || w.endsWith('/' + f) || f.endsWith('/' + w);
}

function anyMatch(sources: string[], text: string): boolean {
  return sources.some((s) => new RegExp(s, 'i').test(text));
}

function isHit(f: ParsedFinding, e: ExpectedFinding): boolean {
  if (!fileMatches(f.file, e.file)) return false;
  if (e.lines && (f.line < e.lines[0] || f.line > e.lines[1])) return false;
  const cited = f.section !== null && e.sections.includes(f.section);
  return cited || anyMatch(e.keywords, f.raw);
}

const SEVERITIES: Severity[] = ['blocker', 'major', 'minor', 'suggestion'];

export function gradeReview(report: string, task: Task, outcome?: WorkspaceOutcome): GradeResult {
  const findings = parseReport(report);
  const checks: Check[] = [];
  const add = (name: string, weight: number, required: boolean, passed: boolean, detail = '') =>
    checks.push({ name, weight, required, passed, detail });

  const lines = report.split(/\r?\n/).filter((l) => l.trim() !== '');
  add('report:non-empty', 1, true, lines.length > 0, 'the report must not be empty');

  // Recall: every seeded defect must be surfaced, in the right place.
  for (const e of task.expected) {
    const hits = findings.filter((f) => isHit(f, e));
    add(
      `found:${e.id}`,
      e.required ? 3 : 1,
      e.required,
      hits.length > 0,
      hits.length > 0 ? hits[0].raw : `no finding on ${e.file} matching ${e.id}`,
    );
    const severityOk = hits.some((f) => f.severity !== null && e.severities.includes(f.severity));
    add(
      `severity:${e.id}`,
      1,
      false,
      severityOk,
      `expected one of [${e.severities.join(', ')}], got [${hits.map((f) => f.severity).join(', ')}]`,
    );
  }

  // Precision: no out-of-scope noise, no false positives.
  for (const x of task.forbidden) {
    const hits = findings.filter(
      (f) => (!x.file || fileMatches(f.file, x.file)) && anyMatch(x.keywords, f.raw),
    );
    add(`no-false-positive:${x.id}`, 2, true, hits.length === 0, hits[0]?.raw ?? x.reason);
  }
  for (const sev of SEVERITIES) {
    const cap = task.maxFindings?.[sev];
    if (cap === undefined) continue;
    const n = findings.filter((f) => f.severity === sev).length;
    add(`max-${sev}-findings`, 2, true, n <= cap, `${n} reported, at most ${cap} allowed`);
  }

  // Output contract: graded for partial credit, never gating — format is secondary to substance.
  add(
    'format:finding-lines',
    1,
    false,
    findings.every((f) => f.wellFormed),
    'every finding must read `file:line — §N — issue — fix`',
  );
  const first = lines[0] ?? '';
  add(
    'format:no-preamble',
    1,
    false,
    SEVERITY_HEADING.test(first) ||
      FINDING_LINE.test(first) ||
      /^no (issues|findings)/i.test(first),
    `first line was: ${first.slice(0, 80)}`,
  );
  add(
    'format:tests-line',
    1,
    false,
    /^\s*tests:/i.test(lines[lines.length - 1] ?? ''),
    'the report must end with a `tests:` line',
  );

  // Outcome: the skill is report-only. Verify the environment, not the transcript.
  if (outcome) {
    add(
      'outcome:workspace-unchanged',
      3,
      true,
      outcome.changedFiles.length === 0,
      outcome.changedFiles.join(', '),
    );
    add('outcome:no-commits', 1, true, !outcome.headMoved, 'the skill must never commit');
  }

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  return {
    taskId: task.id,
    passed: checks.every((c) => !c.required || c.passed),
    score: total === 0 ? 0 : earned / total,
    checks,
    findings,
  };
}

/** pass@k: at least one of the trials passed (one good answer is enough). */
export const passAtK = (trials: boolean[]): boolean => trials.some(Boolean);

/** pass^k: every trial passed (consistency, what a CI gate cares about). */
export const passPowK = (trials: boolean[]): boolean => trials.length > 0 && trials.every(Boolean);

export function summarize(grade: GradeResult): string {
  const failed = grade.checks.filter((c) => !c.passed);
  const lines = failed.map((c) => `  ${c.required ? '✗' : '~'} ${c.name} — ${c.detail}`);
  return `${grade.taskId}: ${grade.passed ? 'PASS' : 'FAIL'} (score ${grade.score.toFixed(2)})${
    lines.length ? '\n' + lines.join('\n') : ''
  }`;
}
