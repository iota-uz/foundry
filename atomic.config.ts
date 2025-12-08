/**
 * Example Workflow Configuration
 *
 * This demonstrates the graph engine API with:
 * - Array-based node definitions
 * - Type-safe transitions via schema
 * - Enum-based tool references
 * - Intuitive naming (prompt, then, capabilities)
 *
 * @example Usage with CLI:
 * ```bash
 * bun run src/lib/cli.ts run --config atomic.config.ts --context '{"issueId": 123}'
 * ```
 */

import { z } from 'zod';
import {
  defineNodes,
  defineWorkflow,
  StdlibTool,
  AgentModel,
  SpecialNode,
  type InlineTool,
  type WorkflowState,
} from './src/lib/graph';

// ============================================================================
// Context Type Definition
// ============================================================================

/**
 * Context type for the feature development workflow.
 * This stores state that persists across nodes.
 */
interface FeatureContext extends Record<string, unknown> {
  /** GitHub issue ID being worked on */
  issueId?: number;

  /** The development plan created by PLAN phase */
  plan?: {
    tasks: Array<{
      id: string;
      description: string;
      completed: boolean;
    }>;
    estimatedHours: number;
  };

  /** Whether all planned tasks are done */
  allTasksDone: boolean;

  /** QA test results */
  qaResults?: {
    passed: boolean;
    bugs: Array<{
      id: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  };

  /** Whether QA passed */
  qaPassed: boolean;

  /** Number of fix attempts */
  fixAttempts: number;

  /** Result from last command execution */
  lastCommandResult?: {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
  };

  /** Result from last slash command */
  lastSlashCommandResult?: {
    success: boolean;
    output: string;
  };
}

// ============================================================================
// Custom Tools
// ============================================================================

/**
 * Custom tool for running tests with a specific pattern.
 */
const runTestsTool: InlineTool<{ pattern: string }> = {
  name: 'run_tests',
  description: 'Run the test suite for a specific file or pattern',
  schema: z.object({
    pattern: z.string().describe('Test file pattern (e.g., "*.test.ts")'),
  }),
  execute: async (args) => {
    // In a real implementation, this would run bun test
    return { success: true, pattern: args.pattern, message: `Tests matching ${args.pattern} passed` };
  },
};

/**
 * Custom tool for running browser E2E tests.
 */
const browserTestTool: InlineTool<{ testSuite: string }> = {
  name: 'browser_test',
  description: 'Run browser-based E2E tests',
  schema: z.object({
    testSuite: z.string().describe('Name of the test suite to run'),
  }),
  execute: async (args) => {
    // In a real implementation, this would run Playwright/Cypress
    return { success: true, testSuite: args.testSuite, results: [] };
  },
};

// ============================================================================
// Schema Definition
// ============================================================================

/**
 * Define the node schema with all valid node names.
 * This enables compile-time validation of transitions.
 */
const schema = defineNodes<FeatureContext>()([
  'PLAN',
  'IMPLEMENT',
  'TEST',
  'FIX_CODE',
  'QA',
  'FIX',
  'SUBMIT',
] as const);

// Type alias for convenience
type NodeName = typeof schema.names[number];

// ============================================================================
// Workflow Definition
// ============================================================================

/**
 * Feature development workflow configuration.
 *
 * This workflow implements an iterative development loop:
 *
 *   PLAN → IMPLEMENT → TEST ←→ FIX_CODE (loop until tests pass)
 *                        ↓
 *                       QA ←→ FIX (loop until passed)
 *                        ↓
 *                     SUBMIT → END
 *
 * Entry point: PLAN (first node in array)
 */
export default defineWorkflow({
  id: 'feature-development',
  schema,

  // Initial context values
  initialContext: {
    allTasksDone: false,
    qaPassed: false,
    fixAttempts: 0,
  },

  nodes: [
    // =========================================================================
    // Phase 1: Planning (Entry Point - first in array)
    // =========================================================================
    schema.agent('PLAN', {
      role: 'architect',
      prompt: `You are a senior Tech Lead analyzing a GitHub issue to create a development plan.

Your responsibilities:
1. Understand the requirements from the issue
2. Break down the work into discrete, testable tasks
3. Identify dependencies between tasks
4. Estimate effort for each task
5. Output a structured JSON plan

Output format:
{
  "tasks": [
    { "id": "task-1", "description": "...", "completed": false },
    ...
  ],
  "estimatedHours": <number>
}

Use the available tools to explore the codebase and understand the context.`,

      capabilities: [
        StdlibTool.Glob,
        StdlibTool.Read,
        StdlibTool.Grep,
      ],

      model: AgentModel.Sonnet,

      // Static transition - always go to IMPLEMENT after planning
      then: () => 'IMPLEMENT',
    }),

    // =========================================================================
    // Phase 2: Implementation (Loop)
    // =========================================================================
    schema.agent('IMPLEMENT', {
      role: 'developer',
      prompt: `You are a senior software developer implementing planned tasks.

Your responsibilities:
1. Read the plan from context
2. Implement each task one at a time
3. Write clean, tested code
4. Update task status when complete
5. Set allTasksDone=true when all tasks are finished

Follow best practices:
- Write tests before implementation (TDD)
- Keep commits atomic and well-described
- Follow existing code style
- Add documentation where needed`,

      capabilities: [
        StdlibTool.Read,
        StdlibTool.Write,
        StdlibTool.Glob,
        runTestsTool,
      ],

      model: AgentModel.Sonnet,

      // Dynamic transition - go to TEST when tasks done, or loop back
      then: (state: WorkflowState<FeatureContext>): NodeName | SpecialNode => {
        if (state.context.allTasksDone) {
          return 'TEST';
        }
        return 'IMPLEMENT';
      },
    }),

    // =========================================================================
    // Phase 2.5: Automated Testing
    // =========================================================================
    schema.slashCommand('TEST', {
      command: 'test',
      args: 'Run all tests and report any failures',

      // Dynamic transition - go to QA if tests pass, back to FIX_CODE if they fail
      then: (state: WorkflowState<FeatureContext>): NodeName | SpecialNode => {
        if (state.context.lastSlashCommandResult?.success) {
          return 'QA';
        }
        return 'FIX_CODE';
      },
    }),

    // =========================================================================
    // Phase 2.6: Fix Code Issues
    // =========================================================================
    schema.slashCommand('FIX_CODE', {
      command: 'edit',
      args: 'Fix the failing tests based on the test output. Make minimal changes to resolve the issues.',

      // Always go back to TEST after fixing
      then: () => 'TEST',
    }),

    // =========================================================================
    // Phase 3: Quality Assurance
    // =========================================================================
    schema.agent('QA', {
      role: 'qa-engineer',
      prompt: `You are a senior QA engineer verifying the implementation.

Your responsibilities:
1. Review the implemented code changes
2. Run automated tests
3. Perform manual testing where needed
4. Verify the implementation matches requirements
5. Document any bugs found

Output format for bugs:
{
  "passed": false,
  "bugs": [
    { "id": "bug-1", "description": "...", "severity": "high" },
    ...
  ]
}

Be thorough but fair - only report genuine issues.`,

      capabilities: [
        StdlibTool.Read,
        StdlibTool.Glob,
        StdlibTool.Grep,
        browserTestTool,
      ],

      model: AgentModel.Sonnet,

      // Dynamic transition - go to FIX if bugs found, SUBMIT if passed
      then: (state: WorkflowState<FeatureContext>): NodeName | SpecialNode => {
        if (state.context.qaPassed) {
          return 'SUBMIT';
        }
        return 'FIX';
      },
    }),

    // =========================================================================
    // Phase 4: Bug Fixing (Self-Healing Loop)
    // =========================================================================
    schema.agent('FIX', {
      role: 'developer',
      prompt: `You are a developer fixing bugs found during QA.

Your responsibilities:
1. Read the QA bug report from context
2. Analyze each bug's root cause
3. Implement fixes
4. Add regression tests
5. Update qaResults when bugs are fixed

Be systematic:
- Fix bugs in order of severity (critical first)
- Write a regression test for each fix
- Document the fix in code comments if complex`,

      capabilities: [
        StdlibTool.Read,
        StdlibTool.Write,
        StdlibTool.Glob,
      ],

      model: AgentModel.Sonnet,

      // Always go back to QA after fixing
      then: () => 'QA',
    }),

    // =========================================================================
    // Phase 5: Delivery
    // =========================================================================
    schema.command('SUBMIT', {
      command: 'gh pr create --fill --assignee @me',

      // Terminal transition
      then: () => SpecialNode.End,
    }),
  ],
});
