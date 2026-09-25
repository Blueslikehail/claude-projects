#!/usr/bin/env bash
# Run every project's test suite. Exits non-zero if any project fails.
set -uo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
failed=()

for dir in "$root"/projects/*/; do
  [[ -d "$dir" ]] || continue
  name="$(basename "$dir")"
  if [[ -f "$dir/package.json" ]]; then
    echo "==> $name (node)"
    (cd "$dir" && npm test --silent) || failed+=("$name")
  elif [[ -f "$dir/pyproject.toml" ]]; then
    echo "==> $name (python)"
    (cd "$dir" && python3 -m pytest -q) || failed+=("$name")
  else
    echo "==> $name (skipped: no recognised project file)"
  fi
done

if (( ${#failed[@]} )); then
  echo "FAILED: ${failed[*]}" >&2
  exit 1
fi
echo "All projects passed."
