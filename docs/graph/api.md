---
layout: default
title: API Reference
parent: Graph Workflow Engine
nav_order: 7
description: 'Type-safe schema-based workflow API with compile-time validation'
---

# API Reference

The Graph API provides **compile-time type safety** for workflow definitions. Transitions are validated by TypeScript before your code even runs.

## Key Features

| Feature | Description |
|---------|-------------|
| **Transition Validation** | Compile-time TypeScript validation |
| **Node Definition** | Array-based with names in objects |
| **Entry Point** | First node in array |
| **Tool References** | Type-safe enum values |

## Quick Start

```typescript
import { defineNodes, defineWorkflow, StdlibTool, AgentModel, SpecialNode } from '@sys/graph';

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
      capabilities: [StdlibTool.Read, StdlibTool.Glob],
      model: AgentModel.Sonnet,
      then: () => 'IMPLEMENT',  // TypeScript validates this!
    }),

    schema.agent('IMPLEMENT', {
      role: 'developer',
      prompt: 'Implement the planned tasks.',
      capabilities: [StdlibTool.Read, StdlibTool.Write],
      then: (state) => state.context.tasksDone ? 'TEST' : 'IMPLEMENT',
    }),

    schema.command('TEST', {
      command: 'bun test',
      then: (state) => state.context.testsPassed ? 'COMMIT' : 'IMPLEMENT',
    }),

    schema.slashCommand('COMMIT', {
      command: 'commit',
      args: 'Implement feature with tests',
      then: () => SpecialNode.End,  // Terminal state
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

// TypeScript knows valid transitions are: 'NODE_A' | 'NODE_B' | 'NODE_C' | SpecialNode
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
| `createHttpNode()` | HTTP requests with JSON I/O (factory function) |
| `createGitHubProjectNode()` | GitHub Projects V2 updates (factory function) |
| `LLMNodeRuntime` | Direct LLM calls with schema validation (runtime class) |

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

All transitions are functions. Use arrow functions for static routing:

```typescript
schema.agent('PLAN', {
  // ...
  then: () => 'IMPLEMENT',     // ✅ Valid - IMPLEMENT is in schema
  then: () => 'INVALID_NODE',  // ❌ TypeScript error!
  then: () => SpecialNode.End, // ✅ Valid - terminal state
})
```

Dynamic transitions for conditional routing:

```typescript
schema.agent('PROCESS', {
  // ...
  then: (state) => {
    if (state.context.success) return 'TEST';
    if (state.context.retries < 3) return 'RETRY';
    return SpecialNode.Error;  // Workflow fails
  }
})
```

---

## Enums

### NodeType

Discriminator for node types:

```typescript
import { NodeType } from '@sys/graph';

NodeType.Agent          // 'agent'
NodeType.Command        // 'command'
NodeType.SlashCommand   // 'slash-command'
NodeType.GitHubProject  // 'github-project'
NodeType.Eval           // 'eval'
NodeType.DynamicAgent   // 'dynamic-agent'
NodeType.DynamicCommand // 'dynamic-command'
NodeType.Http           // 'http'
NodeType.Llm            // 'llm'
```

### StdlibTool

Standard library tools for AI agents (matches Claude Agent SDK tool names):

```typescript
import { StdlibTool } from '@sys/graph';

// File System
StdlibTool.Read           // 'Read' - Read files (text, images, PDFs, notebooks)
StdlibTool.Write          // 'Write' - Write content to a file
StdlibTool.Edit           // 'Edit' - Perform string replacements in files
StdlibTool.Glob           // 'Glob' - File pattern matching
StdlibTool.Grep           // 'Grep' - Code search with ripgrep
StdlibTool.NotebookEdit   // 'NotebookEdit' - Edit Jupyter notebook cells

// Shell & System
StdlibTool.Bash           // 'Bash' - Execute shell commands
StdlibTool.BashOutput     // 'BashOutput' - Retrieve output from background shells
StdlibTool.KillBash       // 'KillBash' - Kill a running background shell

// Web & Network
StdlibTool.WebFetch       // 'WebFetch' - Fetch and process URL content
StdlibTool.WebSearch      // 'WebSearch' - Web search

// Agent & Workflow
StdlibTool.Task           // 'Task' - Launch subagents for complex tasks
StdlibTool.TodoWrite      // 'TodoWrite' - Task list management
StdlibTool.ExitPlanMode   // 'ExitPlanMode' - Exit planning mode

// MCP Integration
StdlibTool.ListMcpResources  // 'ListMcpResources' - List available MCP resources
StdlibTool.ReadMcpResource   // 'ReadMcpResource' - Read a specific MCP resource
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

### SpecialNode

Terminal states for workflow transitions:

```typescript
import { SpecialNode } from '@sys/graph';

SpecialNode.End    // Workflow terminates successfully → WorkflowStatus.Completed
SpecialNode.Error  // Workflow terminates with failure → WorkflowStatus.Failed
```

Use in transitions:

```typescript
schema.command('DEPLOY', {
  command: 'deploy.sh',
  then: (state) => {
    if (state.context.lastCommandResult?.success) {
      return SpecialNode.End;    // Success!
    }
    return SpecialNode.Error;    // Failed deployment
  },
});
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
  then: () => NodeName | SpecialNode;  // Required: Transition function
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
  then: () => NodeName | SpecialNode;  // Required: Transition function
})
```

### SlashCommand Node

Claude Code slash commands:

```typescript
schema.slashCommand('NODE_NAME', {
  command: string;        // Required: Command without /
  args: string;           // Required: Command arguments
  then: () => NodeName | SpecialNode;  // Required: Transition function
})
```

### Eval Node

Pure context transformation (no LLM):

```typescript
schema.eval('NODE_NAME', {
  update: (state) => Partial<Context>;         // Required: Transform function
  then: () => NodeName | SpecialNode;          // Required: Transition function
})
```

Example - Loop counter:

```typescript
schema.eval('INCREMENT', {
  update: (state) => ({
    counter: state.context.counter + 1,
  }),
  then: (state) => state.context.counter < 5 ? 'INCREMENT' : SpecialNode.End,
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
  then: () => NodeName | SpecialNode;  // Required: Transition function
})
```

Example - Task executor:

```typescript
schema.dynamicAgent('EXECUTE_TASK', {
  model: (state) => state.context.currentTask.complexity === 'high'
    ? AgentModel.Opus
    : AgentModel.Haiku,
  prompt: (state) => state.context.currentTask.instructions,
  then: () => 'NEXT_TASK',
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
  then: () => NodeName | SpecialNode;  // Required: Transition function
})
```

### HttpNode

HTTP requests with JSON I/O. Uses factory function instead of schema method:

```typescript
import { createHttpNode } from '@sys/graph/nodes';

createHttpNode({
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string | ((state) => string);  // Static or dynamic URL
  headers?: Record<string, string>;    // Request headers
  body?: object | ((state) => object); // Request body
  params?: Record<string, string>;     // Query parameters
  timeout?: number;                    // Default: 30000ms
  throwOnError?: boolean;              // Default: true
  resultKey?: string;                  // Default: 'lastHttpResult'
  then: () => NodeName | SpecialNode;  // Transition function
})
```

See [nodes.md#httpnode](nodes#httpnode) for full documentation.

### LLMNode

Direct LLM calls with optional schema validation. Uses runtime class:

```typescript
import { LLMNodeRuntime } from '@sys/graph/nodes';
import { z } from 'zod';

new LLMNodeRuntime({
  model: 'haiku' | 'sonnet' | 'opus';
  system: string;                      // System prompt
  prompt: string | ((state) => string);// User prompt
  outputSchema?: ZodType;              // Optional output validation
  temperature?: number;                // Default: 0
  maxTokens?: number;                  // Default: 4096
  reasoningEffort?: 'low' | 'medium' | 'high';  // Future
  resultKey?: string;                  // Default: 'lastLLMResult'
  then: () => NodeName | SpecialNode;  // Transition function
})
```

See [nodes.md#llmnode](nodes#llmnode) for full documentation.

### GitHubProjectNode

Updates GitHub Projects V2 fields. Uses factory function:

```typescript
import { createGitHubProjectNode } from '@sys/graph/nodes';

createGitHubProjectNode({
  token: string;                       // GitHub token with project scope
  projectOwner: string;                // User or organization
  projectNumber: number;               // From project URL
  owner: string;                       // Repository owner
  repo: string;                        // Repository name
  updates: FieldUpdate | FieldUpdate[];// Field updates to apply
  issueNumber?: number;                // Static issue number
  issueNumberKey?: string;             // Or read from context
  throwOnError?: boolean;              // Default: true
  resultKey?: string;                  // Default: 'lastProjectResult'
  then: () => NodeName | SpecialNode;  // Transition function
})
```

See [nodes.md#githubprojectnode](nodes#githubprojectnode) for full documentation.

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
  capabilities: [StdlibTool.Read, runTestsTool],
  then: () => SpecialNode.End,
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

## Complete Example

```typescript
import { z } from 'zod';
import {
  defineNodes,
  defineWorkflow,
  StdlibTool,
  AgentModel,
  SpecialNode,
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
      capabilities: [StdlibTool.Read, StdlibTool.Grep],
      model: AgentModel.Sonnet,
      then: () => 'IMPLEMENT',
    }),

    schema.agent('IMPLEMENT', {
      role: 'developer',
      prompt: 'Implement the planned tasks.',
      capabilities: [StdlibTool.Read, StdlibTool.Write, runTestsTool],
      then: (state): NodeName | SpecialNode =>
        state.context.allTasksDone ? 'TEST' : 'IMPLEMENT',
    }),

    schema.command('TEST', {
      command: 'bun test',
      then: (state): NodeName | SpecialNode =>
        state.context.testsPassed ? 'COMMIT' : 'FIX',
    }),

    schema.eval('FIX', {
      update: (state) => ({
        fixAttempts: state.context.fixAttempts + 1
      }),
      then: (state): NodeName | SpecialNode =>
        state.context.fixAttempts >= 3 ? SpecialNode.Error : 'IMPLEMENT',
    }),

    schema.slashCommand('COMMIT', {
      command: 'commit',
      args: 'Implement feature with passing tests',
      then: () => SpecialNode.End,
    }),
  ],
});

// Create initial state
const initialState = createInitialWorkflowState(workflow);
```
