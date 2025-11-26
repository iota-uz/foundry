---
description: "Review backlog items for completion using refactoring-expert"
model: haiku
disable-model-invocation: true
---

You are tasked with reviewing backlog items to verify implementation quality and completeness. All available backlog items:

!`ls -1 .claude/backlog/*.md 2>/dev/null | sort -n || echo "No backlog items found"`

If no files are found, stop and inform the user.

## Step 1: Initialize Review

Prepare to track the completion status for each backlog item. You will review each item sequentially using the refactoring-expert agent.

## Step 2: Sequential Review Process

For each backlog file in numeric order:

1. Read the file contents using the Read tool
2. Extract all `## Subtask N: Title [STATUS]` sections:
   - Record subtask number, title, and current checkbox status
   - Build subtask map with current status
3. Launch single `refactoring-expert` agent with this prompt:

```
Review the implementation for this backlog item.

For EACH subtask listed below, determine if it is COMPLETE or INCOMPLETE based on codebase analysis.

{FULL_BACKLOG_ITEM_CONTENT}

Respond with completion status for each subtask in this exact format:

Subtask 1: COMPLETE - [brief reason]
Subtask 2: INCOMPLETE - [brief reason]
Subtask N: COMPLETE/INCOMPLETE - [brief reason]

Provide your assessment for each subtask focusing on:
- What was implemented (if anything)
- Quality of the implementation
- Missing functionality or requirements

If you cannot find relevant implementation or a subtask appears not to have been started, mark as INCOMPLETE.
```

4. Wait for agent completion
5. Parse response to extract COMPLETE/INCOMPLETE status for each subtask
6. For each subtask marked COMPLETE:
   - If current status is `[ ]`: Update to `[✓]` using Edit tool
   - If current status is already `[✓]`: Skip (no change needed)
7. Check if ALL subtasks are now marked `[✓]`:
   - If yes: Add to complete items list for deletion prompt
   - If no: Add to incomplete items list with details of which subtasks remain
8. **DO NOT delete files during this step** - only update checkboxes and collect status

## Step 3: Present Complete Items

After reviewing all items, compile a list of items where ALL subtasks are marked `[✓]`.

If no items are fully complete, inform the user and exit.

If items are fully complete, present them to the user in this format:

```
Review complete. The following backlog items are fully implemented (all subtasks complete):

001-add-promocode-column-to-policies.md
- All 3 subtasks complete
- Summary: [brief summary of what was completed]

002-fix-graphql-null-pointer-errors.md
- All 1 subtask complete
- Summary: [brief summary of what was completed]
```

For items with incomplete subtasks, present separately:

```
The following backlog items have partial completion:

003-ai-chat-improvements.md
- Completed: Subtasks 1, 3
- Remaining: Subtasks 2, 4
```

## Step 4: Confirm Deletion

Use the AskUserQuestion tool to ask which complete items should be deleted:

- **Question:** "Which complete backlog items would you like to delete?"
- **Header:** "Delete items"
- **Options:** List each COMPLETE filename as an option with its summary as description
- **multiSelect:** true

## Step 5: Delete Confirmed Items

After receiving user selection:

1. Confirm: "Deleting {COUNT} items: {FILENAMES}"
2. Delete each selected file using rm command: `rm .claude/backlog/{FILENAME}`
3. Provide summary:

```
Deleted: {COUNT} items
Remaining backlog items: {COUNT}
```

If remaining items exist, list them.

## Important Notes

- Execute reviews sequentially (one after another), NOT in parallel
- Wait for each refactoring-expert agent to complete before moving to the next item
- Track completion status from agent feedback - look for a clear COMPLETE / INCOMPLETE verdict
- Only suggest deletion for items marked COMPLETE by the agent
- Use Bash tool with rm command to delete files
- Do NOT renumber remaining files (unlike delete.md, this preserves the original numbering)
