#!/usr/bin/env bash
set -euo pipefail

# Analyze PR context: changed modules, services, and migrations
# Used for generating PR descriptions with specific test plans
# Usage: analyze-pr-context.sh [base-branch]
# Default base: staging

target_base="${1:-staging}"
base=$(git merge-base HEAD "$target_base" 2>/dev/null || echo "$target_base")

echo "Changed modules:"
git diff --name-only "$base" | grep -E "^back/modules/" | cut -d"/" -f3 | sort -u | head -10 || echo "  (none)"

echo ""
echo "Changed services:"
git diff --name-only "$base" | grep "_service\.go$" | head -10 || echo "  (none)"

echo ""
echo "Migrations:"
git diff --name-only "$base" | grep "migrations/.*\.sql$" || echo "  (none)"
