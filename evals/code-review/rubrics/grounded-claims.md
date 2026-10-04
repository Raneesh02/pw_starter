# Dimension: grounded claims

Question: is every factual statement the report makes about the code true?

Check each finding against the supplied diff and repository files. A claim is a statement about
what the code does, contains, or lacks: "uses `waitForTimeout`", "C01 is already used in
`cart.spec.ts`", "there is no assertion", "the key is committed", a file path, or a line number.

PASS when every claim is supported by the files shown. Line numbers may be off by a few lines.
Opinions and suggestions ("add a boundary test") are not claims and cannot be false.

FAIL when any claim is contradicted by, or has no basis in, the files shown: an invented file,
an invented function call or behaviour, a wrong test ID, or a statement that something is
missing when it is present (or present when it is missing).

UNKNOWN when the report has no findings, or a claim depends on something not shown (for example
live site behaviour).

Judge only truthfulness. Ignore severity, how useful the fix is, and the report's format.
