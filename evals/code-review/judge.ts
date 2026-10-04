import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildJudgePrompt,
  DIMENSIONS,
  parseVerdict,
  summarizeJudgments,
  type Dimension,
  type JudgeResult,
  type JudgeSummary,
} from './llm-grader';
import { runJudge } from './workspace';

const rubricFor = (dimension: Dimension): string =>
  fs.readFileSync(path.join(__dirname, 'rubrics', `${dimension}.md`), 'utf8');

/** One isolated judge call. Runs in an empty temp dir so it cannot read the repo or the skill. */
export function judgeDimension(dimension: Dimension, change: string, report: string): JudgeResult {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), `review-judge-${dimension}-`));
  try {
    const run = runJudge(cwd, buildJudgePrompt(rubricFor(dimension), change, report));
    if (run.isError) throw new Error(`judge errored for ${dimension}: ${run.report}`);
    return { dimension, ...parseVerdict(run.report) };
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

export function judgeReview(change: string, report: string): JudgeSummary {
  return summarizeJudgments(DIMENSIONS.map((d) => judgeDimension(d, change, report)));
}
