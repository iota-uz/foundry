---
layout: default
title: Decision Log
nav_order: 9
---

# Decision Log

**Status:** Draft

## Overview

This document records key architectural and design decisions made during specification, including alternatives considered and rationale for choices.

---

## D1: Web Framework

**Date:** 2025-11-25
**Status:** Decided

**Decision:** Next.js (App Router)

**Rationale:**

- Server components reduce client-side JavaScript
- Built-in API routes simplify architecture (no separate backend)
- File-based routing matches our page structure well
- Strong TypeScript support
- Future-proof with React 19 features

---

## D2: State Management

**Date:** 2025-11-25
**Status:** Decided

**Decision:** Zustand only

**Rationale:**

- Single source of truth simplifies mental model
- Minimal boilerplate for a tool of this scope
- Works well with React Server Components
- Easy to persist to localStorage/SQLite for session recovery

---

## D3: AI Communication Protocol

**Date:** 2025-11-25
**Status:** Decided

**Decision:** Server-Sent Events (SSE)

**Rationale:**

- AI pushes questions, client responds via HTTP POST - matches our flow
- Simpler than WebSocket for our use case
- Built-in reconnection handling
- Works through proxies and load balancers

---

## D4: Diagram Visualization Library

**Date:** 2025-11-25
**Status:** Decided

**Decision:** React Flow for all diagram types

**Rationale:**

- Consistent interaction patterns across all visualizations
- Full control over node/edge rendering
- Interactive features (zoom, pan, select, highlight)
- Single dependency to maintain

---

## D5: Storage Architecture

**Date:** 2025-11-25
**Status:** Decided

**Decision:** Hybrid - Files for specs, SQLite for operational data

**Rationale:**

- Spec files (YAML, DBML, etc.) are human-readable and Git-friendly
- SQLite for conversation history enables full-text search
- SQLite for undo stack enables complex queries
- Clear separation: Git tracks specs, SQLite tracks operations

---

## D6: AI Agent Architecture

**Date:** 2025-11-25
**Status:** Superseded by D24

See D24 for workflow-based replacement decision.

---

## D7: Operational Modes

**Date:** 2025-11-25
**Status:** Decided

**Decision:** Separate modes with distinct entry points

**Rationale:**

- User intent is clear from the start
- New spec: empty project → Q&A → artifacts
- Reverse engineer: existing code → analysis → artifacts

---

## D8: Phase Transition

**Date:** 2025-11-25
**Status:** Decided

**Decision:** Sequential - CPO must complete before CTO

**Rationale:**

- Technical decisions depend on business requirements
- Ensures complete product thinking before implementation
- Clear mental model for users

---

## D13: API Authentication

**Date:** 2025-11-25
**Status:** Decided

**Decision:** Environment variable first, then first-run prompt

**Rationale:**

- Environment variable (`ANTHROPIC_API_KEY`) is checked first
- If not found, prompt user interactively
- Store prompted key in `~/.foundry/credentials`
- Supports both developer UX and CI automation

---

## D24: Workflow vs Agent Architecture

**Date:** 2025-11-26
**Status:** Decided
**Supersedes:** D6

**Context:**
After designing the agent-based architecture (D6), identified challenges with predictability, cost control, and testing.

**Decision:** Workflow-based architecture for all sequential tasks

**Rationale:**

- **Maximum Predictability**: Every step explicitly defined, no hallucinated tool calls
- **Cost Control**: LLM calls bounded and predictable
- **Better Testing**: Unit test individual steps, mock LLM responses
- **Clear Debugging**: Full execution history, step-by-step tracing
- **Retry Granularity**: Can retry individual steps, not entire conversations
- **Timeout Handling**: Each step has explicit timeout
- **Pause/Resume**: Checkpoint after each step enables reliable recovery

---

## D21: React Flow Performance Thresholds

**Date:** 2025-11-26
**Status:** Decided

**Thresholds Decided:**

| Node Count   | Behavior                                | Rationale                             |
| ------------ | --------------------------------------- | ------------------------------------- |
| < 50 nodes   | Full render                             | Fast enough for direct rendering      |
| 50-150 nodes | Suggest collapse                        | Show warning badge, optional collapse |
| 150+ nodes   | Enforce hierarchical collapse by module | Prevents performance degradation      |
| 300+ nodes   | Enable virtualization                   | Only render visible viewport          |

---

## D22: File Format Versioning

**Date:** 2025-11-26
**Status:** Decided

**Decision:** Semantic versioning with automated migration

**Version Strategy:**

- All artifact files include `version` field (e.g., `version: "1.0"`)
- Schema version in `.foundry/schema-version.yaml`
- Breaking changes increment major version
- Additive changes increment minor version

**Migration Approach:**

| Scenario               | Strategy                                   |
| ---------------------- | ------------------------------------------ |
| Minor version mismatch | Auto-add new optional fields with defaults |
| Major version mismatch | Run migration workflow, user confirms      |
| No version field       | Assume v1.0, prompt upgrade                |
| Future version         | Block open, suggest Foundry update         |

---

## Open Questions

None - all TBDs have been resolved. See technical.md and qa-flow.md for detailed architecture explanations.
