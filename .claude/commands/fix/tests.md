---
description: Systematically identify and fix broken tests using iterative approach
model: sonnet
---

# Fix Tests

Systematically identify and fix broken tests using structured iteration.

## Current State

Static analysis status:
!`pnpm typecheck 2>&1 | head -30`

Test status:
!`pnpm test 2>&1 | head -100`

Recent changes:
!`git log --oneline -5 -- src/`

## Workflow

### 1. Discovery

Analyze the output above:

- Identify compilation/static analysis errors
- Count failing tests
- Categorize: compilation → assertion → timeout → error
- Prioritize compilation errors first

### 2. Analysis

Per failure:

- Parse error messages and stack traces
- Read test code and implementation
- Identify root cause:
    - Implementation bug: Fix actual code
    - Outdated test: Update expectations
    - Setup issue: Fix initialization
    - Mock issue: Fix mocks or stubs

### 3. Fix

One test at a time:

1. Minimal fix to compile
2. Verify: `pnpm typecheck`
3. Test: `pnpm test -- path/to/file.test.ts`
4. Iterate incrementally
5. Use `editor` agent for complex fixes

### 4. Validation

- Verify no new issues: `pnpm typecheck`
- Ensure no regressions: `pnpm test`

## Best Practices

- Fix compilation first
- One test at a time
- NEVER delete tests unless asked
- Fix root cause, not symptoms
- Use `editor` agent for complex fixes
