---
layout: default
title: Graph Workflow Engine
nav_order: 31
description: "FSM-based agentic workflow engine with Claude Agent SDK integration"
---

# Graph Workflow Engine

A stateful, FSM-based workflow engine for building AI-driven software development pipelines with full checkpoint/resume capabilities.

## Overview

The Graph Engine enables you to build **multi-step AI workflows** that:

1. Define workflows as finite state machines (FSM)
2. Execute nodes sequentially with conditional transitions
3. Persist state after each node for pause/resume
4. Integrate with Claude Agent SDK for AI-powered nodes
5. Support shell commands and Claude Code operations

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     defineWorkflow() DSL                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Graph Engine                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ State       │    │ Node        │    │ Transition  │         │
│  │ Manager     │◀──▶│ Executor    │◀──▶│ Resolver    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                                     │
│         ▼                  ▼                                     │
│  ┌─────────────┐    ┌─────────────────────────────────┐         │
│  │ Persistence │    │         Node Types              │         │
│  │ (.json)     │    │  ┌────────┐ ┌────────┐ ┌──────┐│         │
│  └─────────────┘    │  │ Agent  │ │Command │ │Claude││         │
│                     │  │  Node  │ │  Node  │ │ Code ││         │
│                     │  └────────┘ └────────┘ └──────┘│         │
│                     └─────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Agent SDK                              │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Define a Workflow

```typescript
import { defineWorkflow, nodes } from '@sys/graph';

export default defineWorkflow({
  id: 'feature-development',

  nodes: {
    PLAN: nodes.AgentNode({
      role: 'architect',
      system: 'You are a Tech Lead. Analyze the request and output a JSON plan.',
      tools: ['list_files', 'read_file'],
      next: 'IMPLEMENT'
    }),

    IMPLEMENT: nodes.AgentNode({
      role: 'builder',
      system: 'You are a Senior Developer. Implement the planned tasks.',
      tools: ['write_file', 'read_file', 'bash'],
      next: (state) => state.context.allTasksDone ? 'TEST' : 'IMPLEMENT'
    }),

    TEST: nodes.CommandNode({
      command: 'bun test',
      next: (state) => state.context.testsPassed ? 'COMMIT' : 'FIX'
    }),

    FIX: nodes.AgentNode({
      role: 'debugger',
      system: 'Fix the failing tests based on the error output.',
      tools: ['read_file', 'write_file'],
      next: 'TEST'
    }),

    COMMIT: nodes.ClaudeCodeNode({
      command: 'commit',
      args: 'Implement feature with passing tests',
      next: 'END'
    })
  }
});
```

### Execute the Workflow

```typescript
import { GraphEngine } from '@sys/graph';

const engine = new GraphEngine();

// Start or resume workflow
const result = await engine.run('feature-development', {
  context: {
    request: 'Add user authentication to the API',
    allTasksDone: false,
    testsPassed: false
  }
});

console.log('Final state:', result.status);
```

## Node Types

### AgentNode

Executes Claude Agent SDK queries with tool access.

```typescript
nodes.AgentNode({
  role: 'architect',           // Role identifier
  system: 'System prompt...',  // AI instructions
  tools: ['list_files'],       // Stdlib tool names
  maxTurns: 10,                // Max conversation turns
  next: 'NEXT_NODE'            // Static or dynamic transition
})
```

**Features:**
- Full Claude Agent SDK integration
- Tool execution with Zod validation
- Conversation history persistence
- Multi-turn interactions

### CommandNode

Executes shell commands.

```typescript
nodes.CommandNode({
  command: 'bun test',         // Shell command to run
  next: (state) => {           // Dynamic transition
    return state.context.exitCode === 0 ? 'SUCCESS' : 'FAILURE';
  }
})
```

**Features:**
- Captures stdout/stderr
- Exit code in context
- Timeout support

### ClaudeCodeNode

Invokes Claude Code slash commands.

```typescript
nodes.ClaudeCodeNode({
  command: 'edit',             // Claude Code command
  args: 'Add error handling',  // Command arguments
  next: 'END'
})
```

**Supported commands:**
- `/edit` - Edit files
- `/commit` - Git commit
- `/test` - Run tests
- And more...

## State Management

### Workflow State

```typescript
interface WorkflowState<TContext> {
  currentNode: string;                    // Current FSM node
  status: 'pending' | 'running' | 'completed' | 'failed';
  updatedAt: string;                      // ISO timestamp
  conversationHistory: Message[];         // Full chat history
  context: TContext;                      // User-defined data
}
```

### Persistence

State is automatically saved after each node execution:

```
.graph-state/
└── feature-development.json    # Workflow state
```

**Resume from checkpoint:**

```typescript
// Automatically resumes from last successful node
const result = await engine.run('feature-development');
```

### Custom Context

Define your own context type:

```typescript
interface MyContext {
  plan: TaskPlan;
  completedTasks: string[];
  testResults: TestResult[];
  allTasksDone: boolean;
}

const workflow = defineWorkflow<MyContext>({
  id: 'my-workflow',
  initialState: {
    context: {
      plan: null,
      completedTasks: [],
      testResults: [],
      allTasksDone: false
    }
  },
  nodes: { /* ... */ }
});
```

## Transitions

### Static Transitions

```typescript
next: 'NEXT_NODE'  // Always go to NEXT_NODE
```

### Dynamic Transitions

```typescript
next: (state) => {
  if (state.context.error) return 'ERROR_HANDLER';
  if (state.context.done) return 'END';
  return 'CONTINUE';
}
```

### Special Nodes

- `'END'` - Terminal node, completes workflow
- Starting node is the first defined node

## Custom Tools

### Inline Tool Definition

```typescript
import { z } from 'zod';

nodes.AgentNode({
  role: 'analyzer',
  system: 'Analyze the codebase structure.',
  tools: [
    // Stdlib tool
    'list_files',

    // Custom inline tool
    {
      name: 'analyze_complexity',
      description: 'Analyze code complexity metrics',
      schema: z.object({
        filePath: z.string(),
        threshold: z.number().optional()
      }),
      execute: async ({ filePath, threshold }) => {
        // Custom implementation
        return { complexity: 42, exceeds: false };
      }
    }
  ],
  next: 'REPORT'
})
```

### Tool Schema Validation

Tools use Zod for input validation:

```typescript
{
  name: 'create_file',
  schema: z.object({
    path: z.string().min(1),
    content: z.string(),
    overwrite: z.boolean().default(false)
  }),
  execute: async (args) => {
    // args is fully typed and validated
    await writeFile(args.path, args.content);
    return { success: true };
  }
}
```

## Error Handling

### Node-Level Retries

```typescript
nodes.AgentNode({
  role: 'builder',
  system: '...',
  maxRetries: 3,           // Retry on failure
  retryDelay: 1000,        // Delay between retries (ms)
  next: 'NEXT'
})
```

### Error Transitions

```typescript
nodes.CommandNode({
  command: 'bun build',
  next: (state) => {
    if (state.context.error) {
      return 'HANDLE_ERROR';
    }
    return 'DEPLOY';
  }
})
```

### Workflow Status

```typescript
const result = await engine.run('my-workflow');

switch (result.status) {
  case 'completed':
    console.log('Success!', result.context);
    break;
  case 'failed':
    console.error('Failed at node:', result.currentNode);
    console.error('Error:', result.context.error);
    break;
}
```

## Example Workflows

### Code Review Pipeline

```typescript
defineWorkflow({
  id: 'code-review',
  nodes: {
    FETCH_PR: nodes.CommandNode({
      command: 'gh pr view --json files,body',
      next: 'ANALYZE'
    }),

    ANALYZE: nodes.AgentNode({
      role: 'reviewer',
      system: `You are a senior code reviewer. Analyze the PR changes and provide feedback.`,
      tools: ['read_file', 'list_files'],
      next: 'COMMENT'
    }),

    COMMENT: nodes.CommandNode({
      command: 'gh pr comment --body "$REVIEW_COMMENT"',
      next: 'END'
    })
  }
});
```

### Bug Fix Workflow

```typescript
defineWorkflow({
  id: 'bug-fix',
  nodes: {
    REPRODUCE: nodes.AgentNode({
      role: 'debugger',
      system: 'Analyze the bug report and create a reproduction test.',
      tools: ['read_file', 'write_file', 'bash'],
      next: 'FIX'
    }),

    FIX: nodes.AgentNode({
      role: 'developer',
      system: 'Fix the bug. The reproduction test should pass.',
      tools: ['read_file', 'write_file'],
      next: 'VERIFY'
    }),

    VERIFY: nodes.CommandNode({
      command: 'bun test --grep "bug-123"',
      next: (state) => state.context.testsPassed ? 'COMMIT' : 'FIX'
    }),

    COMMIT: nodes.ClaudeCodeNode({
      command: 'commit',
      args: 'Fix bug #123',
      next: 'END'
    })
  }
});
```

## API Reference

### GraphEngine

```typescript
class GraphEngine {
  // Run or resume a workflow
  run<T>(workflowId: string, initialState?: Partial<WorkflowState<T>>): Promise<WorkflowState<T>>;

  // Get current state without executing
  getState<T>(workflowId: string): WorkflowState<T> | null;

  // Reset workflow to initial state
  reset(workflowId: string): void;
}
```

### defineWorkflow

```typescript
function defineWorkflow<TContext>(config: {
  id: string;
  initialState?: Partial<WorkflowState<TContext>>;
  nodes: Record<string, NodeDefinition<TContext>>;
}): WorkflowConfig<TContext>;
```

### Node Helpers

```typescript
const nodes = {
  AgentNode<T>(config: AgentNodeConfig<T>): AgentNodeDefinition<T>;
  CommandNode<T>(config: CommandNodeConfig<T>): CommandNodeDefinition<T>;
  ClaudeCodeNode<T>(config: ClaudeCodeNodeConfig<T>): ClaudeCodeNodeDefinition<T>;
};
```

## Best Practices

1. **Keep nodes focused** - Each node should do one thing well
2. **Use descriptive node names** - `VALIDATE_INPUT` not `STEP_1`
3. **Handle errors explicitly** - Add error handling transitions
4. **Persist important data in context** - Don't rely on external state
5. **Use dynamic transitions** - For complex branching logic
6. **Set appropriate timeouts** - Prevent hanging workflows
7. **Test individual nodes** - Unit test node logic separately

## Comparison with Dispatch

| Feature | Dispatch | Graph Engine |
|---------|----------|--------------|
| **Purpose** | GitHub CI/CD automation | AI workflow orchestration |
| **Graph Type** | DAG (issue dependencies) | FSM (node transitions) |
| **AI Integration** | None | Claude Agent SDK |
| **Parallelization** | Matrix jobs | Sequential nodes |
| **Persistence** | Ephemeral | Full checkpoint/resume |
| **Use Case** | Manage issue queues | Build multi-step AI workflows |

## Testing

```bash
bun test src/lib/graph/__tests__
```
