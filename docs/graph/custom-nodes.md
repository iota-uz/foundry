---
layout: default
title: Custom Nodes
parent: Graph Workflow Engine
nav_order: 5
description: 'Creating custom node types'
---

# Custom Nodes

Extend the Graph Engine by creating custom node types for specialized behavior.

## When to Create Custom Nodes

Create custom nodes for:

- Specialized integrations (databases, APIs, external services)
- Complex business logic that doesn't fit the agent model
- Performance-critical operations
- Custom error handling and retry strategies

## Node Interface

Every node implements the `GraphNode` interface:

```typescript
interface GraphNode<TState extends BaseState> {
  name: string;

  execute(
    state: TState,
    context: GraphContext
  ): Promise<Partial<TState>>;

  next(state: TState): string;
}
```

## Basic Custom Node

### Step 1: Define the Node Class

```typescript
import type { GraphNode, GraphContext, WorkflowState } from '@sys/graph';

interface HttpNodeConfig<TContext extends Record<string, unknown>> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  body?: Record<string, unknown>;
  resultKey: string;
  next: string | ((state: WorkflowState<TContext>) => string);
}

class HttpNode<TContext extends Record<string, unknown>>
  implements GraphNode<WorkflowState<TContext>>
{
  name: string;
  private config: HttpNodeConfig<TContext>;

  constructor(name: string, config: HttpNodeConfig<TContext>) {
    this.name = name;
    this.config = config;
  }

  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<Partial<WorkflowState<TContext>>> {
    context.logger.info(`[${this.name}] Fetching ${this.config.url}`);

    try {
      const response = await fetch(this.config.url, {
        method: this.config.method,
        headers: { 'Content-Type': 'application/json' },
        body: this.config.body ? JSON.stringify(this.config.body) : undefined,
      });

      const data = await response.json();

      return {
        context: {
          ...state.context,
          [this.config.resultKey]: {
            success: response.ok,
            status: response.status,
            data,
          },
        },
      } as Partial<WorkflowState<TContext>>;
    } catch (error) {
      return {
        context: {
          ...state.context,
          [this.config.resultKey]: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      } as Partial<WorkflowState<TContext>>;
    }
  }

  next(state: WorkflowState<TContext>): string {
    if (typeof this.config.next === 'function') {
      return this.config.next(state);
    }
    return this.config.next;
  }
}
```

### Step 2: Create Factory Function

```typescript
export function createHttpNode<TContext extends Record<string, unknown>>(
  name: string,
  config: HttpNodeConfig<TContext>
): GraphNode<WorkflowState<TContext>> {
  return new HttpNode(name, config);
}
```

### Step 3: Use in Workflow

```typescript
const fetchUserNode = createHttpNode('FETCH_USER', {
  method: 'GET',
  url: 'https://api.example.com/users/123',
  resultKey: 'userData',
  next: (state) => {
    if (state.context.userData?.success) {
      return 'PROCESS_USER';
    }
    return 'HANDLE_ERROR';
  },
});
```

## Extending Built-in Nodes

Extend existing runtime classes for specialized behavior:

```typescript
import { AgentNodeRuntime, type AgentNodeConfig } from '@sys/graph/nodes';

class RetryAgentNode<TContext extends Record<string, unknown>>
  extends AgentNodeRuntime<TContext>
{
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: AgentNodeConfig<TContext> & {
    maxRetries?: number;
    retryDelay?: number;
  }) {
    super(config);
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await super.execute(state, context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        context.logger.warn(
          `[${this.name}] Attempt ${attempt}/${this.maxRetries} failed`
        );

        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, this.retryDelay));
        }
      }
    }

    throw lastError;
  }
}
```

## Example: Database Node

```typescript
interface DbQueryConfig<TContext extends Record<string, unknown>> {
  query: string;
  params?: unknown[];
  resultKey: string;
  next: string | ((state: WorkflowState<TContext>) => string);
}

class DbQueryNode<TContext extends Record<string, unknown>>
  implements GraphNode<WorkflowState<TContext>>
{
  name: string;
  private config: DbQueryConfig<TContext>;
  private db: Database;

  constructor(name: string, config: DbQueryConfig<TContext>, db: Database) {
    this.name = name;
    this.config = config;
    this.db = db;
  }

  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<Partial<WorkflowState<TContext>>> {
    context.logger.info(`[${this.name}] Executing query`);

    try {
      const rows = await this.db.query(this.config.query, this.config.params);

      return {
        context: {
          ...state.context,
          [this.config.resultKey]: {
            success: true,
            rows,
            rowCount: rows.length,
          },
        },
      } as Partial<WorkflowState<TContext>>;
    } catch (error) {
      context.logger.error(`[${this.name}] Query failed:`, error);

      return {
        context: {
          ...state.context,
          [this.config.resultKey]: {
            success: false,
            error: error instanceof Error ? error.message : 'Query failed',
          },
        },
      } as Partial<WorkflowState<TContext>>;
    }
  }

  next(state: WorkflowState<TContext>): string {
    if (typeof this.config.next === 'function') {
      return this.config.next(state);
    }
    return this.config.next;
  }
}
```

## Best Practices

### 1. Immutable State Updates

Always return new state objects:

```typescript
// Good
return {
  context: {
    ...state.context,
    newValue: 'data',
  },
};

// Bad - mutates state
state.context.newValue = 'data';
return state;
```

### 2. Proper Error Handling

Store errors in context for downstream nodes:

```typescript
async execute(state, context) {
  try {
    const result = await riskyOperation();
    return {
      context: {
        ...state.context,
        result: { success: true, data: result },
      },
    };
  } catch (error) {
    return {
      context: {
        ...state.context,
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown',
        },
      },
    };
  }
}
```

### 3. Use the Logger

```typescript
async execute(state, context) {
  context.logger.info(`[${this.name}] Starting operation`);
  context.logger.debug(`[${this.name}] Input:`, state.context.input);

  // ... operation ...

  context.logger.info(`[${this.name}] Completed`);
}
```

### 4. Type Safety

```typescript
interface MyContext {
  userId: string;
  userData?: {
    success: boolean;
    data?: UserData;
    error?: string;
  };
}

class MyNode implements GraphNode<WorkflowState<MyContext>> {
  // Full type safety for state.context
}
```

## Testing Custom Nodes

```typescript
import { describe, it, expect } from 'bun:test';

describe('HttpNode', () => {
  it('should fetch and store result in context', async () => {
    const node = createHttpNode('TEST', {
      method: 'GET',
      url: 'https://api.example.com/test',
      resultKey: 'testResult',
      next: 'END',
    });

    const mockContext = {
      agent: {} as any,
      logger: console,
    };

    const initialState = {
      currentNode: 'TEST',
      status: 'running' as const,
      updatedAt: new Date().toISOString(),
      conversationHistory: [],
      context: {},
    };

    const result = await node.execute(initialState, mockContext);

    expect(result.context?.testResult).toBeDefined();
  });

  it('should handle dynamic transitions', () => {
    const node = createHttpNode('TEST', {
      method: 'GET',
      url: 'https://api.example.com/test',
      resultKey: 'testResult',
      next: (state) => state.context.testResult?.success ? 'OK' : 'FAIL',
    });

    const successState = {
      currentNode: 'TEST',
      status: 'running' as const,
      updatedAt: new Date().toISOString(),
      conversationHistory: [],
      context: { testResult: { success: true } },
    };

    expect(node.next(successState)).toBe('OK');
  });
});
```
