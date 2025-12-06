---
layout: default
title: Maintenance Phase Features
nav_order: 13
parent: Specification
---

# Maintenance Phase Features

**Status:** Draft
**Last Updated:** 2025-11-26

## Overview

Features for keeping specifications aligned with evolving codebase. These features support long-term spec-code synchronization and continuous improvement.

**When to Use:** Periodic sync operations after code changes, ongoing feedback loop maintenance.

---

## Continuous Improvement

### F11: Lessons Learned File

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/lessons-learned.ts` - Lessons learned file management
- `src/app/api/lessons/route.ts` - Lessons API endpoints
- `src/components/LessonsPanel.tsx` - Lessons learned UI component
- `src/store/lessons.ts` - Lessons state management
- `src/lib/lesson-parser.ts` - Markdown parsing and storage

#### Description

AI-maintained feedback loop document that logs corrected errors and patterns. AI checks this before generating similar artifacts.

#### Requirements

**Maintenance:**
- AI logs errors when user corrects generated artifacts
- AI checks lessons before generating similar content
- User can add manual entries
- Entries never auto-deleted

**Entry Structure:**
- Date and brief title
- Error description
- Fix applied
- Generalized rule

#### File Schema

**Location:** `.foundry/lessons-learned.md`

Structure:
```markdown
# Lessons Learned

## 2025-01-15: API Error Format

**Context**: Generating login endpoint response
**Error**: Generated endpoint returned `{error: "message"}`
**Fix**: Changed to `{code: "ERR_001", message: "...", details: {...}}`
**Rule**: All errors must follow ErrorResponse schema from constitution
```

#### Decision Reference

See: decisions.md D19 (Lessons Learned - AI-maintained with user editing)

---

### F13: Actualize (Keep Code & Spec in Sync)

**Status:** 🚧 In Progress

#### Key Implementation Files

- `src/lib/code-analyzer.ts` - Source code extraction and analysis
- `src/lib/spec-diff-generator.ts` - Spec vs code comparison
- `src/app/api/actualize/route.ts` - Actualize workflow API endpoints
- `src/components/ActualizeView.tsx` - Actualize UI component
- `src/store/actualize.ts` - Actualize state management

#### Description

Periodic analysis of implemented code vs specification to identify gaps and inconsistencies.

#### Workflow

1. **Analyze Code**: Extract current architecture from source code
2. **Compare to Spec**: Find differences, missing implementations
3. **Report Issues**: List what's changed since spec was generated
4. **Suggest Updates**: Offer to update spec based on current code
5. **Review Changes**: User approves before applying

#### Model Usage

Uses **Opus** for complex code analysis to ensure high accuracy.

---

## Git Integration

### Git Integration

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/git-integration.ts` - Git command wrapper and operations
- `src/lib/git-operations.ts` - Git-specific workflows (branch, commit, push, pull)
- `src/app/api/git/route.ts` - Git operations API endpoints
- `src/components/GitPanel.tsx` - Git UI component
- `src/store/git.ts` - Git state management

#### Description

Tight integration with Git for version control of specifications.

#### Features

- **Commit Specs**: Commit changes with one click
- **Branch Management**: Create feature branches, work on experimental specs
- **Pull/Push**: Sync with remote repositories
- **Diff Viewer**: See what changed between versions
- **Conflict Resolution**: Handle merge conflicts with guidance

---

## Dependencies

- **F11 (Lessons Learned)** is referenced by:
  - All AI-driven generators (use as context)
  - Consistency analyzer (check against learned patterns)

- **F13 (Actualize)** depends on:
  - Code analysis capability (uses Opus)
  - Schema/API extraction
  - Specification parser

- **Git Integration** enables:
  - Multi-branch workflows
  - Collaboration (when team tools are added)
  - Audit trail of spec changes
