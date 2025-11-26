---
description: "Identify and remove dead/unused code using ts-prune and ESLint. Handles file deletion when empty, test cleanup, and unused exports."
allowed-tools: |
  Bash(npx ts-prune:*), Bash(pnpm lint:*), Bash(pnpm typecheck:*), Bash(pnpm test:*),
  Bash(git rm:*), Bash(git status:*), Bash(git diff:*),
  Read, Edit, Write, Glob, Grep,
  Task
---

Systematically remove unreachable/unused code detected by ts-prune and ESLint, including dead functions, unused exports,
empty files, obsolete tests, and unused utilities.

Dead code analysis: !`npx ts-prune 2>&1 | head -50`

Unused variables/imports: !`pnpm lint 2>&1 | grep -E "no-unused|@typescript-eslint/no-unused" | head -20`

Current git status: !`git status --short`

## Workflow

**Analyze and categorize**

- Parse ts-prune output by file path and export name
- Parse ESLint output for unused variables, imports, and functions
- Classify: Safe to remove (private functions, internal utilities), Review needed (exported functions - may be public API)
- If exported functions found, use AskUserQuestion to confirm removal strategy

**Remove dead code**

- Small scope (1-10 items): Use direct Edit tool
- Medium/large scope (10+ items): Use Task(subagent_type:editor), split into batches if 50+
- Preserve the surrounding code structure and unrelated comments
- Verify immediately: `pnpm typecheck` (fix type errors before proceeding)

**Clean up empty files**

- Check modified files for only imports or empty exports
- Search for imports: `Grep: pattern="from.*path/to/file"`
- Remove imports from dependent files, then `git rm path/to/file.ts`
- Re-verify: `pnpm typecheck`

**Clean up tests**

- Find affected tests: `Grep: pattern="describe.*FunctionName|FunctionName" glob="*.test.ts"`
- Remove test functions, describe blocks, mocks for deleted code
- Keep test utilities if used elsewhere
- Use Task(subagent_type:editor) for test cleanup
- Verify: `pnpm test -- path/to/file.test.ts`

**Final verification**

- `pnpm typecheck` (static checks)
- `pnpm lint` (code quality)
- `pnpm test` (optional but recommended)
- `git diff --stat` and `git status --short` (review changes)

## Important Rules

- Always verify with `pnpm typecheck` after each step before proceeding
- Be conservative with exports: Ask before removing exported functions (may be public API)
- Preserve test utilities unless truly unused
- Use `git rm` instead of `rm` for file deletion
- Use editor agent for bulk removals (10+ items)

## Edge Cases

- Re-exports: Files that only re-export from other modules; check if barrel files need updating
- Dynamic imports: ts-prune doesn't understand dynamic `import()` calls; review carefully
- Generated code: Skip files matching `*.generated.ts`, `*.d.ts`
- Public API: Exported functions may be used by external packages even if unused internally
- Test-only exports: Consider if exports are only used in tests; document if keeping
