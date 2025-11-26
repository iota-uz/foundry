---
description: "Build a feature specification interactively, output via ExitPlanMode"
model: opus
disable-model-invocation: true
---

Build a feature specification in memory. Suggest options, research the codebase, explore alternatives. Never decide for the user.

**Rules:**

- Use `AskUserQuestion` for decisions not explicitly stated (present 2-4 options with tradeoffs)
- Run `Explore` agent before presenting options to ground them in codebase patterns
- If user says "you decide", present your recommendation with rationale and ask to confirm
- Mark unresolved items with `[TBD]`
- Document rationale for every significant choice
- Reference existing codebase patterns rather than inventing new ones
- If user provides context upfront, skip redundant questions and acknowledge what's already known

## Phase 1: Initial Capture

If the user hasn't described the feature, ask: "What feature would you like to specify?"

From the feature description, identify:

- Core problem being solved
- Initial scope boundaries
- Constraints or dependencies mentioned

Run `Explore` agent (haiku) to find:

- Similar features (grep related keywords)
- Domain patterns in `modules/*/domain/` and `modules/*/services/`
- GraphQL types in `*.graphql` files
- Related migrations in `migrations/`

Summarize findings, then use `AskUserQuestion` to confirm understanding.

## Phase 2: Spec Structure

Use `AskUserQuestion` to confirm the spec name (suggest kebab-case name derived from the feature).

Determine which sections apply based on feature type:

- **All features:** Overview, Problem Statement, Goals/Non-Goals, Requirements, Technical Design, Edge Cases, Testing Strategy
- **Backend-only:** Skip UX Design
- **New integrations:** Include Decisions log for library/API choices

## Phase 3: Requirements

Gather requirements using `AskUserQuestion`:

- **Scope:** What's in? What's explicitly out? Future phases?
- **Users:** Which roles? What flows? How often?
- **Data:** What's stored? Transformations? Relationships?
- **Integrations:** External APIs? Internal module dependencies? Events emitted/consumed?

Batch related questions into single `AskUserQuestion` calls (max 4 questions per call).

Run `Explore` to find how existing features handle similar aspects.

## Phase 4: Technical Decisions

Run `Explore` to research patterns, then use `AskUserQuestion` for:

- **Architecture:** New aggregate/entity? Which module?
- **Database:** New tables? Indexes needed?
- **API:** GraphQL mutations/queries? HTMX endpoints?
- **Permissions:** Which roles can access? New permissions needed?

For choices affecting multiple modules or introducing new patterns, present 2-3 options with tradeoffs.

## Phase 5: UX Decisions

**Skip for backend-only features.**

Run `Explore` on `modules/*/presentation/templates/` for patterns, then use `AskUserQuestion`:

- **Flow:** Entry points? Page/modal/drawer? Steps?
- **States:** Loading, empty, error, success behaviors?
- **Forms:** Fields, validation rules, error messages?

## Phase 6: Library Research

**Skip if no new libraries needed.**

Check `go.mod` and `package.json` for existing solutions first.

If new library needed, use `researcher` agent to evaluate:

- Last commit date (prefer < 6 months)
- GitHub stars and issue resolution
- Documentation quality
- License compatibility

Summarize findings, then use `AskUserQuestion` to choose.

## Phase 7: Edge Cases

Use `AskUserQuestion` for scenarios relevant to this feature:

- Concurrent operations / race conditions (if shared state)
- Partial failures / rollback (if multi-step operations)
- Permission denied handling (if role-restricted)
- Invalid input / state transitions (if complex workflows)
- Network failures (if external integrations)

## Phase 8: Generate Output

Build the complete spec following the structure in @.claude/guides/spec/single-file.md

Populate all sections based on decisions made. Use `[TBD]` for unresolved items.

Present the complete spec, then use `AskUserQuestion` to approve or request changes.

Once approved, call `ExitPlanMode` with the final spec as the `plan` parameter.
