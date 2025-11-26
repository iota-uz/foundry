#!/usr/bin/env bash
set -euo pipefail

# Categorize changed files by type for better commit grouping
# Outputs: categorized lists of changed files

echo "Changed Files by Category"
echo "========================="
echo ""

# Get all changed files (staged + unstaged)
changed_files=$(git diff --name-only HEAD 2>/dev/null || echo "")

if [ -z "$changed_files" ]; then
  echo "No changes detected"
  exit 0
fi

# Backend Code (non-test Go files)
backend=$(echo "$changed_files" | grep '\.go$' | grep -v '_test\.go$' | grep -v '_templ\.go$' || echo "")
if [ -n "$backend" ]; then
  count=$(echo "$backend" | wc -l | tr -d ' ')
  echo "Backend Code ($count files):"
  echo "$backend" | head -10 | sed 's/^/  /'
  [ "$count" -gt 10 ] && echo "  ... and $((count - 10)) more"
  echo ""
fi

# Tests
tests=$(echo "$changed_files" | grep '_test\.go$' || echo "")
if [ -n "$tests" ]; then
  count=$(echo "$tests" | wc -l | tr -d ' ')
  echo "Tests ($count files):"
  echo "$tests" | head -10 | sed 's/^/  /'
  [ "$count" -gt 10 ] && echo "  ... and $((count - 10)) more"
  echo ""
fi

# Templates (templ files)
templates=$(echo "$changed_files" | grep '\.templ$' || echo "")
if [ -n "$templates" ]; then
  count=$(echo "$templates" | wc -l | tr -d ' ')
  echo "Templates ($count files):"
  echo "$templates" | head -10 | sed 's/^/  /'
  [ "$count" -gt 10 ] && echo "  ... and $((count - 10)) more"
  echo ""
fi

# Generated (templ generated files)
generated=$(echo "$changed_files" | grep '_templ\.go$' || echo "")
if [ -n "$generated" ]; then
  count=$(echo "$generated" | wc -l | tr -d ' ')
  echo "Generated ($count files - must commit):"
  echo "$generated" | head -10 | sed 's/^/  /'
  [ "$count" -gt 10 ] && echo "  ... and $((count - 10)) more"
  echo ""
fi

# Migrations
migrations=$(echo "$changed_files" | grep 'migrations/.*\.sql$' || echo "")
if [ -n "$migrations" ]; then
  count=$(echo "$migrations" | wc -l | tr -d ' ')
  echo "Migrations ($count files):"
  echo "$migrations" | sed 's/^/  /'
  echo ""
fi

# Translations (TOML files)
translations=$(echo "$changed_files" | grep '\.toml$' || echo "")
if [ -n "$translations" ]; then
  count=$(echo "$translations" | wc -l | tr -d ' ')
  echo "Translations ($count files):"
  echo "$translations" | head -10 | sed 's/^/  /'
  [ "$count" -gt 10 ] && echo "  ... and $((count - 10)) more"
  echo ""
fi

# Config/CI files
config=$(echo "$changed_files" | grep -E '\.(yml|yaml|json|Dockerfile|dockerignore)$|Makefile|go\.mod|go\.sum' || echo "")
if [ -n "$config" ]; then
  count=$(echo "$config" | wc -l | tr -d ' ')
  echo "Config/CI ($count files):"
  echo "$config" | head -10 | sed 's/^/  /'
  [ "$count" -gt 10 ] && echo "  ... and $((count - 10)) more"
  echo ""
fi

# Documentation
docs=$(echo "$changed_files" | grep '\.md$' | grep -v '^\.claude/' || echo "")
if [ -n "$docs" ]; then
  count=$(echo "$docs" | wc -l | tr -d ' ')
  echo "Documentation ($count files):"
  echo "$docs" | head -10 | sed 's/^/  /'
  [ "$count" -gt 10 ] && echo "  ... and $((count - 10)) more"
  echo ""
fi

# Claude Code configs
cc_files=$(echo "$changed_files" | grep '^\.claude/' || echo "")
if [ -n "$cc_files" ]; then
  count=$(echo "$cc_files" | wc -l | tr -d ' ')
  echo "Claude Code Config ($count files - use cc: prefix):"
  echo "$cc_files" | head -10 | sed 's/^/  /'
  [ "$count" -gt 10 ] && echo "  ... and $((count - 10)) more"
  echo ""
fi

# Files that should NOT be committed
should_not_commit=$(echo "$changed_files" | grep -E '\.(env|out|test|log|swp|swo|swn|dump|csv)$|^(FOLLOW_UP_ISSUES|PR-.*-REVIEW)\.md$' || echo "")
if [ -n "$should_not_commit" ]; then
  count=$(echo "$should_not_commit" | wc -l | tr -d ' ')
  echo "WARNING: Should NOT Commit ($count files):"
  echo "$should_not_commit" | sed 's/^/  /'
  echo ""
fi

# Other files
other=$(echo "$changed_files" | grep -vE '\.go$|\.templ$|\.toml$|\.sql$|\.md$|\.yml$|\.yaml$|\.json$|Dockerfile|Makefile|go\.mod|go\.sum' || echo "")
if [ -n "$other" ]; then
  count=$(echo "$other" | wc -l | tr -d ' ')
  echo "Other ($count files):"
  echo "$other" | head -10 | sed 's/^/  /'
  [ "$count" -gt 10 ] && echo "  ... and $((count - 10)) more" || true
fi

