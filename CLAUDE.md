You are an orchestrator translating business requirements to code paths, delegating implementation to specialized
agents.
Actively interact with the user using the AskUserQuestion tool for multiple choice
options (requirements, approaches, libraries, patterns, ambiguity).

Never present choices as plain text, prefer AskUserQuestion.
Clarify user input / requirements before starting or while investigating when uncertain.
Make as few decisions for the user as possible, present them with options instead, don't assume anything.

**Context:**
@docs/graph/index.md
@docs/workflow-builder/index.md

# 1. PROJECT CONTEXT

## 1.1 Business Overview

Visual workflow builder for AI-powered software development pipelines. Build, visualize, and execute multi-step
AI workflows with a drag-and-drop interface powered by React Flow and an FSM execution engine.

**Target User:** Developers and tech leads building AI automation pipelines

## 1.2 Core Domains

- **Visual Workflow Builder**: React Flow-based drag-and-drop canvas for node construction
- **Graph Engine**: FSM-based workflow execution with checkpoint/resume
- **Node Library**: Pre-built nodes (Agent, Command, HTTP, LLM, Eval, etc.)
- **Real-Time Execution**: SSE-based live progress monitoring
- **GitHub Integration**: Dispatch workflows via Actions, update GitHub Projects

## 1.3 Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS v4 + Headless UI |
| State | Zustand |
| AI | Claude Agent SDK |
| Diagrams | React Flow |
| Database | PostgreSQL + Drizzle ORM |
| Real-Time | Server-Sent Events (SSE) |

## 1.4 Architecture Overview

```
Visual Workflow Builder (React Flow)
         │
         ▼
Schema Converter (React Flow ↔ GraphEngine)
         │
         ▼
Graph Engine (FSM execution)
         │
    ┌────┴────┐
    ▼         ▼
PostgreSQL  Claude API
(Drizzle)   (Agent SDK)
```

## 1.5 Code Organization

```
foundry/
├── CLAUDE.md                       # This file - project context for AI
├── .claude/
│   └── guides/                     # Reusable knowledge guides
├── docs/                           # Public documentation (GitHub Pages)
│   ├── index.md                    # Home page
│   ├── graph/                      # Graph engine documentation
│   ├── workflow-builder/           # Visual builder documentation
│   ├── dispatch.md                 # GitHub dispatch integration
│   └── github-projects.md          # GitHub Projects integration
├── src/
│   ├── app/                        # Next.js pages and API routes
│   │   ├── api/workflows/          # Workflow CRUD + execution APIs
│   │   └── workflows/              # Workflow editor pages
│   ├── components/
│   │   ├── workflow-builder/       # Visual builder components
│   │   ├── layout/                 # App shell
│   │   └── shared/                 # Reusable UI components
│   ├── lib/
│   │   ├── graph/                  # FSM execution engine
│   │   ├── workflow-builder/       # Schema converter, validation
│   │   ├── db/                     # Drizzle ORM, repositories
│   │   ├── dispatch/               # GitHub dispatch integration
│   │   └── github-projects/        # GitHub Projects client
│   └── store/                      # Zustand stores
│       ├── workflow-builder.store.ts
│       └── workflow-execution.store.ts
```

**See:** `docs/graph/index.md` for Graph Engine docs, `docs/workflow-builder/index.md` for builder UI docs.

# 2. PLAN MODE

## 2.1 Agent Orchestration

**Default: Single agent.** Multi-agent only for large features/refactorings spanning multiple concerns.

Concern-based splitting (large scope only):

- Frontend (React Flow canvas, config panels, state)
- Backend (API routes, database, execution)
- Graph Engine (node types, transitions, state management)

Small tasks: direct tools, no agent. Medium/large single-concern: single agent.

## 2.2 Model Selection

- `opus` + `frontend-design` skill - **UI work**: new components, new pages, visual design (always use skill)
- `opus` - **Debugging**: root cause analysis, complex bug investigation
- `sonnet` - **Backend work**: API routes, database, Graph Engine, refactoring, planning (default choice)
- `haiku` - **Routine tasks only**: large-scale renames, type errors, simple fixes

## 2.3 Sequencing Rules

Agent execution syntax: `&&` sequential, `&` parallel

- `debugger` is for investigation, not implementation. Use to find the root cause, then make a plan.
- `refactoring-expert` runs LAST (after all implementation)
- Test work: SINGLE `editor` only, no multi-agent orchestration

**Examples:**

Bug: `debugger(opus)` → `editor(sonnet)` && `refactoring-expert(sonnet)`
Backend feature: `editor(sonnet)` && `refactoring-expert(sonnet)`
UI feature: `frontend-design(opus)` → `refactoring-expert(sonnet)`
Routine: `editor(haiku)` for renames, simple fixes

## 2.4 Planning Process

1. Research (if needed): `Explore` for codebase, `Plan` for design, `researcher` for library docs
2. Identify affected concerns and assess scope
3. Decide single vs multi-agent workflow
4. The final plan must include agent workflow and selected models

## 2.5 Direct Tools vs Agents

**Direct Tools:** Known files, simple patterns, quick lookups
**`Explore` Agent:** Uncertain scope, complex research, understanding systems

**Key documentation (read when planning implementation):**

- docs/graph/index.md - Graph Engine overview
- docs/graph/nodes.md - Node types and configuration
- docs/graph/architecture.md - Core design concepts
- docs/workflow-builder/index.md - Visual builder architecture

# 3. IMPLEMENTATION

## 3.1 Verification Commands

```bash
# Development
bun dev                       # Start development server (hot reload)
bun build                     # Production build
bun start                     # Start production server

# Database
docker compose up -d postgres # Start PostgreSQL
bun db:push                   # Push schema to database
bun db:studio                 # Open Drizzle Studio

# Code Quality & Testing
bun lint                      # Run ESLint
bun typecheck                 # Run TypeScript type checking
bun test                      # Run tests
bun test --watch              # Run tests in watch mode
```

## 3.2 Code Rules

- Use `// TODO` comments for unimplemented parts or future enhancements
- Run `bun lint` before committing to catch unused code
- Keep node configurations type-safe via discriminated unions
- Use Drizzle ORM for all database operations
- Stream execution updates via SSE, not polling

## 3.3 Key Patterns

### Adding a New Node Type

1. Add enum value to `src/lib/graph/enums.ts` → `NodeType`
2. Create node executor in `src/lib/graph/nodes/`
3. Add config type to `src/store/workflow-builder.store.ts`
4. Add config form to `src/components/workflow-builder/node-config-panel.tsx`
5. Update schema converter in `src/lib/workflow-builder/schema-converter.ts`
6. Document in `docs/graph/nodes.md`

### Adding an API Route

1. Create route in `src/app/api/workflows/`
2. Use repository functions from `src/lib/db/repositories/`
3. Handle errors with proper HTTP status codes
4. Update API docs in `docs/workflow-builder/index.md`
