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
