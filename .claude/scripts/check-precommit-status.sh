#!/usr/bin/env bash
set -euo pipefail

# Check pre-commit preparation status
# Outputs: Only warnings/errors (silent on success)

issues_found=0

# Check if .templ files exist and might be out of sync
templ_files=$(find back -name "*.templ" 2>/dev/null | wc -l || echo 0)
if [ "$templ_files" -gt 0 ]; then
  out_of_sync=0
  for templ_file in $(find back -name "*.templ" 2>/dev/null); do
    generated="${templ_file%.templ}_templ.go"
    if [ ! -f "$generated" ] || [ "$templ_file" -nt "$generated" ]; then
      out_of_sync=$((out_of_sync + 1))
    fi
  done

  if [ "$out_of_sync" -gt 0 ]; then
    echo "WARNING: Templ files out of sync: $out_of_sync file(s) need regeneration"
    issues_found=$((issues_found + 1))
  fi
fi

# Check for unformatted Go files (quick sample check)
if [ -d "back" ]; then
  unformatted=$(cd back && gofmt -l . 2>/dev/null | head -5 || echo "")
  if [ -n "$unformatted" ]; then
    echo "WARNING: Go files need formatting (showing first 5):"
    echo "$unformatted" | sed 's/^/    /'
    issues_found=$((issues_found + 1))
  fi
fi

# Check for common build artifacts (exclude Dockerfile.test which is a legitimate file)
artifacts=$(find back -type f \( -name "*.test" -o -name "coverage.out" -o -name "coverage.html" -o -name "*.out" \) ! -name "Dockerfile.test" 2>/dev/null | head -10 || echo "")
if [ -n "$artifacts" ]; then
  echo "WARNING: Build artifacts found (showing first 10):"
  echo "$artifacts" | sed 's/^/    /'
  issues_found=$((issues_found + 1))
fi

# Check for temporary/IDE files
temp_files=$(find . -type f \( -name "*.swp" -o -name "*.swo" -o -name "*.swn" -o -name "*.go.old" \) 2>/dev/null | head -10 || echo "")
if [ -n "$temp_files" ]; then
  echo "WARNING: Temporary files found (showing first 10):"
  echo "$temp_files" | sed 's/^/    /'
  issues_found=$((issues_found + 1))
fi

# Check for staged/changed secret files
secrets=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(env|credentials\.json|\.pem|\.key)$' || echo "")
if [ -n "$secrets" ]; then
  echo ""
  echo "DANGER: Potential secrets in changes:"
  echo "$secrets" | sed 's/^/    /'
  echo ""
  issues_found=$((issues_found + 1))
fi

# Check for root markdown files that shouldn't be committed
root_docs=$(git diff --name-only HEAD 2>/dev/null | grep -E '^(FOLLOW_UP_ISSUES|PR-.*-REVIEW)\.md$' || echo "")
if [ -n "$root_docs" ]; then
  echo "WARNING: Root markdown files that should not be committed:"
  echo "$root_docs" | sed 's/^/    /'
  issues_found=$((issues_found + 1))
fi

# Summary
if [ "$issues_found" -eq 0 ]; then
  echo "All pre-commit checks passed"
fi
