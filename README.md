# claude-projects

A sandbox monorepo for experimenting with **Claude Code on the web** (cloud sessions).
Each experiment lives in its own folder under `projects/`, so you can point a cloud
session at one idea at a time without the experiments stepping on each other.

## Layout

```
.
├── CLAUDE.md               # Instructions Claude reads at the start of every session
├── .claude/settings.json   # SessionStart hook + pre-approved commands
├── scripts/
│   ├── new-project.sh      # Scaffold a new experiment from a template
│   ├── test-all.sh         # Run every project's tests
│   └── session-start.sh    # Installs deps when a cloud session starts
├── templates/
│   ├── python/             # pytest, no third-party runtime deps
│   └── node/               # node:test, zero dependencies
└── projects/
    ├── hello-python/       # Example Python project
    └── hello-node/         # Example Node project
```

## Starting a new experiment

```bash
scripts/new-project.sh python my-idea "What I'm trying out"
scripts/new-project.sh node   my-idea "What I'm trying out"
```

Or just ask Claude in a cloud session:

> Create a new node project called `markdown-toc` that generates a table of contents
> for a Markdown file, with tests.

## How cloud sessions use this repo

- **Fresh container each time.** The repo is cloned fresh, and anything not
  committed and pushed is lost when the session ends.
- **SessionStart hook.** `.claude/settings.json` runs `scripts/session-start.sh`,
  which installs each project's `requirements.txt` / npm dependencies, so tests work
  right away. It only runs when `CLAUDE_CODE_REMOTE=true`, so local sessions are
  unaffected.
- **Branches.** Each cloud session works on its own `claude/...` branch. Review
  the result and merge the ones you like into `main`.
- **Network.** Package installs go through the environment's network policy. If
  an install fails, check the environment's network settings.

Docs: https://code.claude.com/docs/en/claude-code-on-the-web

## Experiment ideas

Short prompts that are a good test of what a cloud session can do alone:

- **CLI tool**: "Build a Python CLI that summarizes a CSV (row count, column types, null counts) with tests."
- **Web scraper → report**: "Fetch a public RSS feed and write a Markdown digest of the last 10 items."
- **Small web app**: "Make a Node HTTP server with a to-do list API (in-memory), plus tests."
- **Refactor practice**: "Take `hello-python` and add argument parsing, logging, and 100% test coverage."
- **Claude API app**: "Build a script that uses the Anthropic SDK to classify text into categories." (needs an `ANTHROPIC_API_KEY` set as an environment secret)
- **Long-running task**: "Implement a Markdown-to-HTML converter from scratch with a thorough test suite."
- **PR workflow**: ask Claude to open a PR, then leave review comments and have it address them.

## Checks

```bash
scripts/test-all.sh
```
