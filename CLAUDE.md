# CLAUDE.md

This repo is a collection of small, independent experiments for trying out Claude Code
on the web. Treat each folder in `projects/` as its own self-contained project.

## Rules

- Keep work for an experiment inside its own `projects/<name>/` folder. Don't change
  other projects unless asked.
- New experiments: scaffold with `scripts/new-project.sh <python|node> <name> "<description>"`
  (kebab-case names), then build on the generated files.
- Every project has tests. Add or update tests with each change, and run
  `scripts/test-all.sh` (or the project's own test command) before committing.
- Prefer the standard library. If you add a dependency, put it in the project's
  `requirements.txt` (Python) or `package.json` (Node) so the SessionStart hook
  installs it in fresh containers.
- Update the project's `README.md` with how to run it and a short **Notes** entry
  on what was tried and how it went.
- Never commit secrets. Read API keys from environment variables.

## Commands

| Task | Python project | Node project |
| --- | --- | --- |
| Run | `python3 src/main.py` | `npm start` |
| Test | `python3 -m pytest` | `npm test` |
| All projects | `scripts/test-all.sh` | `scripts/test-all.sh` |

## Adding a template

Add a folder under `templates/`. Use `__NAME__` and `__DESCRIPTION__` as placeholders;
`new-project.sh` replaces them. Teach `scripts/test-all.sh` and
`scripts/session-start.sh` how to test and install it.
