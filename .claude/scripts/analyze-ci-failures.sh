#!/usr/bin/env bash
set -euo pipefail

# Analyze CI failures for the current branch
# Usage: bash .claude/scripts/analyze-ci-failures.sh

# Get current branch
branch=$(git branch --show-current)
echo "Branch: $branch"
echo ""

# List recent failed runs
echo "=== Recent Failed Runs ==="
gh run list --branch "$branch" --status failure -L 5 \
  --json databaseId,displayTitle,workflowName,createdAt,url

# Get latest failed run ID
run_id=$(gh run list --branch "$branch" --status failure -L 1 \
  --json databaseId --jq '.[0].databaseId')

# Check if we have a failed run
if [ -z "$run_id" ] || [ "$run_id" = "null" ]; then
  echo ""
  echo "✓ No failed runs found for branch: $branch"
  exit 0
fi

echo ""
echo "=== Latest Failed Run ID: $run_id ==="
echo ""

# Get failed jobs
echo "=== Failed Jobs ==="
gh run view "$run_id" --json jobs \
  --jq '.jobs[] | select(.conclusion == "failure") | .name'
echo ""

# Extract error logs (filtered to prevent token overflow)
echo "=== Error Logs (filtered for errors/failures only) ==="
gh run view "$run_id" --log-failed 2>&1 | \
  grep -iE "(error|fail|panic|assertion|expected|fatal|--- fail)" | \
  tail -60
