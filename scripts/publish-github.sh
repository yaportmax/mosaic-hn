#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${1:-mosaic-hn}"
VISIBILITY="${2:-public}"
OWNER="${GITHUB_OWNER:-yaportmax}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required: https://cli.github.com/" >&2
  exit 1
fi

gh auth status

git branch -M main

gh repo create "$OWNER/$REPO_NAME" \
  --"$VISIBILITY" \
  --description "A local-first, deeply customizable, modular, open-source Hacker News reader for iOS and Android." \
  --source . \
  --remote origin-new \
  --push

git push origin-new --tags

echo "Published to https://github.com/$OWNER/$REPO_NAME"
