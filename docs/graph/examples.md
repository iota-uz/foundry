---
layout: default
title: Examples
parent: Graph Workflow Engine
nav_order: 7
description: 'Complete workflow examples'
---

# Examples

Complete workflow examples demonstrating common patterns.

## Feature Development

A complete workflow for implementing features:

```typescript
import { defineWorkflow, nodes } from '@sys/graph';

interface FeatureContext {
  request: string;
  plan?: { tasks: string[] };
  currentTask?: string;
  completedTasks: string[];
  allTasksDone: boolean;
}

export default defineWorkflow<FeatureContext>({
  id: 'feature-development',

  initialState: {
    context: {
      request: '',
      completedTasks: [],
      allTasksDone: false,
    },
  },

  nodes: {
    PLAN: nodes.AgentNode({
      role: 'architect',
      system: `You are a Tech Lead. Analyze the feature request and create a task plan.
Output JSON: { "tasks": ["task1", "task2", ...] }`,
      tools: ['list_files', 'read_file'],
      then: 'IMPLEMENT',
    }),

    IMPLEMENT: nodes.AgentNode({
      role: 'builder',
      system: 'Implement the current task from the plan.',
      tools: ['write_file', 'read_file', 'bash'],
      then: (state) => (state.context.allTasksDone ? 'TEST' : 'IMPLEMENT'),
    }),

    TEST: nodes.CommandNode({
      command: 'bun test',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'COMMIT';
        }
        return 'FIX';
      },
    }),

    FIX: nodes.AgentNode({
      role: 'debugger',
      system: 'Fix the failing tests based on the error output.',
      tools: ['read_file', 'write_file'],
      then: 'TEST',
    }),

    COMMIT: nodes.SlashCommandNode({
      command: 'commit',
      args: 'Implement feature with passing tests',
      then: 'END',
    }),
  },
});
```

## Bug Fix Workflow

Systematic approach to fixing bugs:

```typescript
import { defineWorkflow, nodes } from '@sys/graph';

interface BugFixContext {
  bugId: string;
  description: string;
  reproduced: boolean;
  fixed: boolean;
}

export default defineWorkflow<BugFixContext>({
  id: 'bug-fix',

  nodes: {
    REPRODUCE: nodes.AgentNode({
      role: 'debugger',
      system: `Analyze the bug report and create a reproduction test.
Write a failing test that demonstrates the bug.`,
      tools: ['read_file', 'write_file', 'bash'],
      then: 'FIX',
    }),

    FIX: nodes.AgentNode({
      role: 'developer',
      system: 'Fix the bug. The reproduction test should pass after your fix.',
      tools: ['read_file', 'write_file'],
      then: 'VERIFY',
    }),

    VERIFY: nodes.CommandNode({
      command: 'bun test --grep "bug-"',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'COMMIT';
        }
        return 'FIX';
      },
    }),

    COMMIT: nodes.SlashCommandNode({
      command: 'commit',
      args: 'Fix bug with regression test',
      then: 'END',
    }),
  },
});
```

## Code Review Pipeline

Automated code review with AI:

```typescript
import { defineWorkflow, nodes } from '@sys/graph';

interface ReviewContext {
  prNumber: number;
  files?: string[];
  feedback?: string;
  approved: boolean;
}

export default defineWorkflow<ReviewContext>({
  id: 'code-review',

  nodes: {
    FETCH_PR: nodes.CommandNode({
      command: 'gh pr view --json files,body',
      then: 'ANALYZE',
    }),

    ANALYZE: nodes.AgentNode({
      role: 'reviewer',
      system: `You are a senior code reviewer. Analyze the PR changes.
Focus on:
- Code quality and best practices
- Potential bugs or security issues
- Test coverage
- Documentation

Provide constructive feedback.`,
      tools: ['read_file', 'list_files'],
      then: 'COMMENT',
    }),

    COMMENT: nodes.CommandNode({
      command: 'gh pr comment --body "$REVIEW_COMMENT"',
      then: (state) => {
        if (state.context.approved) {
          return 'APPROVE';
        }
        return 'END';
      },
    }),

    APPROVE: nodes.CommandNode({
      command: 'gh pr review --approve',
      then: 'END',
    }),
  },
});
```

## GitHub Projects Integration

Workflow with status tracking:

```typescript
import { defineWorkflow, nodes } from '@sys/graph';

interface IssueContext {
  issueNumber: number;
  title: string;
}

const projectConfig = {
  token: process.env.GITHUB_TOKEN!,
  projectOwner: 'my-org',
  projectNumber: 1,
  owner: 'my-org',
  repo: 'my-app',
  issueNumberKey: 'issueNumber',
};

export default defineWorkflow<IssueContext>({
  id: 'issue-workflow',

  nodes: {
    START: nodes.GitHubProjectNode({
      ...projectConfig,
      status: 'In Progress',
      then: 'IMPLEMENT',
    }),

    IMPLEMENT: nodes.AgentNode({
      role: 'developer',
      system: 'Implement the feature described in the issue.',
      tools: ['read_file', 'write_file', 'bash'],
      then: 'TEST',
    }),

    TEST: nodes.CommandNode({
      command: 'bun test',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'REVIEW';
        }
        return 'FIX';
      },
    }),

    FIX: nodes.AgentNode({
      role: 'debugger',
      system: 'Fix the failing tests.',
      tools: ['read_file', 'write_file'],
      then: 'TEST',
    }),

    REVIEW: nodes.GitHubProjectNode({
      ...projectConfig,
      status: 'In Review',
      then: 'CREATE_PR',
    }),

    CREATE_PR: nodes.CommandNode({
      command: 'gh pr create --fill',
      then: 'DONE',
    }),

    DONE: nodes.GitHubProjectNode({
      ...projectConfig,
      status: 'Done',
      then: 'END',
    }),
  },
});
```

## Deployment Pipeline

Multi-stage deployment with rollback:

```typescript
import { defineWorkflow, nodes } from '@sys/graph';

interface DeployContext {
  environment: 'staging' | 'production';
  version: string;
  previousVersion?: string;
  deployedAt?: string;
}

export default defineWorkflow<DeployContext>({
  id: 'deployment',

  nodes: {
    BUILD: nodes.CommandNode({
      command: 'bun run build',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'TEST';
        }
        return 'BUILD_FAILED';
      },
    }),

    TEST: nodes.CommandNode({
      command: 'bun test',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'DEPLOY';
        }
        return 'TEST_FAILED';
      },
    }),

    DEPLOY: nodes.CommandNode({
      command: 'railway deploy',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'VERIFY';
        }
        return 'ROLLBACK';
      },
    }),

    VERIFY: nodes.CommandNode({
      command: 'curl -f https://api.example.com/health',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'SUCCESS';
        }
        return 'ROLLBACK';
      },
    }),

    ROLLBACK: nodes.AgentNode({
      role: 'deployer',
      system: 'Rollback to the previous version.',
      tools: ['bash'],
      then: 'FAILED',
    }),

    SUCCESS: nodes.SlashCommandNode({
      command: 'commit',
      args: 'Deployment successful',
      then: 'END',
    }),

    BUILD_FAILED: nodes.AgentNode({
      role: 'analyst',
      system: 'Analyze build failure and suggest fixes.',
      tools: ['read_file'],
      then: 'END',
    }),

    TEST_FAILED: nodes.AgentNode({
      role: 'analyst',
      system: 'Analyze test failures and suggest fixes.',
      tools: ['read_file'],
      then: 'END',
    }),

    FAILED: nodes.SlashCommandNode({
      command: 'commit',
      args: 'Deployment failed - rolled back',
      then: 'END',
    }),
  },
});
```

## Custom Tools Example

Workflow with custom inline tools:

```typescript
import { defineWorkflow, nodes } from '@sys/graph';
import { z } from 'zod';

interface AnalysisContext {
  filePath: string;
  metrics?: {
    complexity: number;
    lines: number;
    functions: number;
  };
}

export default defineWorkflow<AnalysisContext>({
  id: 'code-analysis',

  nodes: {
    ANALYZE: nodes.AgentNode({
      role: 'analyzer',
      system: 'Analyze the code structure and quality.',
      tools: [
        'read_file',
        {
          name: 'calculate_complexity',
          description: 'Calculate cyclomatic complexity of a file',
          schema: z.object({
            filePath: z.string(),
          }),
          execute: async ({ filePath }) => {
            // Custom complexity calculation
            const content = await Bun.file(filePath).text();
            const complexity = countBranches(content);
            return { complexity };
          },
        },
        {
          name: 'count_functions',
          description: 'Count functions in a file',
          schema: z.object({
            filePath: z.string(),
          }),
          execute: async ({ filePath }) => {
            const content = await Bun.file(filePath).text();
            const functions = countFunctions(content);
            return { count: functions };
          },
        },
      ],
      then: 'REPORT',
    }),

    REPORT: nodes.AgentNode({
      role: 'reporter',
      system: 'Generate a code quality report based on the analysis.',
      tools: ['write_file'],
      then: 'END',
    }),
  },
});
```

## Running Examples

```bash
# Run a workflow
bun run workflow feature-development --request "Add user auth"

# Resume an interrupted workflow
bun run workflow feature-development

# Reset and start fresh
bun run workflow feature-development --reset
```
