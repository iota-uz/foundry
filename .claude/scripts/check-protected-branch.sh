#!/usr/bin/env bash
set -euo pipefail

# Check if current branch is a protected branch (main or staging)

branch=$(git branch --show-current)

if [ "$branch" = "main" ] || [ "$branch" = "staging" ]; then
  echo "WARNING: On protected branch: $branch"
else
  echo "OK: On feature branch: $branch"
fi
