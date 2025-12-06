---
description: "Review a spec for completeness and approve for implementation"
argument-hint: "<spec-name>"
model: sonnet
disable-model-invocation: true
---

You are reviewing a specification for completeness and readiness for implementation.

## Available Specs

Single-file: !`ls -1 docs/specification/*.md 2>/dev/null | xargs -I {} basename {} .md || echo "None"`
Multi-file: !`ls -d docs/specification/*/ 2>/dev/null | xargs -I {} basename {} || echo "None"`

## Step 1: Load Spec

Spec argument: $1

- If `$1` provided: Load `docs/specification/$1/` or `docs/specification/$1.md`
- If empty: Use `AskUserQuestion` to select from available specs

## Step 2: Completeness Check

Think hard. Scan all documents for:

**Blockers (must fix):**

- `[TBD]` markers
- Empty sections (heading only, no content)
- Open Questions section with unresolved items
- Decision Log entries missing chosen option

**Warnings (review but may accept):**

- Vague language without specifics ("handle errors", "add validation")
- Missing acceptance criteria for requirements
- Undocumented edge cases

Present findings:

- **Blockers:** count and list with locations
- **Warnings:** count and list with locations

## Step 3: Clarity Check

Think very hard. Verify:

- Requirements are specific and testable
- Technical decisions have rationale
- No contradictions between sections/documents

Flag issues found.

## Step 4: Implementation Readiness

Ultrathink. Verify spec answers:

- What problem does this solve?
- Who are the users and their flows?
- What's in and out of scope?
- What's the data model?
- What's the API contract?
- What permissions are required?
- What edge cases are handled?
- What's the testing approach?

Present checklist with pass/fail for each.

## Step 5: Decision

Use `AskUserQuestion`:

**If blockers exist:**

- Fix blockers now (run `/spec:edit`)
- Defer review

**If no blockers:**

- Approve spec
- Request specific changes
- Approve with warnings noted

## Step 6: Update Status

If approved:

1. Update status to "Approved" in spec header
2. Add approval date (format: YYYY-MM-DD)
3. For multi-file: update `index.md` status

Confirm: "Spec approved: `docs/specification/{name}` - Ready for `/backlog:add`"
