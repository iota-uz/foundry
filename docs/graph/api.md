---
layout: default
title: API Reference
parent: Graph Workflow Engine
nav_order: 6
description: 'Complete API documentation'
---

# API Reference

Complete API documentation for the Graph Workflow Engine.

## GraphEngine

The main engine class for running workflows.

### Constructor

```typescript
const engine = new GraphEngine(config?: GraphEngineConfig);
```

#### GraphEngineConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiKey` | `string` | - | Anthropic API key for Claude SDK |
| `model` | `string` | `claude-3-5-sonnet-20241022` | Claude model to use |
| `maxRetries` | `number` | `0` | Maximum retries for failed nodes |

### Methods

#### run

Execute or resume a workflow.

```typescript
async run<T>(
  workflowId: string,
  initialState?: Partial<WorkflowState<T>>
): Promise<WorkflowState<T>>
```

**Parameters:**
- `workflowId` - Unique identifier for the workflow
- `initialState` - Optional initial state (ignored if resuming)

**Returns:** Final workflow state

**Example:**
```typescript
const result = await engine.run('my-workflow', {
  context: { input: 'data' },
});
```

#### getState

Get current state without executing.

```typescript
getState<T>(workflowId: string): WorkflowState<T> | null
```

#### reset

Reset workflow to initial state.

```typescript
reset(workflowId: string): void
```

---

## defineWorkflow

Factory function to create workflow configurations.

```typescript
function defineWorkflow<TContext>(
  config: WorkflowConfig<TContext>
): WorkflowConfig<TContext>
```

### WorkflowConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique workflow identifier |
| `initialState` | `Partial<WorkflowState<TContext>>` | No | Default state values |
| `nodes` | `Record<string, NodeDefinition<TContext>>` | Yes | Node definitions |

**Example:**
```typescript
const workflow = defineWorkflow<MyContext>({
  id: 'feature-dev',
  initialState: {
    context: { tasks: [], done: false },
  },
  nodes: {
    PLAN: nodes.AgentNode({ ... }),
    BUILD: nodes.CommandNode({ ... }),
  },
});
```

---

## Node Factory Functions

### nodes.AgentNode

```typescript
nodes.AgentNode<TContext>(config: AgentNodeConfig<TContext>)
```

#### AgentNodeConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `role` | `string` | Yes | Role identifier for logging |
| `system` | `string` | Yes | System prompt for the AI |
| `tools` | `ToolReference[]` | No | Available tools |
| `maxTurns` | `number` | No | Max conversation turns |
| `next` | `Transition<TContext>` | Yes | Next node transition |

### nodes.CommandNode

```typescript
nodes.CommandNode<TContext>(config: CommandNodeConfig<TContext>)
```

#### CommandNodeConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `command` | `string` | Yes | - | Shell command to execute |
| `cwd` | `string` | No | Current dir | Working directory |
| `env` | `Record<string, string>` | No | - | Environment variables |
| `timeout` | `number` | No | `300000` | Timeout in ms |
| `throwOnError` | `boolean` | No | `true` | Throw on non-zero exit |
| `resultKey` | `string` | No | `lastCommandResult` | Context key for result |
| `next` | `Transition<TContext>` | Yes | - | Next node transition |

### nodes.SlashCommandNode

```typescript
nodes.SlashCommandNode<TContext>(config: SlashCommandNodeConfig<TContext>)
```

#### SlashCommandNodeConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `command` | `string` | Yes | - | Command without `/` prefix |
| `args` | `string` | Yes | - | Command arguments |
| `resultKey` | `string` | No | `lastSlashCommandResult` | Context key |
| `next` | `Transition<TContext>` | Yes | - | Next node transition |

### nodes.GitHubProjectNode

```typescript
nodes.GitHubProjectNode<TContext>(config: GitHubProjectNodeConfig<TContext>)
```

#### GitHubProjectNodeConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `token` | `string` | Yes | - | GitHub token with project scope |
| `projectOwner` | `string` | Yes | - | Project owner (user/org) |
| `projectNumber` | `number` | Yes | - | Project number from URL |
| `owner` | `string` | Yes | - | Repository owner |
| `repo` | `string` | Yes | - | Repository name |
| `status` | `string` | Yes | - | Target status value |
| `issueNumber` | `number` | No | - | Static issue number |
| `issueNumberKey` | `string` | No | - | Context key for issue number |
| `throwOnError` | `boolean` | No | `true` | Throw on failure |
| `resultKey` | `string` | No | `lastProjectUpdate` | Context key |
| `verbose` | `boolean` | No | `false` | Enable detailed logging |
| `next` | `Transition<TContext>` | Yes | - | Next node transition |

---

## Types

### WorkflowState

```typescript
interface WorkflowState<TContext> {
  currentNode: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  updatedAt: string;
  conversationHistory: Message[];
  context: TContext;
}
```

### Transition

```typescript
type Transition<TContext> =
  | string
  | ((state: WorkflowState<TContext>) => string);
```

### ToolReference

```typescript
type ToolReference = string | InlineToolDefinition<unknown>;
```

### InlineToolDefinition

```typescript
interface InlineToolDefinition<TInput> {
  name: string;
  description?: string;
  schema: import('zod').ZodType<TInput>;
  execute: (args: TInput) => Promise<unknown>;
}
```

### Result Types

#### CommandResult

```typescript
interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
  duration: number;
}
```

#### SlashCommandResult

```typescript
interface SlashCommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}
```

#### GitHubProjectResult

```typescript
interface GitHubProjectResult {
  success: boolean;
  itemId?: string;
  previousStatus?: string;
  newStatus: string;
  error?: string;
}
```

---

## GraphContext

Context provided to node execution functions.

```typescript
interface GraphContext {
  agent: IAgentWrapper;
  logger: Console;
}
```

---

## Error Classes

### NodeExecutionError

```typescript
class NodeExecutionError extends Error {
  constructor(
    message: string,
    nodeName: string,
    nodeType: string,
    cause?: Error,
    details?: Record<string, unknown>
  );

  nodeName: string;
  nodeType: string;
  cause?: Error;
  details?: Record<string, unknown>;
}
```

### ConfigValidationError

```typescript
class ConfigValidationError extends Error {
  constructor(message: string, errors: string[]);

  errors: string[];
}
```
