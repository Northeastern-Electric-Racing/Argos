#!/usr/bin/env bash
# Thin capture helper for the journal skill.
# Drops a formless note into the gitignored .journal/ at the repo root.
# Never touches git, GitHub, or any downstream skill.
#
# Usage:
#   capture.sh "note text"                 # loose entry at journal root
#   capture.sh -c <category> "note text"   # entry inside a category subfolder
#   capture.sh -c <category>               # create an empty entry to hand-edit
set -euo pipefail

category=""
while getopts "c:" opt; do
  case "$opt" in
    c) category="$OPTARG" ;;
    *) echo "usage: capture.sh [-c category] [note text]" >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))
text="${*:-}"

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
dir="$root/.journal"
[ -n "$category" ] && dir="$dir/$category"
mkdir -p "$dir"

file="$dir/$(date +%Y-%m-%d-%H%M%S).md"
{
  echo "<!-- captured $(date -u +%Y-%m-%dT%H:%M:%SZ) -->"
  [ -n "$text" ] && echo "$text"
} > "$file"

echo "$file"
