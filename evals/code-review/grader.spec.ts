import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { gradeReview, parseReport, passAtK, passPowK } from './grader';
import { tasks } from './tasks';

/**
 * Validates the grader itself, free and deterministic. Reference solutions prove each task is
 * solvable and the grader accepts a correct answer; the mutations prove it rejects wrong ones.
 */
const reference = (id: string): string =>
  fs.readFileSync(path.join(__dirname, 'references', `${id}.md`), 'utf8');
const task = (id: string) => {
  const found = tasks.find((t) => t.id === id);
  if (!found) throw new Error(`unknown task ${id}`);
  return found;
};
const untouched = { changedFiles: [], headMoved: false };

test.describe('reference solutions', () => {
  for (const t of tasks) {
    test(`G01 – should pass with full score when the reference review is graded for ${t.id}`, () => {
      const grade = gradeReview(reference(t.id), t, untouched);
      expect(grade.checks.filter((c) => !c.passed)).toEqual([]);
      expect(grade.passed).toBe(true);
      expect(grade.score).toBe(1);
    });
  }
});

test.describe('positive tasks reject wrong reviews', () => {
  const positive = tasks.filter((t) => t.expected.length > 0);

  for (const t of positive) {
    test(`G02 – should fail when the review is empty for ${t.id}`, () => {
      expect(gradeReview('', t, untouched).passed).toBe(false);
    });

    test(`G03 – should fail when the review says there are no issues for ${t.id}`, () => {
      expect(gradeReview('No issues found.\n\ntests: n/a', t, untouched).passed).toBe(false);
    });

    test(`G04 – should fail when the finding points at the wrong file for ${t.id}`, () => {
      const wrongFile = reference(t.id).replace(t.expected[0].file, 'pages/home.page.ts');
      expect(gradeReview(wrongFile, t, untouched).passed).toBe(false);
    });
  }

  test('G05 – should fail when the finding points outside the defect lines', () => {
    const t = task('hardcoded-secret');
    const shifted = reference(t.id).replace('data/config.ts:8', 'data/config.ts:1');
    expect(gradeReview(shifted, t, untouched).passed).toBe(false);
  });
});

test.describe('negative tasks reject false positives', () => {
  test('G06 – should fail when a clean change is given a Major finding', () => {
    const report = [
      '**Major**',
      '- tests/cart/cart.spec.ts:20 — §5 — the empty-cart assertion is weak — assert more',
      '',
      'tests: n/a',
    ].join('\n');
    const grade = gradeReview(report, task('clean-change'), untouched);
    expect(grade.passed).toBe(false);
    expect(grade.checks.find((c) => c.name === 'max-major-findings')?.passed).toBe(false);
  });

  test('G07 – should still pass when a clean change only gets a Suggestion', () => {
    const report = [
      '**Suggestion**',
      '- tests/cart/cart.spec.ts:20 — — — no boundary case for two items — add one',
      '',
      'tests: n/a',
    ].join('\n');
    expect(gradeReview(report, task('clean-change'), untouched).passed).toBe(true);
  });

  test('G08 – should fail when a style-only change is flagged for formatting', () => {
    const report = [
      '**Minor**',
      '- pages/home.page.ts:1 — — — double quotes and missing semicolons — run prettier',
      '',
      'tests: n/a',
    ].join('\n');
    const grade = gradeReview(report, task('style-only-change'), untouched);
    expect(grade.passed).toBe(false);
    expect(
      grade.checks.find((c) => c.name === 'no-false-positive:out-of-scope-style')?.passed,
    ).toBe(false);
  });

  test('G09 – should fail when a style-only change is flagged for an unused import', () => {
    const report = [
      '**Suggestion**',
      '- pages/home.page.ts:1 — — — `expect` is imported but unused — remove it',
      '',
      'tests: n/a',
    ].join('\n');
    expect(gradeReview(report, task('style-only-change'), untouched).passed).toBe(false);
  });
});

test.describe('outcome grading', () => {
  test('G10 – should fail when the skill edited a file despite a correct report', () => {
    const t = task('hardcoded-secret');
    const grade = gradeReview(reference(t.id), t, {
      changedFiles: ['data/config.ts'],
      headMoved: false,
    });
    expect(grade.passed).toBe(false);
    expect(grade.checks.find((c) => c.name === 'outcome:workspace-unchanged')?.passed).toBe(false);
  });

  test('G11 – should fail when the skill committed despite a correct report', () => {
    const t = task('hardcoded-secret');
    const grade = gradeReview(reference(t.id), t, { changedFiles: [], headMoved: true });
    expect(grade.passed).toBe(false);
  });
});

test.describe('tolerance to valid variation', () => {
  test('G12 – should pass when wording, bullets, backticks and headings differ from the reference', () => {
    const t = task('test-cannot-fail');
    const variant = [
      '### Blocker',
      '1. `tests/cart/cart.spec.ts:21` — §5 — this test has no assertion at all, so it cannot fail — add an expect() on the cart contents',
      '',
      'tests: n/a',
    ].join('\n');
    const grade = gradeReview(variant, t, untouched);
    expect(grade.passed).toBe(true);
  });

  test('G13 – should pass on substance when the finding cites the keyword but no section', () => {
    const t = task('locator-xpath');
    const variant = [
      '**Major**',
      '- pages/cart.page.ts:11 — — — XPath locator for the remove button — use getByRole',
      '',
      'tests: n/a',
    ].join('\n');
    expect(gradeReview(variant, t, untouched).passed).toBe(true);
  });

  test('G14 – should accept a bare file name when the finding omits the directory', () => {
    const t = task('hardcoded-secret');
    const variant = reference(t.id).replace('data/config.ts', 'config.ts');
    expect(gradeReview(variant, t, untouched).passed).toBe(true);
  });
});

test.describe('partial credit and format', () => {
  test('G15 – should lower the score but still pass when only the output format is off', () => {
    const t = task('hardcoded-secret');
    const sloppy = [
      'Here is my review of the branch:',
      '',
      '**Blocker**',
      '- data/config.ts:8 §9 a live API key is committed',
    ].join('\n');
    const grade = gradeReview(sloppy, t, untouched);
    expect(grade.passed).toBe(true);
    expect(grade.score).toBeLessThan(1);
    expect(grade.score).toBeGreaterThan(0.5);
  });

  test('G16 – should give partial credit when the defect is found at the wrong severity', () => {
    const t = task('hardcoded-secret');
    const downgraded = reference(t.id).replace('**Blocker**', '**Minor**');
    const grade = gradeReview(downgraded, t, untouched);
    expect(grade.passed).toBe(true);
    expect(grade.checks.find((c) => c.name === 'severity:committed-api-key')?.passed).toBe(false);
    expect(grade.score).toBeLessThan(1);
  });
});

test.describe('report parsing', () => {
  test('G17 – should attach each finding to the severity heading above it', () => {
    const findings = parseReport(
      ['**Blocker**', '- a/b.ts:1 — §9 — x — y', '**Suggestion**', '- c/d.ts:2 — — — x — y'].join(
        '\n',
      ),
    );
    expect(findings.map((f) => [f.file, f.severity, f.section, f.wellFormed])).toEqual([
      ['a/b.ts', 'blocker', 9, true],
      ['c/d.ts', 'suggestion', null, true],
    ]);
  });
});

test.describe('trial aggregation', () => {
  test('G18 – should report pass@k as any-pass and pass^k as all-pass', () => {
    expect(passAtK([false, true, false])).toBe(true);
    expect(passPowK([false, true, false])).toBe(false);
    expect(passPowK([true, true, true])).toBe(true);
    expect(passAtK([])).toBe(false);
    expect(passPowK([])).toBe(false);
  });
});
