# Claude Code Workshop

## Introduction

This project is the starter repo for the Claude Code Workshop. It uses Playwright with TypeScript and Node.js. The tests run against the demo shop https://practicesoftwaretesting.com.

## New to Git?

Install Git: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git

```bash
git clone https://github.com/Raneesh02/pw_starter.git
```

## Node.js Installation

Install the LTS version of Node.js (version 18 or later): https://nodejs.org/en/download

Check that it installed:

```bash
node -v
npm -v
```

## Install VS Code

Download VS Code: https://code.visualstudio.com/download

Open the project with **File → Open Folder...** and select the `pw_starter` folder.

## Claude Code

### Purchase a Pro License

Claude Code needs a paid Claude plan. Buy a **Pro** subscription here: https://claude.com/pricing

### Configure the Extension in VS Code

1. In VS Code, open the Extensions view (`Ctrl+Shift+X` on Windows/Linux, `Cmd+Shift+X` on macOS).
2. Search for **Claude Code** (published by Anthropic) and install it.
3. Open the Claude Code panel by clicking the Claude icon in the editor toolbar or the sidebar.
4. Sign in with the Claude account that has your Pro license.

Setup guide: https://docs.claude.com/en/docs/claude-code/vs-code

## Install Dependencies

Open a terminal in VS Code with **Terminal → New Terminal**. It opens in the project folder. Run:

```bash
npm install
npx playwright install chromium
```

Then check that the project compiles:

```bash
npx tsc --noEmit
```

If this command finishes without errors, the setup is complete.

## Execution

```bash
npx playwright test
```

This runs every test in the `tests/` folder.

Other useful commands:

```bash
npx playwright test tests/cart/cart.spec.ts   # run one file
npx playwright test --grep "CH01"             # run one test by its ID
npx playwright test --grep "@regression"      # run tests by tag
npm run test:headed                           # run with the browser visible
npm run test:ui                               # open Playwright UI mode
npm run test:report                           # open the last HTML report
```

> Note: `npm test` runs only the `C01` test in headed mode. It does not run the whole suite.

## Pre-reads

Please go through these before the workshop:

- Claude Code 101: https://anthropic.skilljar.com/claude-code-101
- Understanding GitHub Actions: https://docs.github.com/en/actions/get-started/understand-github-actions
