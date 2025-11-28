# Foundry Core

**Status:** Draft
**Created:** 2025-11-25

## Overview

Foundry is a CLI-based technical specification constructor that launches a local web interface for iteratively building and refining software requirements. Through a **workflow-based** three-phase process (CPO → Clarify → CTO), it transforms vague ideas into comprehensive technical specs including database schemas, API definitions, and UI mockups. The tool also supports reverse-engineering existing codebases into specifications.

**Architecture Highlights:**
- **Workflow-based execution**: Deterministic step sequences with bounded LLM calls
- **Topic-driven Q&A**: AI generates questions within predefined topic constraints
- **Auto-invoke generators**: Schema, API, and Component generators trigger automatically after relevant topics
- **Checkpoint/resume**: Full state persistence for pause/resume at any step
- **Step-level retry**: Retry individual failed steps without restarting entire phase

**Key Differentiators:**
- Visual-first approach with interactive diagrams
- Automatic ambiguity detection (Clarify workflow)
- Project constitution for consistent AI decisions
- Event-driven hooks for automated validation
- Lessons learned feedback loop

## Documents

| Document | Purpose | Status |
|----------|---------|--------|
| business.md | Business requirements, user personas, and scope | Draft |
| technical.md | Architecture, stack decisions, and implementation | Draft |
| api-schema.md | Internal API contracts | Draft |
| tools.md | AI tool definitions and model selection | Draft |
| data-model.md | File structure, entities, and storage design | Draft |
| ux.md | User interface design and interaction patterns | Draft |
| decisions.md | Decision log with rationale | Draft |
| qa-flow.md | AI Q&A flow: question types, navigation, phases, state | Draft |

## Feature Documentation

Features organized by user journey phase:

| Document | Purpose | Features | Status |
|----------|---------|----------|--------|
| features/features-setup.md | Project initialization and configuration | F6, F12, API Key Setup | Draft |
| features/features-qa.md | Enhanced Q&A experience during CPO/Clarify/CTO | F7, F14-F20 (8 features) | Draft |
| features/features-management.md | Spec review, validation, and tracking | F1-F5, F8-F10 (8 features) | Draft |
| features/features-maintenance.md | Long-term spec-code alignment | F11, F13, Git Integration (3 features) | Draft |

**Total:** 22 features across 4 journey-based files

## Research Documents

| Document | Purpose | Status |
|----------|---------|--------|
| research/claude-agent-sdk.md | Claude Agent SDK capabilities, auth, events | Complete |
| research/claude-agent-sdk-apis.md | Complete Claude SDK API reference | Complete |
| research/react-flow.md | Performance, node types, layout algorithms | Complete |
| research/file-system-sync.md | File watching, atomic writes, Git integration | Complete |
| research/reverse-engineering.md | AI-driven codebase analysis strategy | Complete |
| research/spec-driven-development.md | SDD methodology, tool comparison (Spec-Kit, Kiro, etc.) | Complete |

## Quick Links

- Problem: business.md#problem-statement
- Architecture: technical.md#architecture
- API Routes: api-schema.md#rest-endpoints
- Data Structure: data-model.md#file-structure
- UI Layout: ux.md#layout

## Clarified Requirements

Captured from specification Q&A:

| Topic | Decision |
|-------|----------|
| API Auth | Environment variable first, then first-run prompt |
| Offline Mode | Graceful degradation - view/edit without AI |
| RE Languages | Language-agnostic, AI-driven analysis |
| Q&A Depth | Detailed (15-25 questions per phase, 8 topics each) |
| .foundry Location | Git root directory |
| Large Diagrams | Hierarchical collapse by module |
| Constitution | Optional (user can add anytime) |
| Clarify Workflow | Automatic after CPO workflow completes |
| Tasks UI | Feature-integrated (tasks within feature detail) |
| Lessons Learned | AI-maintained with user editing |
| Hooks | Event-driven with predefined actions |
| Architecture | Workflow-based (not agent-based) - see D24 |

## Open Questions

None - all TBDs have been resolved. See decisions.md for details on D21 and D22.
