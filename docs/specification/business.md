---
layout: default
title: Business Requirements
nav_order: 2
---

# Business Requirements

**Status:** Draft

## Problem Statement

Technical leads and architects spend significant time translating vague product ideas into detailed technical specifications. This process is:

1. **Time-consuming:** Manually documenting schemas, APIs, and UI specs takes days or weeks
2. **Inconsistent:** Different projects have varying spec formats and levels of detail
3. **Iterative by nature:** Requirements evolve through many rounds of stakeholder conversations

Foundry solves this by providing an AI-assisted specification builder that guides users through structured Q&A phases, producing consistent, comprehensive technical documentation.

## Goals

**Primary Goals:**

- Transform vague product ideas into detailed technical specs through AI-guided Q&A
- Support reverse-engineering existing codebases into structured specifications
- Provide visual representations of schemas, APIs, and data flows
- Integrate with Git for version control of specifications

**Success Metrics:**

- Time to complete a feature spec (target: < 1 hour for medium complexity)
- Spec completeness (all sections populated, no [TBD] items remaining)
- User satisfaction with generated artifacts

## Non-Goals

**Explicitly Out of Scope:**

- **Code Generation:** Foundry generates specs, not implementation code
- **Cloud/Team Features:** No cloud sync, team collaboration, or shared workspaces
- **Export Functionality:** Specs live within Foundry, no PDF/external format export
- **Multi-user:** Single-user local tool only

## Target Users

**Primary Persona: Tech Lead / Architect**

- Experienced developer (5+ years)
- Responsible for defining technical direction
- Familiar with database design, API patterns, architecture concepts
- Works on multiple projects, needs consistent spec format
- Values efficiency over hand-holding

**Usage Patterns:**

- New project kickoff: Define entire system architecture
- Feature addition: Spec out new features for existing projects
- Documentation: Reverse-engineer undocumented codebases

## Use Cases

### UC1: New Project Specification

**Actor:** Tech Lead starting a new project

**Flow:**

1. Run `npx foundry` in empty directory
2. Select "New Specification" mode
3. Enter initial project description
4. Complete CPO Phase (product vision, user flows, features)
5. Complete CTO Phase (tech stack, data types, implementation)
6. Review generated artifacts (DBML, APIs, UI components)
7. Refine through additional Q&A rounds
8. Commit spec to Git

**Outcome:** Complete technical specification ready for implementation

### UC2: Reverse Engineering

**Actor:** Tech Lead inheriting an undocumented codebase

**Flow:**

1. Run `npx foundry` in project root
2. Select "Reverse Engineer" mode
3. AI analyzes codebase (database schemas, APIs, components)
4. Review extracted artifacts with progressive streaming
5. Refine/correct any misidentified patterns
6. Commit generated spec to Git

**Outcome:** Existing codebase documented as structured specification

### UC3: Feature Addition

**Actor:** Tech Lead adding feature to existing spec

**Flow:**

1. Open Foundry on existing project
2. Click "Add Feature" in relevant module
3. Describe feature requirements
4. Complete Q&A phases
5. Review how feature integrates with existing schema/APIs
6. View dependency graph
7. Commit changes

**Outcome:** New feature spec integrated with existing project architecture

## Scope Boundaries

### In Scope (v1.0)

- CLI launcher with npm/npx distribution
- Local web interface (localhost)
- Two operational modes: New Spec, Reverse Engineer
- CPO and CTO Q&A phases (sequential)
- Visualizations: DBML, Swagger/OpenAPI, GraphQL, Data Flow
- UI Library: Component/page gallery with preview
- Feature management: Add, edit, view dependencies
- Git integration: branch, commit, pull, push
- Full AI conversation history (searchable)
- Persistent undo/redo system

### Future Phases (Out of Scope for v1.0)

- Team collaboration features
- Cloud sync
- Export to external formats
- Code generation from specs
- AI-assisted implementation planning

## Features

### Setup Phase

Features used during project initialization and configuration.

| ID  | Feature              | Description                                                                                                                                                                                                  | Status         |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| F6  | Project Constitution | Optional governing principles document that guides AI decision-making. Defines coding standards, security policies, UX patterns, and tech constraints. AI agents reference this for all artifact generation. | ✅ Implemented |
| F12 | Agent Hooks          | Event-driven automations triggered by file changes. Supports `onFeatureSave`, `onSchemaChange`, `onAPIChange`, `onComponentChange`, and `preCommit` events.                                                  | ✅ Implemented |
| -   | API Key Setup        | Configuration flow for Anthropic API key. Checks environment variable first, prompts interactively if not found, stores in `~/.foundry/credentials`.                                                         | ✅ Implemented |

### Q&A Phase

Features that enhance the question/answer experience during CPO, Clarify, and CTO workflows.

| ID  | Feature                  | Description                                                                                                                                            | Status         |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| F7  | Automatic Clarify Phase  | AI-driven ambiguity detection that runs after CPO phase completes. Detects vague language, missing edge cases, ambiguous flows, and feature conflicts. | ✅ Implemented |
| F14 | Smart Question Batching  | Groups 2-5 related questions with shared context, reducing mental overhead. Based on Miller's Law (7±2 cognitive limit).                               | ✅ Implemented |
| F15 | Live Spec Preview Panel  | Shows specs updating in real-time as answers are provided. Supports summary, diff view, and full spec modes.                                           | ✅ Implemented |
| F16 | AI Recommendation Badges | AI-suggested answers with confidence levels based on constitution preferences and project context.                                                     | ✅ Implemented |
| F17 | Decision Journal + Undo  | Browsable timeline of all decisions with full undo/redo support.                                                                                       | ✅ Implemented |
| F18 | Impact Preview on Hover  | Shows consequences of selecting an option before committing to an answer.                                                                              | ✅ Implemented |
| F19 | "Why This Question?"     | Context for each question's purpose and how it contributes to the specification.                                                                       | ✅ Implemented |
| F20 | Keyboard Quick Responses | Rapid answering via keyboard shortcuts (e.g., press 1-4 for single choice options).                                                                    | ✅ Implemented |

### Management Phase

Features for reviewing, refining, and validating generated specifications.

| ID  | Feature                  | Description                                                                                                                      | Status         |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| F1  | Global Search            | Text search across all spec content (features, entities, endpoints, components). Results grouped by type with text highlighting. | ✅ Implemented |
| F2  | Validation Engine        | Real-time validation of DBML schemas, OpenAPI/GraphQL specs with clear error reporting.                                          | ✅ Implemented |
| F3  | Artifact Export          | Export generated artifacts in JSON/YAML formats for external tools.                                                              | ✅ Implemented |
| F4  | Cross-References         | Navigate relationships between artifacts - see which features use an entity, which components belong to a feature.               | ✅ Implemented |
| F5  | Batch Operations         | Bulk edit, move, or delete multiple features, entities, or components at once.                                                   | ✅ Implemented |
| F8  | Task Breakdown           | Break implementation steps into manageable tasks with dependencies and complexity estimates.                                     | ✅ Implemented |
| F9  | Enhanced Analyzer        | Deep analysis of specification consistency - constitution compliance, naming conventions, cross-artifact coherence.              | ✅ Implemented |
| F10 | Implementation Checklist | Auto-generated checklist from acceptance criteria with manual verification tracking.                                             | ✅ Implemented |

### Maintenance Phase

Features for keeping specifications aligned with evolving codebase.

| ID  | Feature         | Description                                                                                                                                                                | Status         |
| --- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| F11 | Lessons Learned | AI-maintained feedback loop document that logs corrected errors and patterns. AI checks this before generating similar artifacts. Stored in `.foundry/lessons-learned.md`. | ✅ Implemented |
| F13 | Actualize       | Periodic analysis of implemented code vs specification. Identifies gaps, suggests updates, user approves before applying. Uses Opus for complex code analysis.             | 🚧 In Progress |
| -   | Git Integration | Tight integration with Git: commit specs, branch management, pull/push, diff viewer, conflict resolution with guidance.                                                    | ✅ Implemented |
