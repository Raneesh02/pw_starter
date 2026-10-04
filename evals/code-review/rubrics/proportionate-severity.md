# Dimension: proportionate severity

Question: does each finding sit under the severity heading the skill defines for it?

The skill's definitions:

- Blocker: breaks a MUST-level rule (committed secrets, a test that cannot fail, a failing test)
- Major: layering violations, locator priority violations, data isolation problems
- Minor: naming and comment issues
- Suggestion: investigative coverage gaps (missing boundary/negative cases and similar)

PASS when every finding is filed under a heading that matches its definition. Adjacent
judgement calls are fine: a reused test ID may be Minor or Major.

FAIL when any finding is clearly mis-filed by more than one step: a committed secret under
Minor or Suggestion, an XPath locator under Blocker, a naming nit under Major, a coverage gap
under Blocker.

UNKNOWN when the report has no findings.

Judge only the severity placement. Ignore whether the finding is true, whether the fix is
concrete, and the report's format.
