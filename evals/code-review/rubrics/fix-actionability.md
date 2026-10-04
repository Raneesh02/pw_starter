# Dimension: fix actionability

Question: could a developer apply every finding's fix without asking a follow-up question?

PASS when every finding names a concrete change: what to change, where, and ideally to what
(e.g. "use `getByRole('button', { name: 'Remove' })`", "move it into a `HomePage` action",
"rename to the next free ID"). Brief is fine. Naming the file and rule is not enough on its own.

FAIL when any finding's fix is vague or circular ("fix this", "improve", "be careful",
"follow the guidelines", "refactor"), or restates the problem without saying what to do.

UNKNOWN when the report has no findings to judge (for example "No issues found").

Judge only the fixes. Ignore whether the finding itself is correct, how severe it is, and the
wording or format of the report.
