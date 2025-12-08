---
layout: default
title: Graph Workflow Engine
nav_order: 31
has_children: true
description: 'FSM-based workflow engine with Claude Agent SDK integration'
---

# Graph Workflow Engine

A stateful, FSM-based workflow engine for building AI-driven software development pipelines with checkpoint/resume capabilities.

## What is it?

The Graph Engine enables **multi-step AI workflows** that:

- Define workflows as finite state machines (FSM)
- Execute nodes sequentially with conditional transitions
- Persist state after each node for pause/resume
- Integrate with Claude Agent SDK for AI-powered nodes
- Support shell commands, Claude Code operations, and GitHub Projects

## Installation

```typescript
import { defineNodes, defineWorkflow, StdlibTool, AgentModel, GraphEngine } from '@sys/graph';
```

## Quick Start

The API provides **compile-time type safety** for transitions. TypeScript validates that all `then` values point to valid nodes.

### 1. Define a Workflow

```typescript
import { defineNodes, defineWorkflow, StdlibTool, AgentModel } from '@sys/graph';

interface MyContext extends Record<string, unknown> {
  allTasksDone: boolean;
  testsPassed: boolean;
}

// Define schema with all node names
const schema = defineNodes<MyContext>()([
  'PLAN', 'IMPLEMENT', 'TEST', 'FIX', 'COMMIT'
] as const);

export default defineWorkflow({
  id: 'feature-development',
  schema,
  initialContext: { allTasksDone: false, testsPassed: false },

  nodes: [
    // First node is the entry point
    schema.agent('PLAN', {
      role: 'architect',
      prompt: 'Analyze the request and output a JSON plan.',
      capabilities: [StdlibTool.ListFiles, StdlibTool.ReadFile],
      then: 'IMPLEMENT',  // TypeScript validates this!
    }),

    schema.agent('IMPLEMENT', {
      role: 'builder',
      prompt: 'Implement the planned tasks.',
      capabilities: [StdlibTool.WriteFile, StdlibTool.ReadFile, StdlibTool.Bash],
      then: (state) => state.context.allTasksDone ? 'TEST' : 'IMPLEMENT',
    }),

    schema.command('TEST', {
      command: 'bun test',
      then: (state) => state.context.testsPassed ? 'COMMIT' : 'FIX',
    }),

    schema.agent('FIX', {
      role: 'debugger',
      prompt: 'Fix the failing tests.',
      capabilities: [StdlibTool.ReadFile, StdlibTool.WriteFile],
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

### 2. Execute the Workflow

```typescript
import { GraphEngine } from '@sys/graph';

const engine = new GraphEngine();

const result = await engine.run('feature-development', {
  context: {
    request: 'Add user authentication to the API',
    allTasksDone: false,
  },
});

console.log('Final state:', result.status);
```

## Node Types

| Node Type | Purpose | Key Features |
|-----------|---------|--------------|
| [AgentNode](nodes#agentnode) | AI-powered execution | Claude SDK, tools, multi-turn |
| [CommandNode](nodes#commandnode) | Shell commands | stdout/stderr capture, exit codes |
| [SlashCommandNode](nodes#slashcommandnode) | Claude Code operations | `/commit`, `/test`, `/edit` |
| [GitHubProjectNode](nodes#githubprojectnode) | Project status updates | GitHub Projects V2 API |

### Primitive Nodes

Low-level building blocks for dynamic, composable workflows:

| Node Type | Purpose | Key Features |
|-----------|---------|--------------|
| [EvalNode](primitives#evalnode) | Context transformation | No LLM, pure functions |
| [DynamicAgentNode](primitives#dynamicagentnode) | Runtime AI config | Dynamic model/prompt |
| [DynamicCommandNode](primitives#dynamiccommandnode) | Runtime shell config | Dynamic command/env |

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](architecture) | Core concepts and design |
| [Nodes](nodes) | Built-in node types |
| [Primitives](primitives) | Dynamic, composable building blocks |
| [State](state) | State management and persistence |
| [Transitions](transitions) | Routing between nodes |
| [Custom Nodes](custom-nodes) | Creating your own nodes |
| [API Reference](api) | Type-safe schema-based API |
| [Examples](examples) | Full workflow examples |

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
