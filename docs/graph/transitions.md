---
layout: default
title: Transitions
parent: Graph Workflow Engine
nav_order: 4
description: 'Routing between workflow nodes'
---

# Transitions

Transitions determine the flow between nodes in your workflow. All transitions are functions that return the next node name.

## Basic Transitions

Use arrow functions for simple, static transitions:

```typescript
schema.agent('PLAN', {
  role: 'planner',
  prompt: 'Create a plan.',
  then: () => 'IMPLEMENT',  // Always go to IMPLEMENT
});
```

## Dynamic Transitions

For conditional routing, use the `state` parameter:

```typescript
schema.command('TEST', {
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
type Transition<TNodeNames, TContext> =
  (state: WorkflowState<TContext>) => TNodeNames | SpecialNode;
```

## SpecialNode Enum

The `SpecialNode` enum provides typed terminal states:

```typescript
import { SpecialNode } from '@sys/graph';

enum SpecialNode {
  /** Workflow terminates successfully */
  End = 'END',

  /** Workflow terminates with error state */
  Error = 'ERROR',
}
```

### Using SpecialNode

```typescript
// Successful completion
schema.command('FINALIZE', {
  command: 'git push',
  then: () => SpecialNode.End,
});

// Error termination
schema.eval('CHECK_CRITICAL', {
  update: (state) => ({ ... }),
  then: (state) => {
    if (state.context.criticalFailure) {
      return SpecialNode.Error;  // Workflow fails
    }
    return 'CONTINUE';
  },
});
```

The engine handles these differently:
- `SpecialNode.End` → `status: WorkflowStatus.Completed`
- `SpecialNode.Error` → `status: WorkflowStatus.Failed`

## Starting Node

The first defined node in the array is the entry point:

```typescript
nodes: [
  schema.command('INIT', { ... }),    // This is the starting node
  schema.agent('PROCESS', { ... }),
  schema.command('DONE', { ... }),
]
```

## Transition Patterns

### Linear Flow

Simple sequential execution:

```typescript
nodes: [
  schema.command('STEP_1', { command: 'setup', then: () => 'STEP_2' }),
  schema.agent('STEP_2', { role: 'worker', then: () => 'STEP_3' }),
  schema.command('STEP_3', { command: 'cleanup', then: () => SpecialNode.End }),
]
```

### Conditional Branching

Route based on results:

```typescript
nodes: [
  schema.command('BUILD', {
    command: 'bun build',
    then: (state) => {
      if (state.context.lastCommandResult?.success) {
        return 'TEST';
      }
      return 'FIX_BUILD';
    },
  }),

  schema.agent('FIX_BUILD', {
    role: 'debugger',
    prompt: 'Fix the build errors.',
    then: () => 'BUILD',  // Loop back
  }),

  schema.command('TEST', { command: 'bun test', then: () => SpecialNode.End }),
]
```

### Multi-way Branching

Multiple possible outcomes:

```typescript
schema.agent('ANALYZE', {
  role: 'analyzer',
  prompt: 'Classify the issue type.',
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
```

### Loop with Counter

Limit iterations:

```typescript
interface MyContext {
  retryCount: number;
  maxRetries: number;
}

nodes: [
  schema.command('ATTEMPT', {
    command: 'deploy.sh',
    then: (state) => {
      if (state.context.lastCommandResult?.success) {
        return 'VERIFY';
      }
      if (state.context.retryCount >= state.context.maxRetries) {
        return SpecialNode.Error;  // Give up after max retries
      }
      return 'INCREMENT_RETRY';
    },
  }),

  schema.eval('INCREMENT_RETRY', {
    update: (state) => ({ retryCount: state.context.retryCount + 1 }),
    then: () => 'ATTEMPT',
  }),

  schema.command('VERIFY', { command: 'verify.sh', then: () => SpecialNode.End }),
]
```

### Error Recovery

Handle failures gracefully:

```typescript
schema.command('RISKY_OPERATION', {
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
    return SpecialNode.Error;  // Unrecoverable error
  },
}),

schema.agent('RECOVER', {
  role: 'recovery',
  prompt: 'Attempt to recover from the error.',
  then: () => 'RISKY_OPERATION',
}),

schema.command('SUCCESS', { command: 'celebrate.sh', then: () => SpecialNode.End }),
```

## Best Practices

### 1. Use Arrow Functions for Static Transitions

```typescript
// Good: clear intent, consistent style
then: () => 'NEXT_NODE'

// Also good for conditional
then: (state) => state.context.done ? SpecialNode.End : 'CONTINUE'
```

### 2. Use Descriptive Node Names

```typescript
// Good
nodes: [
  schema.eval('VALIDATE_INPUT', ...),
  schema.agent('TRANSFORM_DATA', ...),
  schema.command('SAVE_RESULTS', ...),
]

// Avoid
nodes: [
  schema.eval('STEP_1', ...),
  schema.agent('STEP_2', ...),
  schema.command('STEP_3', ...),
]
```

### 3. Guard Against Missing Data

```typescript
then: (state) => {
  // Defensive check
  const result = state.context.lastCommandResult;
  if (!result) {
    return SpecialNode.Error;
  }
  return result.success ? 'NEXT' : 'RETRY';
}
```

### 4. Keep Transitions Pure

```typescript
// Good: pure function, no side effects
then: (state) => state.context.done ? SpecialNode.End : 'CONTINUE'

// Avoid: side effects in transition
then: (state) => {
  console.log('Transitioning...');  // Side effect
  state.context.visited = true;      // Mutation
  return 'NEXT';
}
```

### 5. Document Complex Logic

```typescript
then: (state) => {
  // Priority order:
  // 1. Critical errors -> immediate failure
  // 2. Recoverable errors -> retry up to 3 times
  // 3. Success -> continue
  const result = state.context.lastCommandResult;

  if (result?.stderr?.includes('CRITICAL')) {
    return SpecialNode.Error;
  }

  if (!result?.success && state.context.retryCount < 3) {
    return 'RETRY';
  }

  return result?.success ? 'CONTINUE' : SpecialNode.Error;
}
```
