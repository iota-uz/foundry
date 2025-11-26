---
description: Identify and fix failing CI workflows for current branch
model: sonnet
---

# Fix CI Failures

Systematically identify and fix failing CI workflows for the current branch.

## CI Status Overview

!`gh run list --branch $(git branch --show-current) --limit 5 2>&1`

## Workflow

### 1. Analyze Error Logs

Identify root cause from error logs above:
- **Compilation**: Type errors, undefined variables, imports
- **Test failures**: Assertions, logic errors, timeouts
- **Build failures**: Next.js build errors, missing dependencies
- **Config**: Environment variables, permissions

### 2. Investigate & Fix

- Complex failures: Use `debugger` agent for analysis
- Implementation: Use `editor` agent for fixes
- Priority: Compilation errors first, then test failures

### 3. Validate

Local testing (if applicable):
```bash
pnpm typecheck
pnpm lint
pnpm test -- path/to/file.test.ts
pnpm build
```

Re-run workflow (ask user first):
```bash
gh run rerun <run-id>
gh run watch <run-id>
```

## Common Failure Patterns

**TypeScript/Build:**
- Type errors, missing types, incorrect imports
- Next.js build failures, missing environment variables
- ESLint errors, formatting issues

**Tests:**
- Mock issues, async timing problems
- Missing test fixtures, environment setup
- Snapshot mismatches

## Additional Commands

```bash
# More context if needed
gh run view <run-id> --json jobs --jq '.jobs'  # All job statuses
gh run view <run-id> --log-failed              # Full failed logs
gh run view <run-id> --web                     # Open in browser
```
