#!/usr/bin/env bash
# Scaffold a new experiment from a template.
# Usage: scripts/new-project.sh <python|node> <name> ["one-line description"]
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
template="${1:-}"
name="${2:-}"
description="${3:-An experiment with Claude Code on the web.}"

if [[ -z "$template" || -z "$name" ]]; then
  echo "usage: $0 <$(ls "$root/templates" | tr '\n' '|' | sed 's/|$//')> <name> [description]" >&2
  exit 1
fi
if [[ ! -d "$root/templates/$template" ]]; then
  echo "unknown template: $template (available: $(ls "$root/templates" | xargs))" >&2
  exit 1
fi
if [[ ! "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "name must be lowercase kebab-case, e.g. my-experiment" >&2
  exit 1
fi

dest="$root/projects/$name"
if [[ -e "$dest" ]]; then
  echo "projects/$name already exists" >&2
  exit 1
fi

cp -R "$root/templates/$template" "$dest"
# Escape characters that are special in a sed replacement.
esc_desc="$(printf '%s' "$description" | sed -e 's/[\/&|]/\\&/g')"
grep -rl '__NAME__\|__DESCRIPTION__' "$dest" | while read -r f; do
  sed -i.bak -e "s|__NAME__|$name|g" -e "s|__DESCRIPTION__|$esc_desc|g" "$f" && rm -f "$f.bak"
done

echo "Created projects/$name from the $template template."
