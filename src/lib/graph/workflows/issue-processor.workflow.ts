/**
 * Issue Processor Workflow
 *
 * A queue-based workflow that processes GitHub issues through a full pipeline:
 * ANALYZE → PLAN → CREATE_PR → PARSE_PR → EXPLORE → IMPLEMENT → TEST → SET_TEST_RESULT → GEN_PR_STATUS → WRITE_PR_STATUS → NEXT_TASK → GEN_FINAL_PR → WRITE_FINAL_PR → SET_DONE_STATUS → REPORT → END
 *
 * Features:
 * - AI-powered issue analysis and task decomposition
 * - Draft PR creation with live Mermaid workflow visualization using built-in mermaid utilities
 * - Iterative implementation with test-driven development
 * - Automatic progress reporting and PR finalization
 * - Proper context tracking (branchName, prNumber, prUrl, completedNodes, testsPassed, fixAttempts)
 * - Clean shell command handling with heredoc syntax
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
  SpecialNode,
  type WorkflowState,
} from '../index';
import {
  generateStatusDashboard,
  createDiagramNodes,
  type DiagramEdge,
} from '../mermaid';

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
  // Project tracking (optional - for status updates)
  // ─────────────────────────────────────────────────────────────────────────

  /** Project owner (for status updates) */
  projectOwner?: string;

  /** Project number (for status updates) */
  projectNumber?: number;

  /** Status to set when complete (default: 'Done') */
  doneStatus?: string;

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

  /** Generated PR body markdown (stored by GEN_PR_STATUS) */
  prBodyMarkdown?: string;

  /** Result from last dynamic command execution */
  lastDynamicCommandResult?: { exitCode: number; stdout: string; stderr: string; success: boolean };
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
  'PARSE_PR',           // NEW: Extract PR metadata from CREATE_PR output
  'EXPLORE',
  'IMPLEMENT',
  'TEST',
  'SET_TEST_RESULT',    // NEW: Set testsPassed from exit code
  'GEN_PR_STATUS',      // NEW: Generate PR body (replaces UPDATE_PR)
  'WRITE_PR_STATUS',    // NEW: Write PR body to GitHub
  'INCREMENT_RETRY',    // NEW: Increment fixAttempts
  'NEXT_TASK',
  'GEN_FINAL_PR',       // NEW: Generate final PR body (replaces FINALIZE_PR)
  'WRITE_FINAL_PR',     // NEW: Write final PR and mark ready
  'SET_DONE_STATUS',    // NEW: Update project status to "Done" (project source only)
  'REPORT',
] as const);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates PR body markdown with workflow status dashboard.
 * Uses mermaid utilities to create a visual workflow diagram.
 *
 * @param state - Current workflow state
 * @param options - Configuration options
 * @returns Complete PR body markdown
 */
function generatePRBody(
  state: WorkflowState<IssueContext>,
  options: { isFinal: boolean }
): string {
  const { issueNumber, tasks, currentTaskIndex, fixAttempts, maxFixAttempts, actionsRunUrl, completedNodes } = state.context;
  const { isFinal } = options;

  // Define all workflow nodes in order
  const allNodeNames = [
    'ANALYZE',
    'PLAN',
    'CREATE_PR',
    'PARSE_PR',
    'EXPLORE',
    'IMPLEMENT',
    'TEST',
    'SET_TEST_RESULT',
    'GEN_PR_STATUS',
    'WRITE_PR_STATUS',
    'INCREMENT_RETRY',
    'NEXT_TASK',
    'GEN_FINAL_PR',
    'WRITE_FINAL_PR',
    'SET_DONE_STATUS',
    'REPORT',
  ];

  // Define workflow edges for diagram
  const edges: DiagramEdge[] = [
    { from: 'ANALYZE', to: 'PLAN' },
    { from: 'PLAN', to: 'CREATE_PR' },
    { from: 'CREATE_PR', to: 'PARSE_PR' },
    { from: 'PARSE_PR', to: 'EXPLORE' },
    { from: 'EXPLORE', to: 'IMPLEMENT' },
    { from: 'IMPLEMENT', to: 'TEST' },
    { from: 'TEST', to: 'SET_TEST_RESULT' },
    { from: 'SET_TEST_RESULT', to: 'GEN_PR_STATUS' },
    { from: 'GEN_PR_STATUS', to: 'WRITE_PR_STATUS' },
    { from: 'WRITE_PR_STATUS', to: 'NEXT_TASK', label: 'tests passed' },
    { from: 'WRITE_PR_STATUS', to: 'INCREMENT_RETRY', label: 'tests failed' },
    { from: 'INCREMENT_RETRY', to: 'IMPLEMENT', label: 'retry' },
    { from: 'INCREMENT_RETRY', to: 'NEXT_TASK', label: 'max retries' },
    { from: 'NEXT_TASK', to: 'IMPLEMENT', label: 'more tasks' },
    { from: 'NEXT_TASK', to: 'GEN_FINAL_PR', label: 'complete' },
    { from: 'GEN_FINAL_PR', to: 'WRITE_FINAL_PR' },
    { from: 'WRITE_FINAL_PR', to: 'SET_DONE_STATUS' },
    { from: 'SET_DONE_STATUS', to: 'REPORT' },
    { from: 'REPORT', to: 'END' },
  ];

  // Determine current active node based on state
  const activeNode = isFinal ? 'REPORT' : state.currentNode || 'IMPLEMENT';

  // Create diagram nodes with proper status
  const diagramNodes = createDiagramNodes(
    allNodeNames,
    activeNode,
    completedNodes || [],
    state.context.failedNodes || []
  );

  // Get current task info
  const currentTask = tasks?.[currentTaskIndex];
  const taskDescription = currentTask?.description || 'Processing...';
  const completedCount = tasks?.filter((t) => t.completed).length || 0;
  const totalCount = tasks?.length || 0;

  // Generate dashboard config
  const dashboardConfig: {
    markerId: string;
    currentTask: string;
    retryAttempt?: number;
    maxRetries?: number;
    actionsRunUrl?: string;
    title: string;
  } = {
    markerId: `issue-${issueNumber}`,
    currentTask: isFinal ? `✅ All tasks complete (${completedCount}/${totalCount})` : taskDescription,
    title: 'Workflow Status',
  };

  // Only add optional properties if they have values (avoid setting to undefined with exactOptionalPropertyTypes)
  if (!isFinal) {
    dashboardConfig.retryAttempt = fixAttempts + 1;
    dashboardConfig.maxRetries = maxFixAttempts;
  }

  if (actionsRunUrl) {
    dashboardConfig.actionsRunUrl = actionsRunUrl;
  }

  const dashboard = generateStatusDashboard(
    {
      nodes: diagramNodes,
      edges,
      activeNode,
      direction: 'LR',
    },
    dashboardConfig
  );

  // Build complete PR body
  const summary = isFinal
    ? `Issue #${issueNumber} has been processed by the automated workflow.\n\n**Tasks Completed:** ${completedCount} / ${totalCount}`
    : `Processing issue #${issueNumber} via automated workflow.`;

  return `## Summary

${summary}

---

${dashboard}

---

*Automated by sys/graph workflow engine*`;
}

// ============================================================================
// Workflow Definition
// ============================================================================

/**
 * Issue processor workflow.
 *
 * Flow:
 * ```
 * ANALYZE → PLAN → CREATE_PR → PARSE_PR → EXPLORE → IMPLEMENT → TEST → SET_TEST_RESULT → GEN_PR_STATUS → WRITE_PR_STATUS
 *                                  ↑                                                                              │
 *                                  │                                                    ┌────────────────────────┼─→ NEXT_TASK ──┬─→ GEN_FINAL_PR → WRITE_FINAL_PR → SET_DONE_STATUS → REPORT → END
 *                                  │                                                    │ (tests passed)         │                  (all tasks done)
 *                                  │                                                    │                        │
 *                                  │                                                    ↓                        │
 *                                  │                                             INCREMENT_RETRY                 │
 *                                  │                                                    │                        │
 *                                  └────────────────────────────────────────────────────┼───────────────────────┘
 *                                                         (retry/max retries)           (more tasks)
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
      then: () => 'PLAN',
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
      then: () => 'CREATE_PR',
    }),

    // =========================================================================
    // CREATE_PR: Create branch and draft PR before implementation
    // =========================================================================
    schema.dynamicCommand('CREATE_PR', {
      command: (state: WorkflowState<IssueContext>): string => {
        const { issueNumber, issueTitle, repository, baseBranch } = state.context;
        const branchName = `claude/issue-${issueNumber}`;
        const safeTitle = issueTitle.replace(/"/g, '\\"').substring(0, 100);

        // Simple initial PR body
        const initialBody = `## Summary

Processing issue #${issueNumber} via automated workflow.

---

*Automated by sys/graph workflow engine*`;

        // Create branch and draft PR in one command sequence
        return `git checkout -b ${branchName} 2>/dev/null || git checkout ${branchName} && \\
git push -u origin ${branchName} 2>/dev/null || true && \\
gh pr create --draft \\
  --base ${baseBranch} \\
  --head ${branchName} \\
  --title "Issue #${issueNumber}: ${safeTitle}" \\
  --body "${initialBody.replace(/"/g, '\\"')}" \\
  --repo ${repository} 2>&1 || echo "PR may already exist"`;
      },
      timeout: 60000,
      then: () => 'PARSE_PR',
    }),

    // =========================================================================
    // PARSE_PR: Extract PR metadata from CREATE_PR output
    // =========================================================================
    schema.eval('PARSE_PR', {
      update: (state) => {
        const result = state.context.lastDynamicCommandResult as { stdout?: string } | undefined;
        const output = result?.stdout ?? '';

        // gh pr create outputs: https://github.com/owner/repo/pull/123
        const prUrlMatch = output.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/(\d+)/);
        const branchName = `claude/issue-${state.context.issueNumber}`;

        const updates: Partial<IssueContext> = {
          branchName,
          completedNodes: [...state.context.completedNodes, 'CREATE_PR', 'PARSE_PR'],
        };

        // Only set if we have values (avoid setting to undefined with exactOptionalPropertyTypes)
        if (prUrlMatch) {
          updates.prNumber = parseInt(prUrlMatch[1]!, 10);
          updates.prUrl = prUrlMatch[0];
        }

        return updates;
      },
      then: () => 'EXPLORE',
    }),

    // =========================================================================
    // EXPLORE: Gather codebase context before implementation
    // =========================================================================
    schema.command('EXPLORE', {
      command: 'tree -L 3 src/ --gitignore 2>/dev/null || find src -type f -name "*.ts" | head -50',
      timeout: 30000,
      then: () => 'IMPLEMENT',
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
      then: () => 'TEST',
    }),

    // =========================================================================
    // TEST: Run tests to verify implementation
    // =========================================================================
    schema.command('TEST', {
      command: 'bun run lint && bun run typecheck && bun run test',
      timeout: 300000, // 5 minutes
      throwOnError: false, // Don't throw, let transition handle it
      then: () => 'SET_TEST_RESULT', // Go to SET_TEST_RESULT to parse results
    }),

    // =========================================================================
    // SET_TEST_RESULT: Set testsPassed from exit code
    // =========================================================================
    schema.eval('SET_TEST_RESULT', {
      update: (state) => {
        const result = state.context.lastDynamicCommandResult as { success?: boolean; stdout?: string } | undefined;
        return {
          testsPassed: result?.success ?? false,
          lastCommandOutput: result?.stdout ?? '',
          completedNodes: [...state.context.completedNodes, 'TEST', 'SET_TEST_RESULT'],
        };
      },
      then: () => 'GEN_PR_STATUS',
    }),

    // =========================================================================
    // GEN_PR_STATUS: Generate PR body markdown
    // =========================================================================
    schema.eval('GEN_PR_STATUS', {
      update: (state) => {
        const prBody = generatePRBody(state, { isFinal: false });
        return {
          prBodyMarkdown: prBody,
          completedNodes: [...state.context.completedNodes, 'GEN_PR_STATUS'],
        };
      },
      then: () => 'WRITE_PR_STATUS',
    }),

    // =========================================================================
    // WRITE_PR_STATUS: Write PR body to GitHub
    // =========================================================================
    schema.dynamicCommand('WRITE_PR_STATUS', {
      command: (state) => {
        const { prBodyMarkdown, repository, prNumber, issueNumber } = state.context;

        if (!prNumber) {
          return 'echo "No PR number found, skipping PR update"';
        }

        // Use heredoc to avoid escaping issues
        return `cat << 'PREOF' > /tmp/pr-body-${issueNumber}.md
${prBodyMarkdown}
PREOF
gh pr edit ${prNumber} --repo ${repository} --body-file /tmp/pr-body-${issueNumber}.md`;
      },
      timeout: 30000,
      then: (state) => {
        // Check if tests passed
        if (state.context.testsPassed) {
          return 'NEXT_TASK';
        }

        // Tests failed - retry or give up
        return 'INCREMENT_RETRY';
      },
    }),

    // =========================================================================
    // INCREMENT_RETRY: Increment fixAttempts and decide retry vs. move on
    // =========================================================================
    schema.eval('INCREMENT_RETRY', {
      update: (state) => ({
        fixAttempts: state.context.fixAttempts + 1,
        completedNodes: [...state.context.completedNodes, 'INCREMENT_RETRY'],
      }),
      then: (state) => {
        if (state.context.fixAttempts < state.context.maxFixAttempts) {
          return 'IMPLEMENT'; // Retry implementation
        }
        return 'NEXT_TASK'; // Give up on this task, move to next
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
          completedNodes: [...state.context.completedNodes, 'NEXT_TASK'],
        };
      },
      then: (state) => {
        if (state.context.allTasksComplete) {
          return 'GEN_FINAL_PR';
        }
        return 'IMPLEMENT'; // Continue with next task
      },
    }),

    // =========================================================================
    // GEN_FINAL_PR: Generate final PR body markdown
    // =========================================================================
    schema.eval('GEN_FINAL_PR', {
      update: (state) => {
        const prBody = generatePRBody(state, { isFinal: true });
        return {
          prBodyMarkdown: prBody,
          completedNodes: [...state.context.completedNodes, 'GEN_FINAL_PR'],
        };
      },
      then: () => 'WRITE_FINAL_PR',
    }),

    // =========================================================================
    // WRITE_FINAL_PR: Write final PR body and mark ready for review
    // =========================================================================
    schema.dynamicCommand('WRITE_FINAL_PR', {
      command: (state) => {
        const { prBodyMarkdown, repository, prNumber, issueNumber } = state.context;

        if (!prNumber) {
          return 'echo "No PR number found, skipping PR finalization"';
        }

        return `cat << 'PREOF' > /tmp/pr-body-${issueNumber}.md
${prBodyMarkdown}
PREOF
gh pr edit ${prNumber} --repo ${repository} --body-file /tmp/pr-body-${issueNumber}.md && gh pr ready ${prNumber} --repo ${repository}`;
      },
      timeout: 30000,
      then: () => 'SET_DONE_STATUS',
    }),

    // =========================================================================
    // SET_DONE_STATUS: Update project status to "Done" (project source only)
    // This is a placeholder that gets replaced with SetDoneStatusNodeRuntime
    // in run-issue.ts for proper ProjectsClient-based GraphQL operations
    // =========================================================================
    schema.eval('SET_DONE_STATUS', {
      update: (state) => {
        // Placeholder - actual implementation injected by run-issue.ts
        // This allows the workflow to be defined declaratively while
        // the runtime uses ProjectsClient for type-safe API calls
        return {
          completedNodes: [...state.context.completedNodes, 'SET_DONE_STATUS'],
        };
      },
      then: () => 'REPORT',
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
      then: () => SpecialNode.End,
    }),
  ],
});

// Default export for config loading
export default issueProcessorWorkflow;
