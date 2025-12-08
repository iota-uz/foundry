---
layout: default
title: Examples
parent: Graph Workflow Engine
nav_order: 8
description: 'Complete workflow examples'
---

# Examples

Complete workflow examples demonstrating common patterns.

## Feature Development

A complete workflow for implementing features:

```typescript
import { defineNodes, defineWorkflow, StdlibTool } from '@sys/graph';

interface FeatureContext extends Record<string, unknown> {
  request: string;
  plan?: { tasks: string[] };
  currentTask?: string;
  completedTasks: string[];
  allTasksDone: boolean;
  lastCommandResult?: { exitCode: number; stdout: string; stderr: string };
}

const schema = defineNodes<FeatureContext>()([
  'PLAN',
  'IMPLEMENT',
  'TEST',
  'FIX',
  'COMMIT',
] as const);

export default defineWorkflow({
  id: 'feature-development',
  schema,
  initialContext: {
    request: '',
    completedTasks: [],
    allTasksDone: false,
  },

  nodes: [
    schema.agent('PLAN', {
      role: 'architect',
      prompt: `You are a Tech Lead. Analyze the feature request and create a task plan.
Output JSON: { "tasks": ["task1", "task2", ...] }`,
      capabilities: [StdlibTool.Glob, StdlibTool.Read],
      then: 'IMPLEMENT',
    }),

    schema.agent('IMPLEMENT', {
      role: 'builder',
      prompt: 'Implement the current task from the plan.',
      capabilities: [StdlibTool.Write, StdlibTool.Read, StdlibTool.Bash],
      then: (state) => (state.context.allTasksDone ? 'TEST' : 'IMPLEMENT'),
    }),

    schema.command('TEST', {
      command: 'bun test',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'COMMIT';
        }
        return 'FIX';
      },
    }),

    schema.agent('FIX', {
      role: 'debugger',
      prompt: 'Fix the failing tests based on the error output.',
      capabilities: [StdlibTool.Read, StdlibTool.Write],
      then: 'TEST',
    }),

    schema.slashCommand('COMMIT', {
      command: 'commit',
      args: 'Implement feature with passing tests',
      then: 'END',
    }),
  ],
});
```

## Bug Fix Workflow

Systematic approach to fixing bugs:

```typescript
import { defineNodes, defineWorkflow, StdlibTool } from '@sys/graph';

interface BugFixContext extends Record<string, unknown> {
  bugId: string;
  description: string;
  reproduced: boolean;
  fixed: boolean;
  lastCommandResult?: { exitCode: number };
}

const schema = defineNodes<BugFixContext>()([
  'REPRODUCE',
  'FIX',
  'VERIFY',
  'COMMIT',
] as const);

export default defineWorkflow({
  id: 'bug-fix',
  schema,
  initialContext: {
    bugId: '',
    description: '',
    reproduced: false,
    fixed: false,
  },

  nodes: [
    schema.agent('REPRODUCE', {
      role: 'debugger',
      prompt: `Analyze the bug report and create a reproduction test.
Write a failing test that demonstrates the bug.`,
      capabilities: [StdlibTool.Read, StdlibTool.Write, StdlibTool.Bash],
      then: 'FIX',
    }),

    schema.agent('FIX', {
      role: 'developer',
      prompt: 'Fix the bug. The reproduction test should pass after your fix.',
      capabilities: [StdlibTool.Read, StdlibTool.Write],
      then: 'VERIFY',
    }),

    schema.command('VERIFY', {
      command: 'bun test --grep "bug-"',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'COMMIT';
        }
        return 'FIX';
      },
    }),

    schema.slashCommand('COMMIT', {
      command: 'commit',
      args: 'Fix bug with regression test',
      then: 'END',
    }),
  ],
});
```

## Code Review Pipeline

Automated code review with AI:

```typescript
import { defineNodes, defineWorkflow, StdlibTool } from '@sys/graph';

interface ReviewContext extends Record<string, unknown> {
  prNumber: number;
  files?: string[];
  feedback?: string;
  approved: boolean;
  lastCommandResult?: { exitCode: number; stdout: string };
}

const schema = defineNodes<ReviewContext>()([
  'FETCH_PR',
  'ANALYZE',
  'COMMENT',
  'APPROVE',
] as const);

export default defineWorkflow({
  id: 'code-review',
  schema,
  initialContext: {
    prNumber: 0,
    approved: false,
  },

  nodes: [
    schema.command('FETCH_PR', {
      command: 'gh pr view --json files,body',
      then: 'ANALYZE',
    }),

    schema.agent('ANALYZE', {
      role: 'reviewer',
      prompt: `You are a senior code reviewer. Analyze the PR changes.
Focus on:
- Code quality and best practices
- Potential bugs or security issues
- Test coverage
- Documentation

Provide constructive feedback.`,
      capabilities: [StdlibTool.Read, StdlibTool.Glob],
      then: 'COMMENT',
    }),

    schema.command('COMMENT', {
      command: 'gh pr comment --body "$REVIEW_COMMENT"',
      then: (state) => {
        if (state.context.approved) {
          return 'APPROVE';
        }
        return 'END';
      },
    }),

    schema.command('APPROVE', {
      command: 'gh pr review --approve',
      then: 'END',
    }),
  ],
});
```

## GitHub Projects Integration

Workflow with status tracking:

```typescript
import { defineNodes, defineWorkflow, StdlibTool } from '@sys/graph';
import { createGitHubProjectNode } from '@sys/graph/nodes';

interface IssueContext extends Record<string, unknown> {
  issueNumber: number;
  title: string;
  lastCommandResult?: { exitCode: number };
}

const schema = defineNodes<IssueContext>()([
  'START',
  'IMPLEMENT',
  'TEST',
  'FIX',
  'REVIEW',
  'CREATE_PR',
  'DONE',
] as const);

const projectConfig = {
  token: process.env.GITHUB_TOKEN!,
  projectOwner: 'my-org',
  projectNumber: 1,
  owner: 'my-org',
  repo: 'my-app',
  issueNumberKey: 'issueNumber' as const,
};

export default defineWorkflow({
  id: 'issue-workflow',
  schema,
  initialContext: {
    issueNumber: 0,
    title: '',
  },

  nodes: [
    createGitHubProjectNode({
      ...projectConfig,
      updates: { type: 'single_select', field: 'Status', value: 'In Progress' },
      then: 'IMPLEMENT',
    }),

    schema.agent('IMPLEMENT', {
      role: 'developer',
      prompt: 'Implement the feature described in the issue.',
      capabilities: [StdlibTool.Read, StdlibTool.Write, StdlibTool.Bash],
      then: 'TEST',
    }),

    schema.command('TEST', {
      command: 'bun test',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'REVIEW';
        }
        return 'FIX';
      },
    }),

    schema.agent('FIX', {
      role: 'debugger',
      prompt: 'Fix the failing tests.',
      capabilities: [StdlibTool.Read, StdlibTool.Write],
      then: 'TEST',
    }),

    createGitHubProjectNode({
      ...projectConfig,
      updates: { type: 'single_select', field: 'Status', value: 'In Review' },
      then: 'CREATE_PR',
    }),

    schema.command('CREATE_PR', {
      command: 'gh pr create --fill',
      then: 'DONE',
    }),

    createGitHubProjectNode({
      ...projectConfig,
      updates: { type: 'single_select', field: 'Status', value: 'Done' },
      then: 'END',
    }),
  ],
});
```

## Deployment Pipeline

Multi-stage deployment with rollback:

```typescript
import { defineNodes, defineWorkflow, StdlibTool } from '@sys/graph';

interface DeployContext extends Record<string, unknown> {
  environment: 'staging' | 'production';
  version: string;
  previousVersion?: string;
  deployedAt?: string;
  lastCommandResult?: { exitCode: number; stdout: string; stderr: string };
}

const schema = defineNodes<DeployContext>()([
  'BUILD',
  'TEST',
  'DEPLOY',
  'VERIFY',
  'ROLLBACK',
  'SUCCESS',
  'BUILD_FAILED',
  'TEST_FAILED',
  'FAILED',
] as const);

export default defineWorkflow({
  id: 'deployment',
  schema,
  initialContext: {
    environment: 'staging',
    version: '',
  },

  nodes: [
    schema.command('BUILD', {
      command: 'bun run build',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'TEST';
        }
        return 'BUILD_FAILED';
      },
    }),

    schema.command('TEST', {
      command: 'bun test',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'DEPLOY';
        }
        return 'TEST_FAILED';
      },
    }),

    schema.command('DEPLOY', {
      command: 'railway deploy',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'VERIFY';
        }
        return 'ROLLBACK';
      },
    }),

    schema.command('VERIFY', {
      command: 'curl -f https://api.example.com/health',
      then: (state) => {
        if (state.context.lastCommandResult?.exitCode === 0) {
          return 'SUCCESS';
        }
        return 'ROLLBACK';
      },
    }),

    schema.agent('ROLLBACK', {
      role: 'deployer',
      prompt: 'Rollback to the previous version.',
      capabilities: [StdlibTool.Bash],
      then: 'FAILED',
    }),

    schema.slashCommand('SUCCESS', {
      command: 'commit',
      args: 'Deployment successful',
      then: 'END',
    }),

    schema.agent('BUILD_FAILED', {
      role: 'analyst',
      prompt: 'Analyze build failure and suggest fixes.',
      capabilities: [StdlibTool.Read],
      then: 'END',
    }),

    schema.agent('TEST_FAILED', {
      role: 'analyst',
      prompt: 'Analyze test failures and suggest fixes.',
      capabilities: [StdlibTool.Read],
      then: 'END',
    }),

    schema.slashCommand('FAILED', {
      command: 'commit',
      args: 'Deployment failed - rolled back',
      then: 'END',
    }),
  ],
});
```

## Custom Tools Example

Workflow with custom inline tools:

```typescript
import { defineNodes, defineWorkflow, StdlibTool, type InlineTool } from '@sys/graph';
import { z } from 'zod';

interface AnalysisContext extends Record<string, unknown> {
  filePath: string;
  metrics?: {
    complexity: number;
    lines: number;
    functions: number;
  };
}

// Custom tool definitions
const calculateComplexity: InlineTool<{ filePath: string }> = {
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
};

const countFunctionsTool: InlineTool<{ filePath: string }> = {
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
};

const schema = defineNodes<AnalysisContext>()([
  'ANALYZE',
  'REPORT',
] as const);

export default defineWorkflow({
  id: 'code-analysis',
  schema,
  initialContext: {
    filePath: '',
  },

  nodes: [
    schema.agent('ANALYZE', {
      role: 'analyzer',
      prompt: 'Analyze the code structure and quality.',
      capabilities: [
        StdlibTool.Read,
        calculateComplexity,
        countFunctionsTool,
      ],
      then: 'REPORT',
    }),

    schema.agent('REPORT', {
      role: 'reporter',
      prompt: 'Generate a code quality report based on the analysis.',
      capabilities: [StdlibTool.Write],
      then: 'END',
    }),
  ],
});

// Helper functions (implement as needed)
function countBranches(content: string): number {
  const branches = content.match(/if|else|switch|case|for|while|\?/g);
  return branches?.length ?? 0;
}

function countFunctions(content: string): number {
  const functions = content.match(/function\s+\w+|=>\s*{|\w+\s*\([^)]*\)\s*{/g);
  return functions?.length ?? 0;
}
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
