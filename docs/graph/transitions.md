---
layout: default
title: Transitions
parent: Graph Workflow Engine
nav_order: 4
description: 'Routing between workflow nodes'
---

# Transitions

Transitions determine the flow between nodes in your workflow.

## Static Transitions

A fixed string specifying the next node:

```typescript
nodes.AgentNode({
  role: 'planner',
  system: 'Create a plan.',
  then: 'IMPLEMENT',  // Always go to IMPLEMENT
});
```

## Dynamic Transitions

A function that inspects state and returns the next node:

```typescript
nodes.CommandNode({
  command: 'bun test',
  then: (state) => {
    if (state.context.lastCommandResult?.exitCode === 0) {
      return 'DEPLOY';
    }
    return 'FIX_TESTS';
  },
});
```

### Type Signature

```typescript
type Transition<TContext> =
  | string
  | ((state: WorkflowState<TContext>) => string);
```

## Special Nodes

### END Node

The reserved `'END'` string terminates the workflow:

```typescript
then: 'END'  // Workflow completes successfully
```

### Starting Node

The first defined node is the entry point:

```typescript
nodes: {
  INIT: nodes.CommandNode({ ... }),    // This is the starting node
  PROCESS: nodes.AgentNode({ ... }),
  DONE: nodes.CommandNode({ ... }),
}
```

## Transition Patterns

### Linear Flow

Simple sequential execution:

```typescript
nodes: {
  STEP_1: nodes.CommandNode({ command: 'setup', then: 'STEP_2' }),
  STEP_2: nodes.AgentNode({ role: 'worker', then: 'STEP_3' }),
  STEP_3: nodes.CommandNode({ command: 'cleanup', then: 'END' }),
}
```

### Conditional Branching

Route based on results:

```typescript
nodes: {
  BUILD: nodes.CommandNode({
    command: 'bun build',
    then: (state) => {
      if (state.context.lastCommandResult?.success) {
        return 'TEST';
      }
      return 'FIX_BUILD';
    },
  }),

  FIX_BUILD: nodes.AgentNode({
    role: 'debugger',
    system: 'Fix the build errors.',
    then: 'BUILD',  // Loop back
  }),

  TEST: nodes.CommandNode({ command: 'bun test', then: 'END' }),
}
```

### Multi-way Branching

Multiple possible outcomes:

```typescript
nodes: {
  ANALYZE: nodes.AgentNode({
    role: 'analyzer',
    system: 'Classify the issue type.',
    then: (state) => {
      const type = state.context.issueType;
      switch (type) {
        case 'bug':
          return 'FIX_BUG';
        case 'feature':
          return 'IMPLEMENT_FEATURE';
        case 'docs':
          return 'UPDATE_DOCS';
        default:
          return 'MANUAL_REVIEW';
      }
    },
  }),

  FIX_BUG: nodes.AgentNode({ ... }),
  IMPLEMENT_FEATURE: nodes.AgentNode({ ... }),
  UPDATE_DOCS: nodes.AgentNode({ ... }),
  MANUAL_REVIEW: nodes.SlashCommandNode({ ... }),
}
```

### Loop with Counter

Limit iterations:

```typescript
interface MyContext {
  retryCount: number;
  maxRetries: number;
}

nodes: {
  ATTEMPT: nodes.CommandNode({
    command: 'deploy.sh',
    then: (state) => {
      if (state.context.lastCommandResult?.success) {
        return 'VERIFY';
      }
      if (state.context.retryCount >= state.context.maxRetries) {
        return 'FAILED';
      }
      return 'INCREMENT_RETRY';
    },
  }),

  INCREMENT_RETRY: nodes.AgentNode({
    role: 'counter',
    system: 'Increment retryCount in context.',
    then: 'ATTEMPT',
  }),

  VERIFY: nodes.CommandNode({ ... }),
  FAILED: nodes.SlashCommandNode({ ... }),
}
```

### Error Recovery

Handle failures gracefully:

```typescript
nodes: {
  RISKY_OPERATION: nodes.CommandNode({
    command: 'risky-script.sh',
    throwOnError: false,  // Don't throw, check in transition
    then: (state) => {
      const result = state.context.lastCommandResult;
      if (result?.success) {
        return 'SUCCESS';
      }
      if (result?.stderr?.includes('recoverable')) {
        return 'RECOVER';
      }
      return 'FATAL_ERROR';
    },
  }),

  RECOVER: nodes.AgentNode({
    role: 'recovery',
    system: 'Attempt to recover from the error.',
    then: 'RISKY_OPERATION',
  }),

  SUCCESS: nodes.CommandNode({ ... }),
  FATAL_ERROR: nodes.SlashCommandNode({ ... }),
}
```

## Best Practices

### 1. Use Descriptive Node Names

```typescript
// Good
nodes: {
  VALIDATE_INPUT: ...,
  TRANSFORM_DATA: ...,
  SAVE_RESULTS: ...,
}

// Avoid
nodes: {
  STEP_1: ...,
  STEP_2: ...,
  STEP_3: ...,
}
```

### 2. Guard Against Missing Data

```typescript
then: (state) => {
  // Defensive check
  const result = state.context.lastCommandResult;
  if (!result) {
    return 'ERROR_NO_RESULT';
  }
  return result.success ? 'NEXT' : 'RETRY';
}
```

### 3. Keep Transitions Pure

```typescript
// Good: pure function, no side effects
then: (state) => state.context.done ? 'END' : 'CONTINUE'

// Avoid: side effects in transition
then: (state) => {
  console.log('Transitioning...');  // Side effect
  state.context.visited = true;      // Mutation
  return 'NEXT';
}
```

### 4. Document Complex Logic

```typescript
then: (state) => {
  // Priority order:
  // 1. Critical errors -> immediate failure
  // 2. Recoverable errors -> retry up to 3 times
  // 3. Success -> continue
  const result = state.context.lastCommandResult;

  if (result?.stderr?.includes('CRITICAL')) {
    return 'FATAL_ERROR';
  }

  if (!result?.success && state.context.retryCount < 3) {
    return 'RETRY';
  }

  return result?.success ? 'CONTINUE' : 'GIVE_UP';
}
```
