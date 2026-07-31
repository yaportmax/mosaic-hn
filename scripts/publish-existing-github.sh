#!/usr/bin/env bash
set -euo pipefail

REMOTE_URL="${1:-https://github.com/yaportmax/mosaic-hn.git}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

git remote remove github 2>/dev/null || true
git remote add github "$REMOTE_URL"
git branch -M main
git push --force-with-lease -u github main
git push github --tags

echo "Published to ${REMOTE_URL%.git}"
