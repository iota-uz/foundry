# Retired Documentation

This folder contains documentation for the original spec-building product that has been retired.

**Retirement Date:** 2025-12-25

## What Was Retired

The original Foundry was a "CLI-based technical specification constructor" with:
- Three-phase Q&A workflow (CPO → Clarify → CTO)
- Artifact generation (DBML schemas, OpenAPI specs, UI mockups)
- Reverse engineering of existing codebases
- YAML-based spec files with SQLite storage

## What Replaced It

Foundry has been migrated to a **Visual Workflow Builder** with:
- React Flow-based drag-and-drop canvas
- FSM execution engine with PostgreSQL storage
- Real-time execution visualization via SSE
- Node-based workflow construction

## Folder Contents

- `specification/` - Original product specification documents
  - `business.md` - Business requirements
  - `technical.md` - Technical architecture
  - `api-schema.md` - REST API definitions
  - `data-model.md` - File and database schemas
  - `ux.md` - UI design patterns
  - `qa-flow.md` - AI Q&A flow details
  - `decisions.md` - Decision log
  - `tools.md` - AI tool definitions
  - `research/` - Background research documents

## Reactivation

If you need to reactivate the spec-building functionality:

1. Move `_retired/specification/` back to `docs/specification/`
2. Restore source files from `_retired/src/` in the main `_retired/` folder
3. Update navigation in Jekyll config
4. Review and update any outdated references

## Note

The research documents in `specification/research/` may still be valuable:
- `claude-agent-sdk.md` - Claude SDK patterns
- `react-flow.md` - React Flow implementation
- These remain relevant to the new workflow builder architecture
