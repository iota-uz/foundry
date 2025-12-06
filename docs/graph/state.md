---
layout: default
title: State Management
parent: Graph Workflow Engine
nav_order: 3
description: 'Workflow state, context, and persistence'
---

# State Management

The Graph Engine maintains a single state object that flows through the workflow.

## WorkflowState Structure

```typescript
interface WorkflowState<TContext> {
  currentNode: string;                    // Active FSM node
  status: 'pending' | 'running' | 'completed' | 'failed';
  updatedAt: string;                      // ISO timestamp
  conversationHistory: Message[];         // AI conversation history
  context: TContext;                      // User-defined data
}
```

## Data Flow

State flows through nodes as a single object:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WorkflowState                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ context: {                                                   │    │
│  │   // User-defined fields (persist across all nodes)         │    │
│  │   plan: { tasks: [...] },                                   │    │
│  │   allTasksDone: false,                                      │    │
│  │                                                              │    │
│  │   // Auto-populated by node types                           │    │
│  │   lastCommandResult: { exitCode, stdout, stderr },          │    │
│  │   lastSlashCommandResult: { success, output, error },       │    │
│  │   lastAgentResponse: "...",                                 │    │
│  │   lastProjectUpdate: { success, newStatus, ... }            │    │
│  │ }                                                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────┐
    │           Node Execution           │
    │                                    │
    │  1. Receives current state         │
    │  2. Performs work (AI/command)     │
    │  3. Returns partial state update   │
    │  4. Engine merges into state       │
    └───────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────┐
    │         Transition (next)          │
    │                                    │
    │  Receives updated state, returns   │
    │  next node name or 'END'           │
    └───────────────────────────────────┘
```

## Reading State

Access data from previous nodes via `state.context`:

```typescript
next: (state) => {
  // Read plan created by PLAN node
  const plan = state.context.plan;

  // Read result from previous command
  const result = state.context.lastCommandResult;

  // Make routing decision
  if (result?.exitCode === 0) {
    return 'SUCCESS';
  }
  return 'FAILURE';
}
```

## Writing State

### Via Node Results

Each node type automatically stores its result:

| Node Type | Result Key | Contains |
|-----------|------------|----------|
| `AgentNode` | `lastAgentResponse` | Final agent response text |
| `CommandNode` | `lastCommandResult` | `exitCode`, `stdout`, `stderr`, `success` |
| `SlashCommandNode` | `lastSlashCommandResult` | `success`, `output`, `error` |
| `GitHubProjectNode` | `lastProjectUpdate` | `success`, `newStatus`, `previousStatus` |

### Via Custom Tools

AgentNodes can update context through tool results:

```typescript
tools: [{
  name: 'save_plan',
  schema: z.object({ tasks: z.array(z.string()) }),
  execute: async (args) => {
    // Tool result is available to the agent
    return { saved: true, taskCount: args.tasks.length };
  },
}]
```

## Custom Context Types

Define strongly-typed context:

```typescript
interface MyContext {
  plan?: { tasks: string[] };
  currentTask?: string;
  completedTasks: string[];
  testResults?: TestResult[];
  allTasksDone: boolean;

  // Auto-populated by nodes
  lastCommandResult?: CommandResult;
  lastSlashCommandResult?: SlashCommandResult;
  lastAgentResponse?: string;
}

const workflow = defineWorkflow<MyContext>({
  id: 'my-workflow',

  initialState: {
    context: {
      completedTasks: [],
      allTasksDone: false,
    },
  },

  nodes: { /* ... */ },
});
```

## Persistence

State is automatically saved after each node execution.

### Storage Location

```
.graph-state/
└── {workflow-id}.json    # Workflow state
```

### Resume from Checkpoint

The engine automatically resumes from the last successful node:

```typescript
// First run - starts from first node
const result1 = await engine.run('my-workflow', { context: { ... } });

// If interrupted, next run resumes from checkpoint
const result2 = await engine.run('my-workflow');
```

### Manual Reset

Clear state to start fresh:

```typescript
engine.reset('my-workflow');
```

### State File Format

```json
{
  "currentNode": "IMPLEMENT",
  "status": "running",
  "updatedAt": "2024-01-15T10:30:00Z",
  "conversationHistory": [...],
  "context": {
    "plan": { "tasks": ["task1", "task2"] },
    "completedTasks": ["task1"],
    "lastCommandResult": {
      "exitCode": 0,
      "stdout": "Build successful",
      "stderr": "",
      "success": true
    }
  }
}
```

## Best Practices

### 1. Define Complete Context Types

```typescript
// Good: explicit types for all expected fields
interface MyContext {
  input: string;
  result?: ProcessResult;
  error?: string;
}

// Avoid: loose typing
interface MyContext {
  [key: string]: unknown;
}
```

### 2. Initialize Required Fields

```typescript
defineWorkflow<MyContext>({
  initialState: {
    context: {
      completedTasks: [],  // Initialize arrays
      retryCount: 0,       // Initialize counters
    },
  },
});
```

### 3. Use Descriptive Result Keys

```typescript
// Good: specific key names
nodes.CommandNode({
  command: 'bun test',
  resultKey: 'testResult',  // Clear what this contains
});

// Avoid: generic keys
nodes.CommandNode({
  command: 'bun test',
  resultKey: 'result',  // Ambiguous
});
```

### 4. Handle Missing State

```typescript
next: (state) => {
  // Guard against missing data
  const result = state.context.lastCommandResult;
  if (!result) {
    return 'ERROR';
  }
  return result.success ? 'SUCCESS' : 'FAILURE';
}
```
