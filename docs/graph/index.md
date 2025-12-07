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
import { defineWorkflow, nodes, GraphEngine } from '@sys/graph';
```

## Quick Start

### 1. Define a Workflow

```typescript
import { defineWorkflow, nodes } from '@sys/graph';

export default defineWorkflow({
  id: 'feature-development',

  nodes: {
    PLAN: nodes.AgentNode({
      role: 'architect',
      system: 'Analyze the request and output a JSON plan.',
      tools: ['list_files', 'read_file'],
      next: 'IMPLEMENT',
    }),

    IMPLEMENT: nodes.AgentNode({
      role: 'builder',
      system: 'Implement the planned tasks.',
      tools: ['write_file', 'read_file', 'bash'],
      next: (state) => (state.context.allTasksDone ? 'TEST' : 'IMPLEMENT'),
    }),

    TEST: nodes.CommandNode({
      command: 'bun test',
      next: (state) => (state.context.lastCommandResult?.exitCode === 0 ? 'COMMIT' : 'FIX'),
    }),

    FIX: nodes.AgentNode({
      role: 'debugger',
      system: 'Fix the failing tests.',
      tools: ['read_file', 'write_file'],
      next: 'TEST',
    }),

    COMMIT: nodes.SlashCommandNode({
      command: 'commit',
      args: 'Implement feature with passing tests',
      next: 'END',
    }),
  },
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
| [API Reference](api) | Complete API documentation |
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
