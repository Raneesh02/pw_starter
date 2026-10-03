// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Playwright-specific: ban waitForTimeout in favour of element/response waits
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message:
            "Use a specific element or response wait instead of waitForTimeout.",
        },
        {
          // Prevent copying locators into spec files — they belong in page objects
          selector:
            "CallExpression[callee.object.name='page'][callee.property.name=/^(locator|getByRole|getByLabel|getByText|getByTestId|getByPlaceholder|getByAltText|getByTitle)$/]",
          message:
            "Locators belong in page objects, not specs. Move this to the appropriate page object.",
        },
      ],

      // Enforce assertions carry a message (intent statement)
      // Note: the Playwright-specific assertion message rule lives in
      // eslint-plugin-playwright; until that's added, flag bare toBeVisible()
      // calls without a message via the general no-unused-expressions rule.

      // TypeScript quality
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-floating-promises": "error",

      // General hygiene
      "no-console": "warn",
      eqeqeq: ["error", "always"],
      "no-duplicate-imports": "error",
    },
  },
  {
    // Relax a few rules inside spec files (test helpers legitimately use console, etc.)
    files: ["tests/**/*.ts"],
    rules: {
      "no-console": "off",
      // Locators in specs are forbidden by no-restricted-syntax above; keep it.
    },
  },
  {
    // Ignore compiled output and Playwright internals
    ignores: ["dist/", "node_modules/", "playwright-report/", "test-results/"],
  }
);
