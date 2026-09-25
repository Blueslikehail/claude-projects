#!/usr/bin/env bash
# SessionStart hook: install each project's dependencies so tests run
# immediately in a fresh Claude Code on the web container.
# Only runs in remote (cloud) sessions; local sessions are left alone.
set -euo pipefail

if [[ "${CLAUDE_CODE_REMOTE:-}" != "true" ]]; then
  exit 0
fi

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"

for dir in "$root"/projects/*/; do
  [[ -d "$dir" ]] || continue
  if [[ -f "$dir/requirements.txt" ]]; then
    python3 -m pip install --quiet --root-user-action=ignore -r "$dir/requirements.txt"
  fi
  if [[ -f "$dir/package.json" ]] && grep -q '"\(dev\)\?[dD]ependencies"' "$dir/package.json"; then
    (cd "$dir" && npm install --silent --no-audit --no-fund)
  fi
done
