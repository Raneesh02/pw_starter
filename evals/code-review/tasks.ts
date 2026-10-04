import type { Task } from './grader';

/**
 * One seeded defect per task, so two reviewers would reach the same verdict. The set is balanced:
 * five tasks where a finding must appear, two where nothing (or nothing in scope) may appear.
 * Fixtures live in `fixtures/<id>/` as an overlay on `fixtures/_base/`; see `workspace.ts`.
 */
export const tasks: Task[] = [
  {
    id: 'layering-raw-page',
    description: 'Spec drives the browser with raw `page.` calls instead of a page object (§1).',
    expected: [
      {
        id: 'raw-page-in-spec',
        file: 'tests/cart/cart.spec.ts',
        sections: [1],
        keywords: ['raw `?page\\.', 'page object', 'layer'],
        severities: ['major'],
        lines: [17, 24],
        required: true,
      },
    ],
    forbidden: [],
  },
  {
    id: 'locator-xpath',
    description: 'Page object uses an XPath locator and a positional row selector (§4).',
    expected: [
      {
        id: 'xpath-locator',
        file: 'pages/cart.page.ts',
        sections: [4],
        keywords: ['xpath', 'getByRole', 'positional'],
        severities: ['major'],
        lines: [6, 20],
        required: true,
      },
    ],
    forbidden: [],
  },
  {
    id: 'hardcoded-secret',
    description: 'A live API key is committed in a data file (§9).',
    expected: [
      {
        id: 'committed-api-key',
        file: 'data/config.ts',
        sections: [9],
        keywords: ['secret', 'credential', 'api ?key', '\\.env'],
        severities: ['blocker'],
        lines: [7, 8],
        required: true,
      },
    ],
    forbidden: [],
  },
  {
    id: 'test-cannot-fail',
    description: 'A new test performs actions but never asserts anything (§5).',
    expected: [
      {
        id: 'no-assertion',
        file: 'tests/cart/cart.spec.ts',
        sections: [5],
        keywords: ['assert', 'expect', 'cannot fail', "can't fail", 'never fail'],
        severities: ['blocker'],
        lines: [17, 26],
        required: true,
      },
    ],
    forbidden: [],
  },
  {
    id: 'duplicate-test-id',
    description: 'A new spec reuses test ID C01, which already exists in cart.spec.ts (§2).',
    expected: [
      {
        id: 'reused-id',
        file: 'tests/cart/cart-quantity.spec.ts',
        sections: [2, 10],
        keywords: ['duplicate', 'unique', 'reused', 'already (used|exists)', '\\bC01\\b'],
        severities: ['minor', 'major'],
        lines: [5, 7],
        required: true,
      },
    ],
    forbidden: [],
  },
  {
    id: 'clean-change',
    description:
      'A guideline-conformant change. A correct review reports nothing above Suggestion.',
    expected: [],
    forbidden: [
      {
        id: 'invented-defect',
        reason: 'no finding may cite a rule the change does not break',
        file: 'tests/cart/cart.spec.ts',
        keywords: ['xpath', 'waitForTimeout', 'hard-?coded', 'secret', 'duplicate'],
      },
    ],
    maxFindings: { blocker: 0, major: 0, minor: 0 },
  },
  {
    id: 'style-only-change',
    description:
      'Only formatting/lint problems (quotes, semicolons, indentation, unused import). CI enforces them and they are out of scope for the skill, so none may be reported.',
    expected: [],
    forbidden: [
      {
        id: 'out-of-scope-style',
        reason: 'linting, type-checking and formatting are out of scope for pw-code-review',
        keywords: [
          'prettier',
          'eslint',
          '\\blint',
          'semicolon',
          'quote',
          'indent',
          'formatting',
          'unused',
        ],
      },
    ],
    maxFindings: { blocker: 0, major: 0, minor: 0 },
  },
];
