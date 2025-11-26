#!/usr/bin/env bash
set -euo pipefail

# Analyze changed files to determine CHANGELOG.md update requirement
# Outputs: file counts by layer, layers affected, and MUST/SHOULD/SKIP recommendation

# Count files by layer
presentation=$(git diff --name-only HEAD 2>/dev/null | { grep -cE '(_controller\.go|_viewmodel\.go|\.templ|\.toml)$' || true; })
business=$(git diff --name-only HEAD 2>/dev/null | { grep -cE '_service\.go$' || true; })
infrastructure=$(git diff --name-only HEAD 2>/dev/null | { grep -cE '(_repository\.go|migrations/)' || true; })

# Count layers with changes
layers_with_changes=0
[ "$presentation" -gt 0 ] && ((layers_with_changes++)) || true
[ "$business" -gt 0 ] && ((layers_with_changes++)) || true
[ "$infrastructure" -gt 0 ] && ((layers_with_changes++)) || true

# Check for specific file types
migrations=$(git diff --name-only HEAD 2>/dev/null | { grep -c 'migrations/.*\.sql$' || true; })
tests_only=$(git diff --name-only HEAD 2>/dev/null | { grep -v '_test\.go$' || true; } | wc -l)
docs_only=$(git diff --name-only HEAD 2>/dev/null | { grep -v '\.md$' || true; } | wc -l)

# Calculate totals
total=$((presentation + business + infrastructure))
all_files=$(git diff --name-only HEAD 2>/dev/null | wc -l | tr -d ' ')

# Output concise analysis
echo "Changed: $presentation presentation, $business business, $infrastructure infrastructure ($total files, $layers_with_changes layers, $migrations migrations)"
echo ""

# Determine requirement
if [ "$migrations" -gt 0 ]; then
  echo "RECOMMENDATION: MUST update CHANGELOG"
  echo "Reason: Database migration detected"
  exit 0
fi

if [ "$tests_only" -eq 0 ]; then
  echo "RECOMMENDATION: SKIP CHANGELOG"
  echo "Reason: Only test files changed"
  exit 0
fi

if [ "$docs_only" -eq 0 ]; then
  echo "RECOMMENDATION: SKIP CHANGELOG"
  echo "Reason: Only documentation changed"
  exit 0
fi

if [ "$layers_with_changes" -ge 2 ] && [ "$total" -ge 3 ]; then
  echo "RECOMMENDATION: MUST update CHANGELOG"
  echo "Reason: Multi-layer feature ($layers_with_changes layers, $total files)"
  exit 0
fi

if [ "$total" -ge 5 ]; then
  echo "RECOMMENDATION: SHOULD update CHANGELOG"
  echo "Reason: Significant scope ($total files in single layer)"
  exit 0
fi

if [ "$business" -gt 0 ]; then
  if git diff --name-only HEAD 2>/dev/null | grep -q '_service\.go$'; then
    echo "RECOMMENDATION: SHOULD update CHANGELOG"
    echo "Reason: Business logic service changes"
    exit 0
  fi
fi

echo "RECOMMENDATION: SKIP CHANGELOG"
echo "Reason: Minor changes ($total files, $layers_with_changes layer)"
