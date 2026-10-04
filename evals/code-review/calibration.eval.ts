import { test, expect } from '@playwright/test';
import { calibration } from './calibration';
import { judgeDimension } from './judge';
import { tasks } from './tasks';
import { createWorkspace, describeChange, removeWorkspace } from './workspace';

/**
 * Checks the LLM judge against human labels (live: one model call per case). Run this whenever a
 * rubric or the judge model changes; a judge you have not calibrated is an opinion, not a grader.
 */
for (const c of calibration) {
  test(`${c.id} – should judge ${c.dimension} as ${c.label}`, () => {
    const task = tasks.find((t) => t.id === c.taskId);
    if (!task) throw new Error(`unknown task ${c.taskId}`);

    const ws = createWorkspace(task);
    try {
      const result = judgeDimension(c.dimension, describeChange(ws), c.report);
      expect(result.verdict, `${c.why}\n--- judge reasoning ---\n${result.reasoning}`).toBe(
        c.label,
      );
    } finally {
      removeWorkspace(ws);
    }
  });
}
