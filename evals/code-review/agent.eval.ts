import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { gradeReview, summarize } from './grader';
import { judgeReview } from './judge';
import { tasks } from './tasks';
import {
  createWorkspace,
  describeChange,
  inspectWorkspace,
  removeWorkspace,
  runSkill,
} from './workspace';

/** Trials per task. Agents are non-deterministic, so use 3+ before trusting a result. */
const TRIALS = Number(process.env.EVAL_TRIALS ?? 1);
/** Add the LLM-rubric grader (3 extra model calls per trial). Advisory unless gated. */
const JUDGE = process.env.EVAL_JUDGE === '1';
const JUDGE_GATE = process.env.EVAL_JUDGE_GATE === '1';
const RESULTS_DIR = path.join(__dirname, 'results');

// The prompt names the skill and the goal only. It does not dictate steps (no "read X then run Y"),
// so the agent is free to find any valid route to a correct review.
const PROMPT = [
  'Use the pw-code-review skill to review the changes on the current branch against main.',
  'Test execution is not available in this sandbox (no browsers, no network): skip running tests',
  'and end the report with `tests: n/a`.',
].join(' ');

for (const task of tasks) {
  for (let trial = 1; trial <= TRIALS; trial++) {
    test(`${task.id} – trial ${trial}`, async () => {
      const ws = createWorkspace(task);
      try {
        const run = runSkill(ws.dir, PROMPT);
        const grade = gradeReview(run.report, task, inspectWorkspace(ws));
        const judge = JUDGE ? judgeReview(describeChange(ws), run.report) : undefined;

        // Keep the raw report so a failing grade can be read, not just counted.
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
        fs.writeFileSync(
          path.join(RESULTS_DIR, `${task.id}-trial${trial}.json`),
          JSON.stringify({ run, grade, judge }, null, 2),
        );
        await test.info().attach('eval-grade', {
          body: JSON.stringify({
            taskId: task.id,
            passed: grade.passed,
            score: grade.score,
            judgeScore: judge?.score,
          }),
          contentType: 'application/json',
        });

        expect(run.isError, run.report).toBe(false);
        expect(grade.passed, summarize(grade)).toBe(true);
        // The judge is advisory unless gated: a model's opinion should not fail CI by default.
        if (judge && JUDGE_GATE) {
          const failed = judge.results.filter((r) => r.verdict === 'fail');
          expect(
            failed,
            failed.map((r) => `${r.dimension}: ${r.reasoning}`).join('\n'),
          ).toHaveLength(0);
        }
      } finally {
        removeWorkspace(ws);
      }
    });
  }
}
