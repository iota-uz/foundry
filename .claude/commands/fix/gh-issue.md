---
description: Fix a GitHub issue following a structured workflow
argument-hint: Issue URL or issue number (e.g., https://github.com/owner/repo/issues/123 or 123)
disable-model-invocation: true
---

# Fix GitHub Issue

You have been given an issue URL or issue number: $ARGUMENTS

## Parse Issue Reference

First, let me determine the issue number:
- If given a full URL (e.g., https://github.com/owner/repo/issues/123), I'll extract the issue number
- If given just a number, I'll use it directly with the current repository

I'll run `gh issue view $ARGUMENTS` to see the issue details.
I'll check the current branch with `git branch --show-current`.
I'll check the git status with `git status --short`.

## Workflow

### 1. Analyze Issue Requirements
- Review the issue description and requirements above
- Create a detailed task list using TodoWrite tool
- Identify which files and modules need changes

### 2. Setup Feature Branch
- Ensure latest changes: `git checkout main && git pull`
- Create feature branch: `git checkout -b fix/issue-$ARGUMENTS-<brief-description>`

### 3. Implementation Strategy
- Determine if TDD is appropriate for this issue:
  - Bug fixes: Write failing test that reproduces the bug first
  - New features: Write tests for expected behavior before implementation
  - Refactoring: Ensure existing tests pass, add new tests if needed
  - UI-only changes: TDD may not apply, focus on manual testing

### 4. Test-Driven Development (when applicable)
- Write failing tests first:
  - For bugs: Create test that reproduces the issue
  - For features: Write tests for new functionality
  - Use descriptive test names
  - Follow pattern: `describe('FunctionName', () => { it('should...') })`
- Run tests to confirm they fail: `pnpm test -- path/to/file.test.ts`
- Implement minimal code to make tests pass
- Refactor while keeping tests green

### 5. Implementation
- Follow the task list systematically
- Use `Grep` or `Glob` for code search when needed
- Apply changes following project guidelines
- Continuously run tests during implementation

### 6. Testing & Validation
- Run type checking: `pnpm typecheck`
- Run linting: `pnpm lint`
- Run all relevant tests: `pnpm test`
- Run specific test: `pnpm test -- path/to/file.test.ts`
- Ensure 100% of tests pass
- Add integration tests if needed

### 7. Commit and Create PR

After all changes are implemented and tested:
- Use `/git:commit` command to commit changes and create PR
- Command will prompt for branch strategy (push to current vs create new branch + PR)
- Reference the issue number in PR description (e.g., "Resolves #123")
- Ensure all pre-commit checks pass

## Important Notes
- Always test changes thoroughly before implementing
- Follow project conventions
- Keep changes focused on the specific issue
- Update documentation if needed
- Use `/git:commit` command for committing and PR creation
