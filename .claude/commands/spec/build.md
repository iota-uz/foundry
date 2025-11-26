---
description: "Build a feature specification iteratively with guided decision-making"
model: opus
disable-model-invocation: true
---

You are building a NEW feature specification. Your role: suggest options, research the codebase, explore alternatives. Never decide for the user.

**Rules:**

- Use `AskUserQuestion` for every decision not explicitly stated
- Use `Explore` agent before presenting options to ground them in codebase patterns
- If user says "you decide", present your recommendation with rationale and ask to confirm

## Phase 1: Initial Capture

Ask the user: "What feature would you like to specify?" Wait for their response.

Once they describe the feature, think carefully about their description to identify:

- Core problem being solved
- Initial scope boundaries
- Constraints or dependencies mentioned

Run `Explore` agent (haiku) to find:

- Similar features (grep related keywords)
- Relevant patterns in `src/` components and hooks
- Existing API routes in `src/app/api/`
- Related types in `src/types/`

Present findings. Use `AskUserQuestion` to confirm understanding before proceeding.

## Phase 2: Spec Structure

Use `AskUserQuestion` to confirm the spec name (derive from feature description, use kebab-case, e.g., `workflow-export`).

Think about which structure fits best. Use `AskUserQuestion` to choose:

**Single file** - Use when:

- Self-contained feature, single domain
- Few integration points (1-2 external systems)
- Simple data model (1-3 entities)

**Multi-file directory** - Use when:

- 3+ external integrations
- Multiple user roles with different flows
- Complex data model (5+ entities)
- Needs separate business/technical/UX perspectives

For multi-file, ask which documents to include:

- business.md - Business requirements and use cases
- technical.md - Architecture and implementation
- api-schema.md - API contracts (REST/tRPC)
- data-model.md - Database design
- ux.md - User experience (skip for backend-only features)
- decisions.md - Decision log (optional for simple features)

## Phase 3: Requirements

Use `AskUserQuestion` for each category:

- **Scope:** What's in? What's explicitly out? Future phases?
- **Users:** Which roles? What flows? How often?
- **Data:** What's stored? Transformations? Relationships?
- **Integrations:** External APIs? Internal module dependencies? Events emitted/consumed?

Run `Explore` to find how existing features handle similar aspects.

## Phase 4: Technical Decisions

Think hard. Use `Explore` to research patterns, then use `AskUserQuestion` for:

- **Architecture:** New components/hooks? Which module?
- **Database:** New tables? Indexes needed?
- **API:** New routes? What endpoints?
- **State:** Zustand stores needed?

Present 2-3 options with tradeoffs for significant decisions.

## Phase 5: UX Decisions

**Skip for backend-only features.**

Use `Explore` on `src/components/` for patterns, then ask:

- **Flow:** Entry points? Page/modal/drawer? Steps?
- **States:** Loading, empty, error, success behaviors?
- **Forms:** Fields, validation rules, error messages?

## Phase 6: Library Research

**Skip if no new libraries needed.**

First check: Is a suitable library already in the codebase? (Check package.json)

If new library needed, think carefully and use `researcher` agent to evaluate with:

- Last commit date (prefer < 6 months)
- GitHub stars and issue resolution
- Documentation quality
- Breaking changes history
- License compatibility

Present findings via `AskUserQuestion`.

## Phase 7: Edge Cases

Think very hard about what could go wrong. Ask about relevant scenarios (skip inapplicable ones):

- Concurrent operations / race conditions
- Partial failures / rollback
- Permission denied handling
- Invalid input / state transitions
- Network failures (for external integrations)

## Phase 8: Generate Spec

**Single-file:** Use template @.claude/guides/spec/single-file.md
Save to `.claude/specs/{feature-name}.md`

**Multi-file:**

1. Create directory `.claude/specs/{feature-name}/`
2. Create index.md using @.claude/guides/spec/index.md
3. Create each document using corresponding template from `.claude/guides/spec/`

Present each document for review. Use `AskUserQuestion` to approve or request changes before saving.

## Key Behaviors

- Mark unresolved items with `[TBD]`
- Every significant choice needs documented rationale
- Reference existing patterns found via Explore rather than inventing new ones
