/**
 * Example Atomic Workflow Configuration
 *
 * This configuration demonstrates a full feature development workflow
 * with the following phases:
 * - PLAN: Tech lead analyzes and creates a development plan
 * - IMPLEMENT: Developer implements the planned tasks
 * - QA: QA engineer verifies the implementation
 * - FIX: Developer fixes bugs found in QA
 * - SUBMIT: Creates a PR and submits the work
 *
 * @example Usage with CLI:
 * ```bash
 * bun run src/lib/cli.ts run --config atomic.config.ts --context '{"issueId": 123}'
 * ```
 */

import { defineWorkflow, nodes } from './src/lib/graph';
import { z } from 'zod';

/**
 * Context type for the feature development workflow.
 * This stores state that persists across nodes.
 */
interface FeatureContext {
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
  allTasksDone?: boolean;

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
  qaPassed?: boolean;

  /** Number of fix attempts */
  fixAttempts?: number;
}

/**
 * Feature development workflow configuration.
 *
 * This workflow implements an iterative development loop:
 *
 *   PLAN → IMPLEMENT ←→ (loop until done)
 *            ↓
 *           QA ←→ FIX (loop until passed)
 *            ↓
 *         SUBMIT → END
 */
export default defineWorkflow<FeatureContext>({
  id: 'feature-development',

  // Initial state values (merged with defaults)
  initialState: {
    context: {
      allTasksDone: false,
      qaPassed: false,
      fixAttempts: 0,
    },
  },

  nodes: {
    // =========================================================================
    // Phase 1: Planning
    // =========================================================================
    PLAN: nodes.AgentNode({
      role: 'architect',
      system: `You are a senior Tech Lead analyzing a GitHub issue to create a development plan.

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

      tools: [
        'list_files',
        'read_file',
        'search_code',
      ],

      // Static transition - always go to IMPLEMENT after planning
      next: 'IMPLEMENT',
    }),

    // =========================================================================
    // Phase 2: Implementation (Loop)
    // =========================================================================
    IMPLEMENT: nodes.AgentNode({
      role: 'developer',
      system: `You are a senior software developer implementing planned tasks.

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

      tools: [
        'read_file',
        'write_file',
        'list_files',
        // Example custom tool definition
        {
          name: 'run_tests',
          description: 'Run the test suite for a specific file or pattern',
          schema: z.object({
            pattern: z.string().describe('Test file pattern (e.g., "*.test.ts")'),
          }),
          execute: async (args) => {
            const { pattern } = args as { pattern: string };
            // In a real implementation, this would run bun test
            return { success: true, pattern, message: `Tests matching ${pattern} passed` };
          },
        },
      ],

      // Dynamic transition - loop back to IMPLEMENT until all tasks done
      next: (state) => {
        if (state.context.allTasksDone) {
          return 'QA';
        }
        return 'IMPLEMENT';
      },
    }),

    // =========================================================================
    // Phase 3: Quality Assurance
    // =========================================================================
    QA: nodes.AgentNode({
      role: 'qa-engineer',
      system: `You are a senior QA engineer verifying the implementation.

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

      tools: [
        'read_file',
        'list_files',
        'search_code',
        {
          name: 'browser_test',
          description: 'Run browser-based E2E tests',
          schema: z.object({
            testSuite: z.string().describe('Name of the test suite to run'),
          }),
          execute: async (args) => {
            const { testSuite } = args as { testSuite: string };
            // In a real implementation, this would run Playwright/Cypress
            return { success: true, testSuite, results: [] };
          },
        },
      ],

      // Dynamic transition - go to FIX if bugs found, SUBMIT if passed
      next: (state) => {
        if (state.context.qaPassed) {
          return 'SUBMIT';
        }
        return 'FIX';
      },
    }),

    // =========================================================================
    // Phase 4: Bug Fixing (Self-Healing Loop)
    // =========================================================================
    FIX: nodes.AgentNode({
      role: 'developer',
      system: `You are a developer fixing bugs found during QA.

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

      tools: [
        'read_file',
        'write_file',
        'list_files',
      ],

      // Always go back to QA after fixing
      next: 'QA',
    }),

    // =========================================================================
    // Phase 5: Delivery
    // =========================================================================
    SUBMIT: nodes.CommandNode({
      command: 'gh pr create --fill --assignee @me',

      // Terminal transition
      next: 'END',
    }),
  },
});
