---
description: "Execute backlog tasks sequentially using specified agents"
model: sonnet
disable-model-invocation: true
---

Execute backlog items autonomously without stopping until all selected tasks are processed.

Available backlog items:

!`ls -1 .claude/backlog/*.md 2>/dev/null | sort -n || echo "No backlog items found"`

If no files are found, stop and inform the user.

## Step 1: Upfront Configuration

Ask all questions before starting execution.

### 1.1 Mode Selection

Use `AskUserQuestion`:

- **Question:** "How would you like to execute backlog tasks?"
- **Header:** "Execution mode"
- **Options:**
    - "Run all items" → Execute all backlog tasks sequentially
    - "Select items" → Choose specific tasks to execute

### 1.2 Item Selection (if applicable)

If the user selected "Select items":

1. Read each backlog file to extract the first 50-100 characters as preview
2. Use `AskUserQuestion` with `multiSelect: true`:
    - **Question:** "Which backlog items would you like to execute?"
    - **Header:** "Task selection"
    - **multiSelect:** true
    - **Options:** One per backlog file:
        - **label:** Filename (e.g., "001-fix-auth.md")
        - **description:** First 50-100 chars (exclude `[agent:TYPE]` and `[model:MODEL]` lines)

After questions are answered, proceed to autonomous execution.

## Step 2: Autonomous Execution

Execute all selected tasks sequentially. Do NOT stop on errors.

### 2.1 Parse Task File

For each task file (numeric order):

1. Read file contents using Read tool
2. Extract orchestration expression from `[orchestration:EXPRESSION]`
3. Find all `## Subtask N: Title [STATUS]` sections:
   - Extract subtask number (N) as task ID (task1, task2, etc.)
   - Extract checkbox status: `[ ]` = incomplete, `[✓]` = complete
   - Extract `[agent:TYPE]` under subtask heading
   - Extract `[model:MODEL]` under subtask heading
   - Extract content under `### Prompt` as task prompt
4. Build subtask map: `{task1: {agent, model, prompt, status}, task2: {...}, ...}`
5. Validate:
   - All subtasks referenced in orchestration exist in map
   - All subtasks have required fields (agent, model, prompt)
   - If validation fails: report error and skip this backlog item

### 2.2 Execute Task

Parse orchestration expression into execution plan.

**Parsing Logic:**

1. Tokenize expression: identify `&&`, `&`, `()`, and task IDs
2. Build execution tree:
   - `task1 && task2` → Sequential([task1, task2])
   - `task1 & task2` → Parallel([task1, task2])
   - `(task1 & task2) && task3` → Sequential([Parallel([task1, task2]), task3])
3. Execute tree recursively:
   - **Sequential node**: Execute each child, wait for completion before next
   - **Parallel node**: Launch all children simultaneously using single message with multiple Task tool calls, wait for all to complete
   - **Leaf node (taskN)**: Check status from subtask map
     - If status is `[✓]` (complete): Skip execution (note: subtask already complete)
     - If status is `[ ]` (incomplete): Launch agent with extracted agent type, model, and prompt

**Execution Examples:**

- `task1 && task2 && task3`:
  - Execute task1, wait
  - Execute task2, wait
  - Execute task3, wait

- `(task1 & task2) && task3`:
  - Launch task1 and task2 in parallel (single message with 2 Task calls), wait for both
  - Execute task3, wait

- `task1 && (task2 & task3 & task4)`:
  - Execute task1, wait
  - Launch task2, task3, task4 in parallel (single message with 3 Task calls), wait for all

- `task1` (single subtask):
  - Execute task1, wait

### 2.3 Error Collection

When a subtask fails:

1. Record backlog filename
2. Record subtask ID (task1, task2, etc.)
3. Record agent type used
4. Record error message/details
5. Continue to the next subtask without stopping

### 2.4 Backlog Files

Do NOT modify or delete backlog files during execution. Completion status is updated only by review.md.

## Step 3: Final Report

After all tasks are processed, present summary:

### Execution Summary

- Total backlog items processed: X
- Total subtasks executed: Y (including multi-subtask items)
- Successful: Z
- Failed: W
- Skipped (already complete): V

### Error Details (if any)

For each failed subtask:

- **File:** filename.md
- **Subtask:** task ID (e.g., task1, task2)
- **Agent:** agent type
- **Model:** model used
- **Error:** error message/details

### Skipped Subtasks (if any)

List subtasks that were skipped because they were already marked complete:

- **File:** filename.md
- **Subtask:** task ID
- **Status:** Already complete (skipped)

If all subtasks succeed, confirm completion without errors.
