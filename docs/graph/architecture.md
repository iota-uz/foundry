---
layout: default
title: Architecture
parent: Graph Workflow Engine
nav_order: 1
description: 'Core architecture and design concepts'
---

# Architecture

The Graph Engine is a finite state machine (FSM) executor designed for AI workflows.

## System Overview

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
│  └─────────────┘    │  │ Agent  │ │Command │ │Slash ││         │
│                     │  │  Node  │ │  Node  │ │ Cmd  ││         │
│                     │  └────────┘ └────────┘ └──────┘│         │
│                     └─────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Agent SDK                              │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### State Manager

Manages workflow state throughout execution:

- Tracks current node position in the FSM
- Maintains execution status (`pending`, `running`, `completed`, `failed`)
- Stores user-defined context data
- Preserves conversation history for AI continuity

### Node Executor

Executes individual nodes:

- Routes to appropriate node implementation (Agent, Command, Slash, etc.)
- Handles node-level error recovery
- Merges execution results into state
- Triggers state persistence after each node

### Transition Resolver

Determines workflow routing:

- Evaluates static transitions (string node names)
- Executes dynamic transitions (functions that inspect state)
- Validates target nodes exist
- Detects terminal state (`END`)

### Persistence Layer

Enables checkpoint/resume:

- Saves state to `.graph-state/{workflow-id}.json`
- Automatic save after each node completion
- Transparent resume from last successful node
- Manual reset capability

## Execution Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   START     │────▶│  EXECUTE    │────▶│  PERSIST    │
│ Load State  │     │    Node     │     │   State     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           │                    ▼
                           │            ┌─────────────┐
                           │            │  RESOLVE    │
                           │            │ Transition  │
                           │            └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   ERROR     │     │   NEXT      │
                    │  Handler    │     │   Node?     │
                    └─────────────┘     └─────────────┘
                                               │
                                    ┌──────────┴──────────┐
                                    │                     │
                                    ▼                     ▼
                             ┌─────────────┐       ┌─────────────┐
                             │   LOOP      │       │    END      │
                             │  (next node)│       │  Complete   │
                             └─────────────┘       └─────────────┘
```

1. **Start**: Load existing state or initialize new workflow
2. **Execute**: Run the current node's logic
3. **Persist**: Save state to disk
4. **Resolve**: Determine next node from transition
5. **Loop or End**: Continue to next node or complete workflow

## Design Principles

### Single Responsibility

Each node type handles one concern:

- `AgentNode`: AI-powered decision making and generation
- `CommandNode`: Shell command execution
- `SlashCommandNode`: Claude Code operations
- `GitHubProjectNode`: GitHub Projects status updates

### Immutable State Updates

Nodes return partial state updates that are merged:

```typescript
// Node returns partial update
return { context: { ...state.context, result: data } };

// Engine merges into full state
newState = { ...oldState, ...partialUpdate };
```

### Deterministic Transitions

Transitions are pure functions of state:

```typescript
// Given the same state, always returns the same next node
next: (state) => state.context.success ? 'DEPLOY' : 'ROLLBACK'
```

### Fail-Safe Persistence

State is saved after every successful node:

- Crash recovery: resume from last checkpoint
- Long-running workflows: pause and continue later
- Debugging: inspect intermediate states

## File Structure

```
project/
├── atomic.config.ts          # Workflow definition
└── .graph-state/
    └── {workflow-id}.json    # Persisted state
```
