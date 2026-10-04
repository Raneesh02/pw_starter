import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { passAtK, passPowK } from './grader';

interface Trial {
  passed: boolean;
  score: number;
  /** Present only when the LLM judge ran. */
  judgeScore?: number;
}

/** Aggregates per-task trials into pass@k, pass^k and mean score. */
class EvalReporter implements Reporter {
  private readonly byTask = new Map<string, Trial[]>();

  onTestEnd(_test: TestCase, result: TestResult): void {
    const attachment = result.attachments.find((a) => a.name === 'eval-grade');
    if (!attachment?.body) return;
    const { taskId, passed, score, judgeScore } = JSON.parse(attachment.body.toString());
    this.byTask.set(taskId, [...(this.byTask.get(taskId) ?? []), { passed, score, judgeScore }]);
  }

  onEnd(): void {
    if (this.byTask.size === 0) return;
    console.log('\ntask'.padEnd(28) + 'trials  pass@k  pass^k  mean score  judge');
    for (const [taskId, trials] of this.byTask) {
      const flags = trials.map((t) => t.passed);
      const mean = trials.reduce((s, t) => s + t.score, 0) / trials.length;
      const judged = trials.flatMap((t) => (t.judgeScore === undefined ? [] : [t.judgeScore]));
      const judge = judged.length
        ? (judged.reduce((s, v) => s + v, 0) / judged.length).toFixed(2)
        : 'n/a';
      console.log(
        taskId.padEnd(27) +
          String(trials.length).padEnd(8) +
          String(passAtK(flags)).padEnd(8) +
          String(passPowK(flags)).padEnd(8) +
          mean.toFixed(2).padEnd(12) +
          judge,
      );
    }
  }
}

export default EvalReporter;
