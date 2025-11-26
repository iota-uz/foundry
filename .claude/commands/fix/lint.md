---
description: "Fix all linting and type errors in the codebase using ESLint and TypeScript."
model: haiku
disable-model-invocation: true
---

You are tasked with fixing all linting and type errors in the codebase:

All type errors: !`pnpm typecheck 2>&1 | head -50 || true`
All linting errors: !`pnpm lint 2>&1 | head -50 || true`

## Workflow

1. Implementation:
    - Launch agents with specific scope assignments
    - Each agent fixes assigned linting/type errors

2. Verification:
    - Run `pnpm typecheck` to verify no remaining type errors
    - Run `pnpm lint` to verify linting passes
    - Check for any new issues introduced

## Important Notes

- Follow CLAUDE.md § 2 (Agent Orchestration) Sequential Execution: agents && `refactoring-expert`
- DO NOT fix test files separately - include in the main fix workflow
- Preserve existing functionality while fixing errors
- Address unused variables/functions flagged by linter
- Follow project patterns and conventions
