# Decision Log

**Status:** Draft

## Overview

This document records key architectural and design decisions made during specification, including alternatives considered and rationale for choices.

---

## D1: Web Framework

**Date:** 2025-11-25
**Status:** Decided

**Context:**
Need a framework for the local web interface that supports server-side capabilities, API routes, and modern React features.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Next.js (App Router) | Server components, file-based routing, API routes built-in, strong ecosystem | Heavier bundle, more complex |
| React + Vite | Lightweight, fast dev server, simple setup | Need separate backend for APIs |
| React + Express | Full control, familiar patterns | More boilerplate, manual routing |

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

**Context:**
Need client-side state management for UI state, AI session state, and local caching.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Zustand | Simple API, minimal boilerplate, good DevTools | Less structured than Redux |
| TanStack Query + Context | Great for server state, built-in caching | Two systems to learn |
| Redux Toolkit | Battle-tested, structured, middleware | Heavy, verbose |

**Decision:** Zustand only

**Rationale:**
- Single source of truth simplifies mental model
- Minimal boilerplate for a tool of this scope
- Works well with React Server Components
- Easy to persist to localStorage/SQLite for session recovery
- Sufficient for our needs without TanStack Query's complexity

---

## D3: AI Communication Protocol

**Date:** 2025-11-25
**Status:** Decided

**Context:**
Need real-time bidirectional communication between the Claude Code SDK agent and the browser UI.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| WebSocket | True bidirectional, low latency | More complex connection management |
| Server-Sent Events (SSE) | Simple, built on HTTP, auto-reconnect | One-way push (client uses POST to respond) |
| Long Polling | Works everywhere, simple | Higher latency, more requests |

**Decision:** Server-Sent Events (SSE)

**Rationale:**
- AI pushes questions, client responds via HTTP POST - matches our flow
- Simpler than WebSocket for our use case
- Built-in reconnection handling
- Works through proxies and load balancers
- Next.js API routes support SSE well

---

## D4: Diagram Visualization Library

**Date:** 2025-11-25
**Status:** Decided

**Context:**
Need to visualize DBML schemas, GraphQL schemas, and data flow diagrams.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Multiple specialized libraries | Best-in-class for each type | Inconsistent UX, multiple dependencies |
| Mermaid | Simple text-based, one library | Limited interactivity, fixed layouts |
| React Flow | Customizable, interactive, one library | More development effort |

**Decision:** React Flow for all diagram types

**Rationale:**
- Consistent interaction patterns across all visualizations
- Full control over node/edge rendering
- Interactive features (zoom, pan, select, highlight)
- Custom DBML, GraphQL, and flow nodes can share styling
- Single dependency to maintain
- Worth the development investment for better UX

---

## D5: Storage Architecture

**Date:** 2025-11-25
**Status:** Decided

**Context:**
Need to persist project specs (Git-trackable) and operational data (history, undo, session).

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| File System only | Simple, fully Git-trackable | Hard to query, no transactions |
| SQLite only | Queryable, ACID | Binary file in Git, harder to review |
| Hybrid (Files + SQLite) | Best of both worlds | Two storage systems |

**Decision:** Hybrid - Files for specs, SQLite for operational data

**Rationale:**
- Spec files (YAML, DBML, etc.) are human-readable and Git-friendly
- Developers can review spec changes in PRs
- SQLite for conversation history enables full-text search
- SQLite for undo stack enables complex queries
- Session state in SQLite allows exact recovery
- Clear separation: Git tracks specs, SQLite tracks operations

---

## D6: AI Agent Architecture

**Date:** 2025-11-25
**Status:** Superseded by D24

**Context:**
Need to structure AI agents for the CPO phase, CTO phase, and reverse engineering.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Single agent | Simpler, unified context | Large prompt, mode switching complexity |
| Separate agents per phase | Focused prompts, clear boundaries | Context loss between phases |
| Orchestrator + sub-agents | Best organization, specialized agents | More complex to implement |

**Decision:** Orchestrator + specialized sub-agents

**Rationale:**
- Orchestrator maintains conversation flow and high-level context
- CPO Agent focuses on product/business questions
- CTO Agent focuses on technical decisions
- RE Agent specializes in codebase analysis
- Each agent has focused prompts and tools
- Easier to improve individual agents independently
- Better separation of concerns

**Superseded:** See D24 for workflow-based architecture which replaced this approach

---

## D7: Operational Modes

**Date:** 2025-11-25
**Status:** Decided

**Context:**
How should "New Spec" and "Reverse Engineering" flows relate to each other?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Separate modes | Clear user intent, focused UX | Duplicate UI code |
| Unified flow | One codebase, flexible | Confusing for users |
| Import feature | Start fresh, import later | Complex mental model |

**Decision:** Separate modes with distinct entry points

**Rationale:**
- User intent is clear from the start
- New spec: empty project → Q&A → artifacts
- Reverse engineer: existing code → analysis → artifacts
- Different starting screens and flows
- Shared artifact editing once initial generation is complete
- Cleaner UX - user knows which mode they're in

---

## D8: Phase Transition

**Date:** 2025-11-25
**Status:** Decided

**Context:**
How should users move between CPO and CTO phases?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Sequential required | Clear progression, complete info before technical | Less flexible |
| Free switching | User control | May lead to incomplete phases |
| Parallel tracks | Efficiency | Confusing, conflicting decisions |

**Decision:** Sequential - CPO must complete before CTO

**Rationale:**
- Technical decisions depend on business requirements
- Ensures complete product thinking before implementation
- Clear mental model for users
- Phase indicator shows progress
- Can revisit CPO decisions during CTO if needed (triggers conversation)

---

## D9: Undo/Redo System

**Date:** 2025-11-25
**Status:** Decided

**Context:**
How should undo/redo work for AI-generated changes?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Git only | Simple, existing tool | Requires command line, coarse granularity |
| In-memory stack | Fast, fine-grained | Lost on refresh |
| Persistent stack | Survives sessions, auditable | More storage, complexity |

**Decision:** Persistent undo stack in SQLite

**Rationale:**
- Users may close browser and return later
- Undo history is part of the workflow
- SQLite provides reliable persistence
- Can query history for debugging
- Each action has before/after snapshots
- Git remains for broader version control

---

## D10: Theme Support

**Date:** 2025-11-25
**Status:** Decided

**Context:**
Should the UI support light and dark themes?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Dark only | Focused development, consistent branding | No user choice |
| Light + Dark | User preference | Double the theme work |
| System preference | Automatic | Still need both themes |

**Decision:** Dark theme only

**Rationale:**
- Target users are developers who often prefer dark themes
- Reduces design/development scope
- Consistent visual identity
- Code-related tools commonly use dark themes
- Can add light theme in future if requested

---

## D11: API Documentation Renderer

**Date:** 2025-11-25
**Status:** Decided

**Context:**
Need to render OpenAPI/Swagger documentation within the app.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Swagger UI | Industry standard, familiar | Dated design, heavy |
| Redoc | Clean design, good for reading | Read-only, less interactive |
| Scalar | Modern UX, active development | Newer, less proven |

**Decision:** Scalar

**Rationale:**
- Modern, clean design matches our aesthetic
- Good developer experience
- Actively maintained (2024-2025)
- React component available
- Better UX than legacy options
- Supports dark theme well

---

## D12: Git Conflict Handling

**Date:** 2025-11-25
**Status:** Decided

**Context:**
How should the app handle Git merge conflicts?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Built-in resolver | Complete solution | Significant development effort |
| Block + external tool | Simple, reliable | Breaks flow |
| Auto-merge with manual review | Mostly automated | Risk of silent issues |

**Decision:** Block save and guide to external tool

**Rationale:**
- Conflict resolution is complex - better to use proven tools
- Prevents accidental data loss
- Clear user guidance on what to do
- Links to VS Code / terminal instructions
- After resolution, user can retry save
- Scope control - not building a Git GUI

---

## D13: API Authentication

**Date:** 2025-11-25
**Status:** Decided

**Context:**
How should users provide their Anthropic API key for Claude Agent SDK?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Environment variable only | Standard for CI/automation | Poor first-run UX |
| Config file only | Persistent, easy to manage | Extra setup step |
| First-run prompt only | Great UX | Doesn't work in CI/automated |
| All with priority | Flexible | More code paths |

**Decision:** Environment variable first, then first-run prompt

**Rationale:**
- Environment variable (`ANTHROPIC_API_KEY`) is checked first
- If not found, prompt user interactively
- Store prompted key in `~/.foundry/credentials`
- Supports both developer UX and CI automation
- See: research/claude-agent-sdk.md

---

## D14: Reverse Engineering Approach

**Date:** 2025-11-25
**Status:** Decided

**Context:**
How should Foundry analyze existing codebases for reverse engineering?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Language-specific parsers | Precise extraction | Maintenance burden, limited languages |
| Plugin system | Extensible | Complex architecture |
| AI-driven (language agnostic) | Works with any language | Less precise, AI dependent |

**Decision:** AI-driven, language-agnostic analysis

**Rationale:**
- Claude can understand any programming language
- No parser maintenance as languages evolve
- Handles custom patterns and abstractions
- Trade-off: Less precise but more flexible
- Human-in-the-loop for ambiguous patterns
- See: research/reverse-engineering.md

---

## D15: Offline Mode

**Date:** 2025-11-25
**Status:** Decided

**Context:**
Should Foundry work without AI/network connection?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| AI required | Simpler, no degraded states | Unusable without connection |
| View-only offline | Basic functionality | Limited usefulness |
| Graceful degradation | Best UX | More complex states to manage |

**Decision:** Graceful degradation

**Rationale:**
- Users can view and manually edit specs offline
- AI features show "offline" indicator
- Automatic reconnection attempts
- No data loss if connection drops mid-session
- See: research/claude-agent-sdk.md (session persistence)

---

## D16: Project Constitution

**Date:** 2025-11-25
**Status:** Decided

**Context:**
Should Foundry support a constitution document (governing principles) like GitHub Spec-Kit?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Required | Ensures consistency from start | Barrier to quick start |
| Optional | Flexible, no friction | Users may skip valuable feature |
| Template with prompt | Best of both | Adds setup step |

**Decision:** Optional (user can add anytime)

**Rationale:**
- No barrier to getting started
- Users can add constitution when ready
- AI still functions without constitution
- Constitution becomes more valuable as project grows
- See: research/spec-driven-development.md

---

## D17: Clarify Phase Trigger

**Date:** 2025-11-25
**Status:** Decided

**Context:**
When should the Clarify phase (ambiguity detection) run?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Automatic after CPO | Catches issues early, no user action needed | May interrupt flow |
| User-triggered | User controls timing | Users may skip |
| Continuous during Q&A | Real-time feedback | More complex, distracting |

**Decision:** Automatic after CPO phase completes

**Rationale:**
- AI catches ambiguities without user intervention
- Natural transition point between phases
- User can defer clarifications to CTO phase if desired
- Reduces rework during technical design
- See: research/spec-driven-development.md

---

## D18: Task Breakdown UI

**Date:** 2025-11-25
**Status:** Decided

**Context:**
How should the task breakdown feature be presented in the UI?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Separate view (kanban) | Full task management | Context switching |
| Feature-integrated | Tasks near related content | May clutter feature view |
| Both views | Flexibility | More UI to build |

**Decision:** Feature-integrated (tasks shown within feature detail page)

**Rationale:**
- Tasks are directly tied to feature implementation steps
- Reduces context switching
- Progress visible where it's most relevant
- Roll-up progress still shown at module/project level
- Kanban view could be added later if needed

---

## D19: Lessons Learned Maintenance

**Date:** 2025-11-25
**Status:** Decided

**Context:**
How should the lessons learned file be maintained?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| AI-maintained | Automatic capture of fixes | May miss context |
| User-only | Full control | Extra work for user |
| Hybrid | Best of both | More complex |

**Decision:** AI-maintained with user editing

**Rationale:**
- AI logs corrected errors and patterns automatically
- AI checks lessons before generating similar artifacts
- User can add manual entries for context
- Reduces repeated mistakes over time
- Feedback loop improves AI quality
- See: research/spec-driven-development.md

---

## D20: Agent Hooks

**Date:** 2025-11-25
**Status:** Decided

**Context:**
Should Foundry support event-driven agent hooks like AWS Kiro?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Full hook system | Maximum automation | Complex to implement |
| Limited hooks | Reduced complexity | Less flexibility |
| No hooks | Simplest | Manual validation burden |

**Decision:** Event-driven hooks with predefined actions

**Rationale:**
- Automates repetitive validation tasks
- Reduces manual checking burden
- Hooks defined in constitution.yaml (consistent location)
- Limited action set keeps implementation manageable
- Events: onFeatureSave, onSchemaChange, preCommit
- Actions: validateSchema, updateChecklist, regenerateAPIs, runAnalyzer
- See: research/spec-driven-development.md (Kiro analysis)

---

## D24: Workflow vs Agent Architecture

**Date:** 2025-11-26
**Status:** Decided
**Supersedes:** D6

**Context:**
After designing the agent-based architecture (D6), we identified challenges with predictability, cost control, and testing. LLM-driven orchestration (agents deciding which tools to call) introduces non-determinism that complicates debugging, cost estimation, and reliable pause/resume.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| Agent-based (D6) | Flexible, handles edge cases | Unpredictable execution, hard to test, cost varies |
| Workflow-based | Deterministic steps, bounded LLM calls, testable | Less flexible for unexpected scenarios |
| Hybrid | Workflows for Q&A, agents for analysis | Two systems to understand |

**Decision:** Workflow-based architecture for all sequential tasks

**Rationale:**
- **Maximum Predictability**: Every step is explicitly defined, no hallucinated tool calls
- **Cost Control**: LLM calls are bounded and predictable (can estimate cost per workflow)
- **Better Testing**: Unit test individual steps, mock LLM responses
- **Clear Debugging**: Full execution history, step-by-step tracing
- **Retry Granularity**: Can retry individual steps, not entire conversations
- **Timeout Handling**: Each step has explicit timeout
- **Pause/Resume**: Checkpoint after each step enables reliable recovery

**Architecture Changes:**
| Component | Before (D6) | After (D24) |
|-----------|-------------|-------------|
| Orchestrator | LLM-driven agent | Pure code state machine |
| CPO Phase | Sub-agent | 8-topic workflow with AI question generation |
| CTO Phase | Sub-agent | 8-topic workflow with auto-generator invocation |
| Clarify Phase | Sub-agent | 4-step workflow (scan, categorize, resolve, apply) |
| RE Analysis | Sub-agent | 6-step workflow with Opus LLM |
| Generators | Tool calls | Single bounded LLM call per generator |

**LLM Usage in Workflows:**
- Question generation: Sonnet generates questions within topic constraints
- Categorization: Sonnet classifies ambiguities
- Code analysis: Opus analyzes architecture and extracts features
- Generation: Sonnet produces schemas, APIs, components

---

## Open Questions

None remaining.

---

## D21: React Flow Performance Thresholds

**Date:** 2025-11-26
**Status:** Decided

**Context:**
Need to define when to enforce hierarchical collapse and enable virtualization in React Flow diagrams to maintain performance.

**Thresholds Decided:**

| Node Count | Behavior | Rationale |
|------------|----------|-----------|
| < 50 nodes | Full render | Fast enough for direct rendering |
| 50-150 nodes | Suggest collapse | Show warning badge, optional collapse |
| 150+ nodes | Enforce hierarchical collapse by module | Prevents performance degradation |
| 300+ nodes | Enable virtualization | Only render visible viewport |

**Virtualization Strategy:**
- Use React Flow's built-in viewport-based rendering
- Lazy load node details on zoom/pan
- Cache rendered nodes for 30 seconds

**Collapse Strategy:**
- Group by module (top-level organization)
- Allow expand/collapse per module
- Remember user's collapse state in localStorage
- Visual indicator shows collapsed node count

**Rationale:**
- 50-node threshold based on React Flow performance testing (research/react-flow.md)
- Progressive disclosure prevents overwhelming users
- Hierarchical collapse by module matches Foundry's organization
- Virtualization at 300+ handles enterprise-scale projects

---

## D22: File Format Versioning

**Date:** 2025-11-26
**Status:** Decided

**Context:**
Need strategy for handling breaking changes to YAML schemas as Foundry evolves.

**Decision:** Semantic versioning with automated migration

**Version Strategy:**
- All artifact files include `version` field (e.g., `version: "1.0"`)
- Schema version in `.foundry/schema-version.yaml`
- Breaking changes increment major version
- Additive changes increment minor version

**Migration Approach:**

| Scenario | Strategy |
|----------|----------|
| Minor version mismatch | Auto-add new optional fields with defaults |
| Major version mismatch | Run migration workflow, user confirms |
| No version field | Assume v1.0, prompt upgrade |
| Future version | Block open, suggest Foundry update |

**Migration Workflow:**
1. Detect version mismatch on project open
2. Show migration preview (before/after diffs)
3. User confirms migration
4. Backup original files to `.foundry/.migrations/backup-{timestamp}/`
5. Apply transformations (code-based, deterministic)
6. Update `schema-version.yaml`
7. Allow rollback for 7 days

**Schema Version File:**
```yaml
schemaVersion: "2.0"
previousVersion: "1.0"
migratedAt: "2025-11-26T10:00:00Z"
migrations:
  - from: "1.0"
    to: "2.0"
    appliedAt: "2025-11-26T10:00:00Z"
    changes:
      - "Added implementationPlan.estimatedEffort field"
      - "Renamed acceptanceCriteria to acceptance"
```

**Rationale:**
- Explicit versioning prevents silent corruption
- Automated migration reduces manual work
- Backup enables safe rollback
- Preview builds user confidence
- Deterministic code transformations (no AI) ensure reliability

