---
description: "Commit changes with option to push to current branch or create new branch with PR"
model: haiku
---

## Workflow Sequence

1. Ask user about branching strategy
2. Pre-Commit Preparation
3. Create commits
4. Post-Commit Actions

## Current codebase status:

!`git status --porcelain`

- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Branch Strategy

Always ask the user about branch strategy using the AskUserQuestion tool:

```
AskUserQuestion:
- Question: "How would you like to proceed?"
- Header: "Branch Strategy"
- Options:
  - "Push to current branch - Commit and push to current branch"
  - "Create new branch + PR - Create new feature branch first, then commit and push"
- multiSelect: false
```

**If "Push to current branch":**

- Proceed to Pre-Commit Preparation, then push to the current branch

**If "Create new branch + PR":**

- Create and checkout new branch based on changes (e.g., `fix/...`, `feat/...`, `refactor/...`)
- Ask user for base branch using AskUserQuestion:
  ```
  AskUserQuestion:
  - Question: "Which base branch should the PR target?"
  - Header: "PR Base Branch"
  - Options:
    - "main - Default branch"
  - multiSelect: false
  ```
- Store the selected base branch for use in PR creation
- Proceed to Pre-Commit Preparation, then push with `-u` and create PR

## Pre-Commit Preparation (CRITICAL)

Run verification commands:

1. Run type checking: `bun typecheck` (stop if fails)
2. Run linting: `bun lint` (stop if fails)
3. Check for temporary files: Remove `*.temp`, `*.backup` files (ask user if unsure)
4. If secrets detected (.env files with values): STOP and warn user immediately

Stop and report errors if any step fails. Do not proceed to commits.

## Commit Messages

Use conventional commit format matching repository patterns. Common prefixes:

- `fix:`, `feat:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`
- `ci:` - CI/CD configs (Dockerfile, workflows, compose files)
- `style:` - Code formatting only
- `cc:` - Claude Code configs (CLAUDE.md, .claude/**/)

## Changed Files Analysis

!`git status --short`

**Important commit rules:**

- Always commit `.claude/**/` with `cc:` prefix
- Never commit secrets (.env, credentials.json, API keys)

## Creating Commits

Use the categorized files above to group related changes into logical commits with appropriate conventional prefixes.

## Post-Commit Actions

### If "Push to Current Branch"

1. **Safety Check for Protected Branches**: If pushing to `main`, ask for explicit confirmation:
   ```
   AskUserQuestion:
   - Question: "You are about to push to main. Are you sure?"
   - Header: "Protected Branch"
   - Options:
     - "Yes, push to main"
     - "No, cancel push"
   - multiSelect: false
   ```
    - If user selects "No, cancel push": Stop and inform user the push was cancelled
    - If user selects "Yes": Continue to step 2

2. Pull the latest changes from remote (CRITICAL)
3. Push commits to the current branch
4. Report the successful push with commit count

**Error Handling:**

- Pull conflicts → stop and inform user (commits are safe, needs manual conflict resolution)
- Push fails → suggest resolving conflicts or checking network

### If "Create New Branch + PR"

1. New branch already created before the pre-commit phase
2. Push new branch with `-u` flag: `git push -u origin <new-branch>`
3. Check if PR already exists for this branch: `gh pr list --head <new-branch> --json number,url`
4. If NO PR exists:
    - Get commit history: `git log main..HEAD`
    - Analyze commits to create PR description (see template below)
    - Create PR with selected base: `gh pr create --base main --title "..." --body "$(cat <<'EOF'...)"`
    - Return PR URL from the command output
5. If PR exists:
    - Just push commits (PR auto-updates)
    - Return existing PR URL from list output

## PR Description Template

```markdown
### Summary

- [Specific changes based on commits]

### Test Plan

**Verification steps:** [Based on changed files]

**Edge cases:** [Based on business logic changes]

Resolves #<issue-number>
```
