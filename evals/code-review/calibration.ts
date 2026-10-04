import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Dimension, Verdict } from './llm-grader';

/**
 * Human-labelled reviews used to check the judge against a person, not against itself. A judge
 * that disagrees with these labels is mis-calibrated: fix the rubric, not the label.
 */
export interface CalibrationCase {
  id: string;
  taskId: string;
  dimension: Dimension;
  /** The label a careful human reviewer gave. */
  label: Exclude<Verdict, 'unknown'>;
  report: string;
  why: string;
}

const reference = (taskId: string): string =>
  fs.readFileSync(path.join(__dirname, 'references', `${taskId}.md`), 'utf8');

export const calibration: CalibrationCase[] = [
  // fix-actionability
  {
    id: 'actionable-reference',
    taskId: 'locator-xpath',
    dimension: 'fix-actionability',
    label: 'pass',
    report: reference('locator-xpath'),
    why: 'names the exact locator to use instead of the XPath',
  },
  {
    id: 'vague-fix',
    taskId: 'hardcoded-secret',
    dimension: 'fix-actionability',
    label: 'fail',
    report: [
      '**Blocker**',
      '- data/config.ts:8 — §9 — there is a secret in this file — fix this',
      '',
      'tests: n/a',
    ].join('\n'),
    why: '"fix this" says nothing about what to change',
  },
  // grounded-claims
  {
    id: 'grounded-reference',
    taskId: 'duplicate-test-id',
    dimension: 'grounded-claims',
    label: 'pass',
    report: reference('duplicate-test-id'),
    why: 'C01 really is used in cart.spec.ts',
  },
  {
    id: 'invented-timeout',
    taskId: 'duplicate-test-id',
    dimension: 'grounded-claims',
    label: 'fail',
    report: [
      '**Major**',
      '- tests/cart/cart-quantity.spec.ts:10 — §5 — the test waits with `page.waitForTimeout(3000)` — wait on a locator or response instead',
      '',
      'tests: n/a',
    ].join('\n'),
    why: 'there is no waitForTimeout anywhere in the change',
  },
  {
    id: 'invented-file',
    taskId: 'duplicate-test-id',
    dimension: 'grounded-claims',
    label: 'fail',
    report: [
      '**Minor**',
      '- tests/cart/cart-quantity.spec.ts:6 — §2 — test ID `C01` is already used in `tests/checkout/checkout.spec.ts` — rename it to `C02`',
      '',
      'tests: n/a',
    ].join('\n'),
    why: 'C01 lives in tests/cart/cart.spec.ts; checkout.spec.ts does not exist',
  },
  // proportionate-severity
  {
    id: 'proportionate-reference',
    taskId: 'hardcoded-secret',
    dimension: 'proportionate-severity',
    label: 'pass',
    report: reference('hardcoded-secret'),
    why: 'a committed secret is a Blocker',
  },
  {
    id: 'secret-as-suggestion',
    taskId: 'hardcoded-secret',
    dimension: 'proportionate-severity',
    label: 'fail',
    report: [
      '**Suggestion**',
      '- data/config.ts:8 — §9 — an API key is committed — move it to a gitignored `.env`',
      '',
      'tests: n/a',
    ].join('\n'),
    why: 'a committed secret under Suggestion is mis-filed by three steps',
  },
  {
    id: 'xpath-as-blocker',
    taskId: 'locator-xpath',
    dimension: 'proportionate-severity',
    label: 'fail',
    report: [
      '**Blocker**',
      '- pages/cart.page.ts:11 — §4 — `removeButton` uses an XPath locator — use `getByRole`',
      '',
      'tests: n/a',
    ].join('\n'),
    why: 'a locator-priority violation is Major, not a MUST-level breach',
  },
];
