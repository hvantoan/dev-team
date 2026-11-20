#!/usr/bin/env bash
# Init một project mới: registry JSON + cây reports/docs/tests.
# Dùng: ./scripts/init-project.sh <proj> [registry.json] [--force]
set -euo pipefail

force=0
args=()
for a in "$@"; do
  if [[ "$a" == "--force" ]]; then force=1; else args+=("$a"); fi
done

proj="${args[0]:-}"
src="${args[1]:-}"
if [[ ! "$proj" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "usage: $0 <proj> [registry.json] [--force]  (proj: kebab-case, vd abc)" >&2
  exit 2
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dest="$root/projects/$proj.json"
if [[ -e "$dest" && "$force" -ne 1 ]]; then
  echo "exists: projects/$proj.json (use --force)" >&2
  exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
if [[ -n "$src" ]]; then
  jq -e --arg p "$proj" '
    .project == $p and
    (.repos | type == "array") and
    (.stack | type == "object") and
    all(.repos[]; has("role") and has("path"))
  ' "$src" >/dev/null
  jq . "$src" >"$tmp"
  mv "$tmp" "$dest"
else
  jq -n --arg p "$proj" '{
    project: $p,
    jira: { prefix: null, base_url: null, project_key: null },
    department: null,
    repos: [],
    stack: { run: [], test: [], env: [] }
  }' >"$tmp"
  mv "$tmp" "$dest"
fi

for d in reports/"$proj"/{orchestrator,ba,dev,qa} docs/"$proj"/{srs,adr,research} tests/"$proj"; do
  mkdir -p "$root/$d"
  touch "$root/$d/.gitkeep"
done

echo "created projects/$proj.json"
echo "created reports/$proj/{orchestrator,ba,dev,qa}, docs/$proj/{srs,adr,research}, tests/$proj"
echo "next: điền jira/repos/stack trong projects/$proj.json"
