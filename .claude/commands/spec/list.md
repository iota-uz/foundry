---
description: "List all specifications with status and completion info"
model: haiku
---

## Specs

**Single-file:**
!`ls -1 docs/specification/*.md 2>/dev/null || echo "None"`

**Multi-file:**
!`ls -d docs/specification/*/ 2>/dev/null || echo "None"`

## Instructions

For each spec:

1. Read the file (single-file) or `index.md` (multi-file)
2. Extract:
    - **Status:** First line containing "Status:" (Draft/In Review/Approved)
    - **Open items:** Count of `[TBD]` markers
    - **Documents:** Count (multi-file only)

3. Present as table:

| Spec | Type | Status | Open Items |
|------|------|--------|------------|

4. Suggest next action:
    - `/spec:edit <name>` to continue work
    - `/spec:review <name>` if no open items
    - `/spec:build` to create new
