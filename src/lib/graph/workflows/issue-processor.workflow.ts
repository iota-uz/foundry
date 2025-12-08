/**
 * Issue Processor Workflow
 *
 * A queue-based workflow that processes GitHub issues through a full pipeline:
 * ANALYZE → PLAN → CREATE_PR → EXPLORE → IMPLEMENT → TEST → UPDATE_PR → NEXT_TASK → FINALIZE_PR → REPORT → END
 *
 * Features:
 * - AI-powered issue analysis and task decomposition
 * - Draft PR creation with live Mermaid workflow visualization
 * - Iterative implementation with test-driven development
 * - Automatic progress reporting and PR finalization
 *
 * @example
 * ```bash
 * bun run src/lib/graph/cli/run-issue.ts --issue 123 --base-branch main
 * ```
 */

import {
  defineNodes,
  defineWorkflow,
  StdlibTool,
  AgentModel,
  type WorkflowState,
} from '../index';

// ============================================================================
// Context Type Definitions
// ============================================================================

/**
 * A single task decomposed from an issue.
 */
export interface Task {
  /** Unique task identifier */
  id: string;

  /** Human-readable task description */
  description: string;

  /** Estimated complexity */
  complexity: 'small' | 'medium' | 'large';

  /** Task IDs this task depends on */
  dependencies: string[];

  /** Files likely to be affected */
  files: string[];

  /** Whether this task has been completed */
  completed: boolean;
}

/**
 * Result of issue analysis.
 */
export interface AnalysisResult {
  /** Type of issue */
  type: 'bug' | 'feature' | 'refactor' | 'docs' | 'chore';

  /** Scope determines if PLAN decomposition is needed */
  scope: 'simple' | 'complex';

  /** Brief summary of what needs to be done */
  summary: string;

  /** Key areas of the codebase affected */
  affectedAreas: string[];
}

/**
 * Issue processor workflow context.
 */
export interface IssueContext extends Record<string, unknown> {
  // ─────────────────────────────────────────────────────────────────────────
  // Input (provided at workflow start)
  // ─────────────────────────────────────────────────────────────────────────

  /** GitHub issue number */
  issueNumber: number;

  /** Issue title */
  issueTitle: string;

  /** Issue body content */
  issueBody: string;

  /** Repository in owner/repo format */
  repository: string;

  /** GitHub token for API calls */
  githubToken?: string;

  /** Target branch for PRs (from workflow input) */
  baseBranch: string;

  /** GitHub Actions run URL for linking in dashboard */
  actionsRunUrl?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // ANALYZE output
  // ─────────────────────────────────────────────────────────────────────────

  /** Result of issue analysis */
  analysisResult?: AnalysisResult;

  // ─────────────────────────────────────────────────────────────────────────
  // PLAN output
  // ─────────────────────────────────────────────────────────────────────────

  /** Decomposed tasks from the issue */
  tasks?: Task[];

  /** Index of the current task being worked on */
  currentTaskIndex: number;

  // ─────────────────────────────────────────────────────────────────────────
  // PR tracking (CREATE_PR output)
  // ─────────────────────────────────────────────────────────────────────────

  /** Branch name for the PR */
  branchName?: string;

  /** PR number from gh output */
  prNumber?: number;

  /** Full PR URL */
  prUrl?: string;

  /** Nodes that completed successfully (for visualization) */
  completedNodes: string[];

  /** Nodes that failed (for visualization) */
  failedNodes: string[];

  // ─────────────────────────────────────────────────────────────────────────
  // Execution state
  // ─────────────────────────────────────────────────────────────────────────

  /** Whether tests passed in the last TEST run */
  testsPassed: boolean;

  /** Whether all tasks have been completed */
  allTasksComplete: boolean;

  /** Number of fix attempts for current task */
  fixAttempts: number;

  /** Maximum fix attempts before moving on */
  maxFixAttempts: number;

  /** Error message if workflow failed */
  error?: string;

  /** Codebase exploration output */
  explorationOutput?: string;

  /** Last command output (from TEST node) */
  lastCommandOutput?: string;
}

// ============================================================================
// Schema Definition
// ============================================================================

/**
 * Define the node schema with all valid node names.
 * This enables compile-time validation of transitions.
 */
const schema = defineNodes<IssueContext>()([
  'ANALYZE',
  'PLAN',
  'CREATE_PR',
  'EXPLORE',
  'IMPLEMENT',
  'TEST',
  'UPDATE_PR',
  'NEXT_TASK',
  'FINALIZE_PR',
  'REPORT',
] as const);

// Type alias for node names
type NodeName = (typeof schema.names)[number];

// ============================================================================
// Workflow Definition
// ============================================================================

/**
 * Issue processor workflow.
 *
 * Flow:
 * ```
 * ANALYZE → PLAN → CREATE_PR → EXPLORE → IMPLEMENT → TEST ─┬─→ UPDATE_PR → NEXT_TASK ──┬─→ FINALIZE_PR → REPORT → END
 *                                  ↑                       │                           │
 *                                  └───────────────────────┘ (fix/next task)           │
 *                                                                                      │
 *                                  ↑                                                   │
 *                                  └───────────────────────────────────────────────────┘ (more tasks)
 * ```
 */
export const issueProcessorWorkflow = defineWorkflow({
  id: 'issue-processor',
  schema,
  initialContext: {
    issueNumber: 0,
    issueTitle: '',
    issueBody: '',
    repository: '',
    baseBranch: 'main',
    currentTaskIndex: 0,
    testsPassed: false,
    allTasksComplete: false,
    fixAttempts: 0,
    maxFixAttempts: 3,
    completedNodes: [],
    failedNodes: [],
  },
  nodes: [
    // =========================================================================
    // ANALYZE: AI analyzes the issue to determine type and scope
    // =========================================================================
    schema.agent('ANALYZE', {
      role: 'analyst',
      prompt: `You are analyzing a GitHub issue to determine its type and scope.

## Issue Details
- Number: {{context.issueNumber}}
- Title: {{context.issueTitle}}
- Body: {{context.issueBody}}

## Your Task
1. Read the issue carefully
2. Explore the codebase to understand the context
3. Determine the issue type: bug, feature, refactor, docs, or chore
4. Assess the scope: simple (single task) or complex (needs decomposition)
5. Identify affected areas of the codebase

## Output
Update the context with your analysis:
- analysisResult.type: The issue type
- analysisResult.scope: "simple" or "complex"
- analysisResult.summary: Brief description of what needs to be done
- analysisResult.affectedAreas: List of codebase areas affected

Be thorough but efficient. Use the available tools to explore the codebase.`,
      capabilities: [StdlibTool.Read, StdlibTool.Glob, StdlibTool.Grep],
      model: AgentModel.Sonnet,
      then: 'PLAN',
    }),

    // =========================================================================
    // PLAN: Decompose complex issues into manageable tasks
    // =========================================================================
    schema.agent('PLAN', {
      role: 'architect',
      prompt: `You are decomposing an issue into manageable tasks.

## Analysis Result
- Type: {{context.analysisResult.type}}
- Scope: {{context.analysisResult.scope}}
- Summary: {{context.analysisResult.summary}}
- Affected Areas: {{context.analysisResult.affectedAreas}}

## Your Task
Based on the analysis, create a task list:

### For Simple Issues (scope: "simple")
Create a single task that covers the entire issue.

### For Complex Issues (scope: "complex")
Break down into 2-5 tasks with:
1. Clear, atomic descriptions
2. Logical dependencies (what must be done first)
3. Affected files for each task
4. Complexity estimate (small/medium/large)

## Output
Update context.tasks with an array of Task objects:
\`\`\`typescript
interface Task {
  id: string;           // e.g., "task-1"
  description: string;  // What needs to be done
  complexity: "small" | "medium" | "large";
  dependencies: string[]; // IDs of tasks this depends on
  files: string[];      // Files likely to be modified
  completed: boolean;   // Start as false
}
\`\`\`

Order tasks so dependencies come first.`,
      capabilities: [StdlibTool.Read, StdlibTool.Glob],
      model: AgentModel.Sonnet,
      then: 'CREATE_PR',
    }),

    // =========================================================================
    // CREATE_PR: Create branch and draft PR before implementation
    // =========================================================================
    schema.dynamicCommand('CREATE_PR', {
      command: (state: WorkflowState<IssueContext>): string => {
        const { issueNumber, issueTitle, repository, baseBranch } = state.context;
        const branchName = `claude/issue-${issueNumber}`;
        const safeTitle = issueTitle.replace(/"/g, '\\"').substring(0, 100);

        // Create branch and draft PR in one command sequence
        return `git checkout -b ${branchName} 2>/dev/null || git checkout ${branchName} && \\
git push -u origin ${branchName} 2>/dev/null || true && \\
gh pr create --draft \\
  --base ${baseBranch} \\
  --head ${branchName} \\
  --title "Issue #${issueNumber}: ${safeTitle}" \\
  --body "## Summary

Processing issue #${issueNumber} via automated workflow.

---

<!-- foundry-workflow-dashboard:issue-${issueNumber} -->
## Workflow Status

\\\`\\\`\\\`mermaid
stateDiagram-v2
    direction LR
    [*] --> ANALYZE
    ANALYZE --> PLAN
    PLAN --> CREATE_PR
    CREATE_PR --> EXPLORE
    EXPLORE --> IMPLEMENT
    IMPLEMENT --> TEST
    TEST --> UPDATE_PR
    UPDATE_PR --> NEXT_TASK
    NEXT_TASK --> FINALIZE_PR
    FINALIZE_PR --> REPORT
    REPORT --> [*]
\\\`\\\`\\\`

| Field | Value |
|-------|-------|
| **Status** | Starting implementation... |

<!-- /foundry-workflow-dashboard:issue-${issueNumber} -->

---

*Automated by sys/graph workflow engine*" \\
  --repo ${repository} 2>&1 || echo "PR may already exist"`;
      },
      timeout: 60000,
      then: 'EXPLORE',
    }),

    // =========================================================================
    // EXPLORE: Gather codebase context before implementation
    // =========================================================================
    schema.command('EXPLORE', {
      command: 'tree -L 3 src/ --gitignore 2>/dev/null || find src -type f -name "*.ts" | head -50',
      timeout: 30000,
      then: 'IMPLEMENT',
    }),

    // =========================================================================
    // IMPLEMENT: AI implements the current task
    // =========================================================================
    schema.agent('IMPLEMENT', {
      role: 'developer',
      prompt: `You are implementing a task from the plan.

## Current Task
Task Index: {{context.currentTaskIndex}}
{{#if context.tasks}}
Task: {{context.tasks.[context.currentTaskIndex]}}
{{/if}}

## Previous Exploration
{{context.explorationOutput}}

## Your Task
1. Implement the current task
2. Write clean, well-documented code
3. Follow existing patterns in the codebase
4. Make minimal changes - only what's necessary

## Guidelines
- Read files before modifying them
- Use the Edit tool for surgical changes
- Add tests if the task requires it
- Don't over-engineer

When done, the workflow will run tests to verify your changes.`,
      capabilities: [
        StdlibTool.Read,
        StdlibTool.Write,
        StdlibTool.Edit,
        StdlibTool.Glob,
        StdlibTool.Grep,
        StdlibTool.Bash,
      ],
      model: AgentModel.Sonnet,
      maxTurns: 20,
      then: 'TEST',
    }),

    // =========================================================================
    // TEST: Run tests to verify implementation
    // =========================================================================
    schema.command('TEST', {
      command: 'bun run lint && bun run typecheck && bun run test',
      timeout: 300000, // 5 minutes
      throwOnError: false, // Don't throw, let transition handle it
      then: 'UPDATE_PR', // Always go to UPDATE_PR to update status
    }),

    // =========================================================================
    // UPDATE_PR: Update PR body with current workflow status
    // =========================================================================
    schema.dynamicCommand('UPDATE_PR', {
      command: (state: WorkflowState<IssueContext>): string => {
        const { issueNumber, repository, tasks, currentTaskIndex, fixAttempts, maxFixAttempts, testsPassed, actionsRunUrl } = state.context;
        const currentTask = tasks?.[currentTaskIndex];
        const taskDescription = currentTask?.description || 'Processing...';

        // Determine node statuses for visualization
        const completedNodesForDiagram = ['ANALYZE', 'PLAN', 'CREATE_PR', 'EXPLORE'];

        // Build class assignments for Mermaid
        const completedClass = completedNodesForDiagram.join(',');
        const actionsLink = actionsRunUrl ? `[View Logs →](${actionsRunUrl})` : '_Running locally_';
        const attemptInfo = `${fixAttempts + 1} / ${maxFixAttempts}`;

        const prBody = `## Summary

Processing issue #${issueNumber} via automated workflow.

---

<!-- foundry-workflow-dashboard:issue-${issueNumber} -->
## Workflow Status

\\\`\\\`\\\`mermaid
stateDiagram-v2
    direction LR
    classDef completed fill:#d1fae5
    classDef active fill:#fef3c7
    classDef failed fill:#fee2e2
    classDef pending fill:#e5e7eb

    [*] --> ANALYZE
    ANALYZE --> PLAN
    PLAN --> CREATE_PR
    CREATE_PR --> EXPLORE
    EXPLORE --> IMPLEMENT
    IMPLEMENT --> TEST
    TEST --> UPDATE_PR
    UPDATE_PR --> NEXT_TASK
    NEXT_TASK --> FINALIZE_PR
    FINALIZE_PR --> REPORT
    REPORT --> [*]

    class ${completedClass} completed
    class IMPLEMENT,TEST active
    class UPDATE_PR,NEXT_TASK,FINALIZE_PR,REPORT pending
\\\`\\\`\\\`

| Field | Value |
|-------|-------|
| **Current Task** | ${taskDescription} |
| **Test Status** | ${testsPassed ? '✅ Passed' : '❌ Failed'} |
| **Attempt** | ${attemptInfo} |
| **Actions** | ${actionsLink} |

<sub>Updated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</sub>

<!-- /foundry-workflow-dashboard:issue-${issueNumber} -->

---

*Automated by sys/graph workflow engine*`;

        // Write body to temp file and use gh pr edit
        const escapedBody = prBody.replace(/'/g, "'\\''");
        return `echo '${escapedBody}' > /tmp/pr-body-${issueNumber}.md && \\
gh pr edit --repo ${repository} --body-file /tmp/pr-body-${issueNumber}.md 2>&1 || echo "PR update skipped"`;
      },
      timeout: 30000,
      then: (state: WorkflowState<IssueContext>): NodeName | 'END' => {
        // Check if tests passed
        if (state.context.testsPassed) {
          return 'NEXT_TASK';
        }

        // Tests failed - check if we should retry
        if (state.context.fixAttempts < state.context.maxFixAttempts) {
          return 'IMPLEMENT'; // Go back to fix
        }

        // Max retries exceeded - move to next task anyway
        return 'NEXT_TASK';
      },
    }),

    // =========================================================================
    // NEXT_TASK: Advance to next task or finish
    // =========================================================================
    schema.eval('NEXT_TASK', {
      update: (state: WorkflowState<IssueContext>): Partial<IssueContext> => {
        const tasks = state.context.tasks || [];
        const currentIndex = state.context.currentTaskIndex;

        // Mark current task as completed
        if (tasks[currentIndex]) {
          tasks[currentIndex].completed = true;
        }

        // Check if there are more tasks
        const nextIndex = currentIndex + 1;
        const hasMoreTasks = nextIndex < tasks.length;

        return {
          tasks,
          currentTaskIndex: hasMoreTasks ? nextIndex : currentIndex,
          allTasksComplete: !hasMoreTasks,
          fixAttempts: 0, // Reset for next task
          testsPassed: false, // Reset for next task
        };
      },
      then: (state: WorkflowState<IssueContext>): NodeName | 'END' => {
        if (state.context.allTasksComplete) {
          return 'FINALIZE_PR';
        }
        return 'IMPLEMENT'; // Continue with next task
      },
    }),

    // =========================================================================
    // FINALIZE_PR: Update final status and mark PR ready for review
    // =========================================================================
    schema.dynamicCommand('FINALIZE_PR', {
      command: (state: WorkflowState<IssueContext>): string => {
        const { issueNumber, repository, tasks, actionsRunUrl } = state.context;
        const completedCount = tasks?.filter((t) => t.completed).length || 0;
        const totalCount = tasks?.length || 0;
        const actionsLink = actionsRunUrl ? `[View Logs →](${actionsRunUrl})` : '_Completed_';

        const prBody = `## Summary

Issue #${issueNumber} has been processed by the automated workflow.

**Tasks Completed:** ${completedCount} / ${totalCount}

---

<!-- foundry-workflow-dashboard:issue-${issueNumber} -->
## Workflow Status

\\\`\\\`\\\`mermaid
stateDiagram-v2
    direction LR
    classDef completed fill:#d1fae5
    classDef active fill:#fef3c7
    classDef pending fill:#e5e7eb

    [*] --> ANALYZE
    ANALYZE --> PLAN
    PLAN --> CREATE_PR
    CREATE_PR --> EXPLORE
    EXPLORE --> IMPLEMENT
    IMPLEMENT --> TEST
    TEST --> UPDATE_PR
    UPDATE_PR --> NEXT_TASK
    NEXT_TASK --> FINALIZE_PR
    FINALIZE_PR --> REPORT
    REPORT --> [*]

    class ANALYZE,PLAN,CREATE_PR,EXPLORE,IMPLEMENT,TEST,UPDATE_PR,NEXT_TASK,FINALIZE_PR completed
    class REPORT active
\\\`\\\`\\\`

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Tasks** | ${completedCount} / ${totalCount} completed |
| **Actions** | ${actionsLink} |

<sub>Completed: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</sub>

<!-- /foundry-workflow-dashboard:issue-${issueNumber} -->

---

*Automated by sys/graph workflow engine*`;

        // Update PR body and mark ready for review
        const escapedBody = prBody.replace(/'/g, "'\\''");
        return `echo '${escapedBody}' > /tmp/pr-body-${issueNumber}.md && \\
gh pr edit --repo ${repository} --body-file /tmp/pr-body-${issueNumber}.md && \\
gh pr ready --repo ${repository} 2>&1 || echo "PR ready command skipped"`;
      },
      timeout: 30000,
      then: 'REPORT',
    }),

    // =========================================================================
    // REPORT: Post results back to GitHub issue
    // =========================================================================
    schema.dynamicCommand('REPORT', {
      command: (state: WorkflowState<IssueContext>): string => {
        const { issueNumber, repository, tasks, prUrl } = state.context;
        const completedCount = tasks?.filter((t) => t.completed).length || 0;
        const totalCount = tasks?.length || 0;
        const prLink = prUrl ? `\n\n**Pull Request:** ${prUrl}` : '';

        return `gh issue comment ${issueNumber} --repo ${repository} --body "## Workflow Complete

### Summary
This issue has been processed by the automated workflow.

### Results
- **Tasks Completed:** ${completedCount} / ${totalCount}${prLink}

### Next Steps
Please review the PR and provide feedback.

---
*Automated by sys/graph workflow engine*"`;
      },
      timeout: 30000,
      then: 'END',
    }),
  ],
});

// Default export for config loading
export default issueProcessorWorkflow;
