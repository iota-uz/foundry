---
layout: default
title: API v2 (Schema-Based)
parent: Graph Workflow Engine
nav_order: 7
description: 'Type-safe schema-based workflow API with compile-time validation'
---

# API v2 (Schema-Based)

The v2 API provides **compile-time type safety** for workflow definitions. Transitions are validated by TypeScript before your code even runs.

## Why v2?

| Feature | v1 (Legacy) | v2 (Schema-Based) |
|---------|-------------|-------------------|
| **Transition Validation** | Runtime only | Compile-time |
| **Node Definition** | Map (keys as names) | Array (names in objects) |
| **Entry Point** | Implicit (alphabetical) | Explicit (first in array) |
| **Tool References** | String literals | Enum values |
| **Property Names** | `system`, `next`, `tools` | `prompt`, `then`, `capabilities` |

## Quick Start

```typescript
import { defineNodes, defineWorkflow, StdlibTool, AgentModel } from '@sys/graph';

// 1. Define your context type
interface MyContext extends Record<string, unknown> {
  tasksDone: boolean;
  testsPassed: boolean;
}

// 2. Create a schema with all node names
const schema = defineNodes<MyContext>()([
  'PLAN',
  'IMPLEMENT',
  'TEST',
  'COMMIT'
] as const);

// 3. Define the workflow
export default defineWorkflow({
  id: 'feature-dev',
  schema,
  initialContext: {
    tasksDone: false,
    testsPassed: false,
  },
  nodes: [
    // First node is the entry point
    schema.agent('PLAN', {
      role: 'architect',
      prompt: 'Create a development plan for the request.',
      capabilities: [StdlibTool.ReadFile, StdlibTool.ListFiles],
      model: AgentModel.Sonnet,
      then: 'IMPLEMENT',  // TypeScript validates this!
    }),

    schema.agent('IMPLEMENT', {
      role: 'developer',
      prompt: 'Implement the planned tasks.',
      capabilities: [StdlibTool.ReadFile, StdlibTool.WriteFile],
      then: (state) => state.context.tasksDone ? 'TEST' : 'IMPLEMENT',
    }),

    schema.command('TEST', {
      command: 'bun test',
      then: (state) => state.context.testsPassed ? 'COMMIT' : 'IMPLEMENT',
    }),

    schema.slashCommand('COMMIT', {
      command: 'commit',
      args: 'Implement feature with tests',
      then: 'END',  // END is always valid
    }),
  ],
});
```

## Core Concepts

### 1. Schema Definition

The schema defines all valid node names upfront, enabling TypeScript to validate transitions:

```typescript
// The `as const` is required for literal type inference
const schema = defineNodes<MyContext>()(['NODE_A', 'NODE_B', 'NODE_C'] as const);

// TypeScript now knows the valid transitions are: 'NODE_A' | 'NODE_B' | 'NODE_C' | 'END'
```

### 2. Node Factories

Each schema provides factory methods for creating nodes:

| Method | Purpose |
|--------|---------|
| `schema.agent()` | AI-powered node with Claude SDK |
| `schema.command()` | Shell command execution |
| `schema.slashCommand()` | Claude Code slash commands |
| `schema.eval()` | Pure context transformation (no LLM) |
| `schema.dynamicAgent()` | Runtime-configured AI node |
| `schema.dynamicCommand()` | Runtime-configured shell command |

### 3. Entry Point

The **first node in the array** is the entry point. No need to specify it separately:

```typescript
nodes: [
  schema.agent('START', { ... }),  // This is the entry point
  schema.agent('MIDDLE', { ... }),
  schema.command('END_NODE', { ... }),
]
```

### 4. Type-Safe Transitions

Transitions are validated at compile time:

```typescript
schema.agent('PLAN', {
  // ...
  then: 'IMPLEMENT',     // ✅ Valid - IMPLEMENT is in schema
  then: 'INVALID_NODE',  // ❌ TypeScript error!
  then: 'END',           // ✅ Valid - END is always allowed
})
```

Dynamic transitions also benefit from type checking:

```typescript
schema.agent('PROCESS', {
  // ...
  then: (state): 'TEST' | 'RETRY' | 'END' => {
    if (state.context.success) return 'TEST';
    if (state.context.retries < 3) return 'RETRY';
    return 'END';
  }
})
```

---

## Enums

### NodeType

Discriminator for node types:

```typescript
import { NodeType } from '@sys/graph';

NodeType.Agent        // 'agent'
NodeType.Command      // 'command'
NodeType.SlashCommand // 'slash-command'
NodeType.Eval         // 'eval'
NodeType.DynamicAgent // 'dynamic-agent'
NodeType.DynamicCommand // 'dynamic-command'
```

### StdlibTool

Standard library tools for AI agents:

```typescript
import { StdlibTool } from '@sys/graph';

// File System
StdlibTool.ReadFile       // 'read_file'
StdlibTool.WriteFile      // 'write_file'
StdlibTool.ListFiles      // 'list_files'
StdlibTool.EditFile       // 'edit_file'

// Code Search
StdlibTool.SearchCode     // 'search_code'
StdlibTool.GlobFiles      // 'glob_files'

// Shell
StdlibTool.Bash           // 'bash'

// Git
StdlibTool.GitStatus      // 'git_status'
StdlibTool.GitDiff        // 'git_diff'

// Web
StdlibTool.WebFetch       // 'web_fetch'
StdlibTool.WebSearch      // 'web_search'
```

### AgentModel

Model selection for AI nodes:

```typescript
import { AgentModel } from '@sys/graph';

AgentModel.Haiku   // Fast, cost-effective
AgentModel.Sonnet  // Balanced (default)
AgentModel.Opus    // Most capable
```

### WorkflowStatus

Workflow execution status:

```typescript
import { WorkflowStatus } from '@sys/graph';

WorkflowStatus.Pending    // Not started
WorkflowStatus.Running    // Executing
WorkflowStatus.Completed  // Finished successfully
WorkflowStatus.Failed     // Error occurred
WorkflowStatus.Paused     // Paused, can resume
```

---

## Node Types

### Agent Node

AI-powered execution with Claude SDK:

```typescript
schema.agent('NODE_NAME', {
  role: string;           // Required: Role for logging
  prompt: string;         // Required: System prompt
  capabilities?: ToolReference[];  // Optional: Available tools
  model?: AgentModel;     // Optional: Model selection (default: Sonnet)
  maxTurns?: number;      // Optional: Max conversation turns
  temperature?: number;   // Optional: Generation temperature (0-1)
  then: Transition;       // Required: Next node
})
```

### Command Node

Shell command execution:

```typescript
schema.command('NODE_NAME', {
  command: string;        // Required: Shell command
  cwd?: string;           // Optional: Working directory
  env?: Record<string, string>;  // Optional: Environment variables
  timeout?: number;       // Optional: Timeout in ms
  throwOnError?: boolean; // Optional: Throw on non-zero exit
  then: Transition;       // Required: Next node
})
```

### SlashCommand Node

Claude Code slash commands:

```typescript
schema.slashCommand('NODE_NAME', {
  command: string;        // Required: Command without /
  args: string;           // Required: Command arguments
  then: Transition;       // Required: Next node
})
```

### Eval Node

Pure context transformation (no LLM):

```typescript
schema.eval('NODE_NAME', {
  update: (state) => Partial<Context>;  // Required: Transform function
  then: Transition;                      // Required: Next node
})
```

Example - Loop counter:

```typescript
schema.eval('INCREMENT', {
  update: (state) => ({
    counter: state.context.counter + 1,
  }),
  then: (state) => state.context.counter < 5 ? 'INCREMENT' : 'DONE',
})
```

### DynamicAgent Node

Runtime-configured AI agent:

```typescript
schema.dynamicAgent('NODE_NAME', {
  model: Dynamic<AgentModel>;    // Required: Static or dynamic
  prompt: Dynamic<string>;       // Required: Static or dynamic
  system?: Dynamic<string>;      // Optional: System prompt
  capabilities?: Dynamic<ToolReference[]>;  // Optional
  maxTurns?: Dynamic<number>;    // Optional
  temperature?: Dynamic<number>; // Optional
  then: Transition;              // Required: Next node
})
```

Example - Task executor:

```typescript
schema.dynamicAgent('EXECUTE_TASK', {
  model: (state) => state.context.currentTask.complexity === 'high'
    ? AgentModel.Opus
    : AgentModel.Haiku,
  prompt: (state) => state.context.currentTask.instructions,
  then: 'NEXT_TASK',
})
```

### DynamicCommand Node

Runtime-configured shell command:

```typescript
schema.dynamicCommand('NODE_NAME', {
  command: Dynamic<string>;      // Required: Static or dynamic
  cwd?: Dynamic<string>;         // Optional
  env?: Dynamic<Record<string, string>>;  // Optional
  timeout?: Dynamic<number>;     // Optional
  then: Transition;              // Required: Next node
})
```

---

## Inline Tools

Define custom tools with Zod schema validation:

```typescript
import { z } from 'zod';
import type { InlineTool } from '@sys/graph';

const runTestsTool: InlineTool<{ pattern: string }> = {
  name: 'run_tests',
  description: 'Run tests matching a pattern',
  schema: z.object({
    pattern: z.string().describe('Test file glob pattern'),
  }),
  execute: async (args) => {
    const result = await runTests(args.pattern);
    return { success: result.passed, failures: result.failures };
  },
};

// Use in agent node
schema.agent('TEST', {
  role: 'tester',
  prompt: 'Run the tests.',
  capabilities: [StdlibTool.ReadFile, runTestsTool],
  then: 'END',
})
```

---

## Helper Functions

### createInitialWorkflowState

Create the initial state for workflow execution:

```typescript
import { createInitialWorkflowState } from '@sys/graph';

const workflow = defineWorkflow({ ... });
const initialState = createInitialWorkflowState(workflow);

// initialState has:
// - currentNode: first node name
// - status: 'pending'
// - updatedAt: current ISO timestamp
// - conversationHistory: []
// - context: workflow.initialContext or {}
```

### resolveDynamic

Resolve a dynamic value (static or function):

```typescript
import { resolveDynamic } from '@sys/graph';

const dynamicValue: Dynamic<string, MyContext> = (state) => state.context.name;
const resolved = resolveDynamic(dynamicValue, currentState);
```

---

## Validation

### Three-Layer Validation

1. **Compile-time**: TypeScript validates transitions against schema
2. **Load-time**: Zod schemas validate structure when workflow is loaded
3. **Runtime**: Dynamic transition results are validated during execution

### Validation Functions

```typescript
import {
  validateWorkflow,
  validateNode,
  validateComplete,
  validateSemantics
} from '@sys/graph';

// Validate workflow structure
const result = validateWorkflow(config, ['NODE_A', 'NODE_B']);
if (!result.success) {
  console.error('Errors:', result.errors);
}

// Complete validation (structure + semantics)
const fullResult = validateComplete(config, nodeNames);
```

### ValidationError

```typescript
interface ValidationError {
  path: string[];    // e.g., ['nodes', '0', 'then']
  message: string;   // Human-readable error
  code: string;      // Error code
}
```

---

## Migration from v1

### Property Renames

| v1 (Legacy) | v2 (Schema-Based) |
|-------------|-------------------|
| `system` | `prompt` |
| `next` | `then` |
| `tools` | `capabilities` |
| `fn` (EvalNode) | `update` |

### Structure Changes

**v1 (Map-based):**
```typescript
defineWorkflow({
  id: 'my-workflow',
  nodes: {
    PLAN: nodes.AgentNode({
      system: 'Plan the work',
      tools: ['read_file'],
      next: 'IMPLEMENT',
    }),
  },
})
```

**v2 (Array-based):**
```typescript
const schema = defineNodes<MyContext>()(['PLAN', 'IMPLEMENT'] as const);

defineWorkflow({
  id: 'my-workflow',
  schema,
  nodes: [
    schema.agent('PLAN', {
      role: 'planner',
      prompt: 'Plan the work',
      capabilities: [StdlibTool.ReadFile],
      then: 'IMPLEMENT',
    }),
  ],
})
```

### Imports

**v1:**
```typescript
import { defineWorkflow, nodes } from '@sys/graph';
```

**v2:**
```typescript
import {
  defineNodes,
  defineWorkflow,
  StdlibTool,
  AgentModel
} from '@sys/graph';
```

---

## Complete Example

```typescript
import { z } from 'zod';
import {
  defineNodes,
  defineWorkflow,
  StdlibTool,
  AgentModel,
  createInitialWorkflowState,
  type InlineTool,
  type WorkflowState,
} from '@sys/graph';

// Context type
interface FeatureContext extends Record<string, unknown> {
  issueId: number;
  plan?: { tasks: string[]; estimatedHours: number };
  allTasksDone: boolean;
  testsPassed: boolean;
  fixAttempts: number;
}

// Custom tool
const runTestsTool: InlineTool<{ pattern: string }> = {
  name: 'run_tests',
  description: 'Run test suite',
  schema: z.object({ pattern: z.string() }),
  execute: async ({ pattern }) => ({ success: true, pattern }),
};

// Schema with all nodes
const schema = defineNodes<FeatureContext>()([
  'PLAN',
  'IMPLEMENT',
  'TEST',
  'FIX',
  'COMMIT',
] as const);

// Type alias for transitions
type NodeName = typeof schema.names[number];

// Workflow definition
export const workflow = defineWorkflow({
  id: 'feature-development',
  schema,
  initialContext: {
    issueId: 0,
    allTasksDone: false,
    testsPassed: false,
    fixAttempts: 0,
  },
  nodes: [
    schema.agent('PLAN', {
      role: 'architect',
      prompt: 'Analyze the issue and create a development plan.',
      capabilities: [StdlibTool.ReadFile, StdlibTool.SearchCode],
      model: AgentModel.Sonnet,
      then: 'IMPLEMENT',
    }),

    schema.agent('IMPLEMENT', {
      role: 'developer',
      prompt: 'Implement the planned tasks.',
      capabilities: [StdlibTool.ReadFile, StdlibTool.WriteFile, runTestsTool],
      then: (state): NodeName | 'END' =>
        state.context.allTasksDone ? 'TEST' : 'IMPLEMENT',
    }),

    schema.command('TEST', {
      command: 'bun test',
      then: (state): NodeName | 'END' =>
        state.context.testsPassed ? 'COMMIT' : 'FIX',
    }),

    schema.eval('FIX', {
      update: (state) => ({
        fixAttempts: state.context.fixAttempts + 1
      }),
      then: (state): NodeName | 'END' =>
        state.context.fixAttempts >= 3 ? 'END' : 'IMPLEMENT',
    }),

    schema.slashCommand('COMMIT', {
      command: 'commit',
      args: 'Implement feature with passing tests',
      then: 'END',
    }),
  ],
});

// Create initial state
const initialState = createInitialWorkflowState(workflow);
```
