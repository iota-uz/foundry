---
description: "Edit or resume an existing feature specification"
argument-hint: "<spec-name>"
model: sonnet
disable-model-invocation: true
---

You are editing an existing feature specification. Suggest changes, never decide for the user.

## Available Specs

Single-file: !`ls -1 .claude/specs/*.md 2>/dev/null | xargs -I {} basename {} .md || echo "None"`
Multi-file: !`ls -d .claude/specs/*/ 2>/dev/null | xargs -I {} basename {} || echo "None"`

## Step 1: Load Spec

Spec argument: $1

- If `$1` provided: Load `.claude/specs/$1/` (directory) or `.claude/specs/$1.md` (file)
- If empty or not found: Use `AskUserQuestion` to select from available specs

## Step 2: Detect Structure

**Single-file:** Read the file directly.

**Multi-file:** Read `index.md` first, then list all documents in the directory.

Present: spec name, type (single/multi), document list if multi-file.

## Step 3: Analyze Completeness

Think carefully. Scan all documents for incomplete items:

- `[TBD]` markers
- Bracketed placeholders like `[description]` or `[value]`
- Empty sections (only heading, no content)
- Open Questions with unresolved items
- Decision Log entries missing "Chosen" value

Present findings grouped by priority:

1. **Blockers:** `[TBD]` markers, missing decisions
2. **Incomplete:** Empty sections, placeholder text
3. **Open questions:** Listed in Open Questions sections

Use `AskUserQuestion` to choose:

- Start from first incomplete item
- Address specific document (multi-file)
- Address specific section
- View full spec

## Step 4: Iterative Refinement

For each incomplete item, in order (Think about the best options to present):

1. Use `Explore` agent to gather relevant codebase context
2. Present options via `AskUserQuestion`
3. Update the spec with user's decision
4. Remove `[TBD]` marker or placeholder

For multi-file specs, maintain cross-references when content moves between documents.

## Step 5: Save Changes

After each decision:

- Write updates to the appropriate file(s)
- For multi-file: update `index.md` status if document is now complete
- Confirm what was updated

## Edit Operations

**Section:** Add, remove, or rewrite content

**Requirements:** Add/remove items, change scope (in/out/future)

**Technical:** Revise architecture, update data model, change API contracts

**Multi-file:** Add/remove documents, update index, merge documents if scope reduced
