---
layout: default
title: Setup Phase Features
nav_order: 10
parent: Specification
---

# Setup Phase Features

**Status:** Draft
**Last Updated:** 2025-11-26

## Overview

Features used during project initialization and configuration. These features help establish the foundation for your Foundry project before beginning the Q&A workflows.

**When to Use:** During first-run setup or when reconfiguring project settings.

---

## F6: Project Constitution

**Status:** ✅ Implemented

### Key Implementation Files

- `src/lib/constitution.ts` - Constitution parsing and validation
- `src/app/api/constitution/route.ts` - Constitution API endpoints
- `src/components/ConstitutionEditor.tsx` - Constitution UI editor
- `src/store/constitution.ts` - Zustand store for constitution state

### Description

Optional governing principles document that guides all AI decision-making. Inspired by GitHub Spec-Kit's constitution concept.

### Requirements

**Content Areas:**
| Area | Purpose | Examples |
|------|---------|----------|
| Coding Standards | Naming, patterns, style | "snake_case for functions" |
| Security | Auth, validation, secrets | "All endpoints require JWT" |
| UX Patterns | Consistency, accessibility | "Show skeleton screens" |
| Tech Constraints | Libraries, versions | "Use date-fns, not moment" |

**Behavior:**
- AI agents reference constitution for all artifact generation
- Optional - projects function without one
- User can create/edit at any time
- Versioned with project

---

## F12: Agent Hooks

**Status:** ✅ Implemented

### Key Implementation Files

- `src/lib/hooks.ts` - Hook system engine and event handling
- `src/app/api/hooks/route.ts` - Hook management API endpoints
- `src/components/HookEditor.tsx` - Hook configuration UI
- `src/store/hooks.ts` - Zustand store for hooks state
- `src/lib/file-watcher.ts` - File system change detection

### Description

Event-driven automations triggered by file changes. Inspired by AWS Kiro's hook system.

### Requirements

**Supported Events:**
| Event | Trigger |
|-------|---------|
| `onFeatureSave` | Feature file saved |
| `onSchemaChange` | DBML schema modified |
| `onAPIChange` | OpenAPI/GraphQL modified |
| `onComponentChange` | HTML component modified |
| `preCommit` | Before git commit |

**Available Actions:**
| Action | Description |
|--------|-------------|
| `validateSchema` | Run DBML/OpenAPI/GraphQL validation |
| `updateChecklist` | Regenerate checklist from criteria |
| `regenerateAPIs` | Update API refs after schema change |
| `runAnalyzer` | Execute consistency analyzer |
| `updateProgress` | Recalculate task progress |

---

## API Key Setup

**Status:** ✅ Implemented

### Key Implementation Files

- `src/lib/api-key.ts` - API key detection and storage
- `src/app/api/setup/route.ts` - Setup flow API endpoints
- `src/components/ApiKeySetup.tsx` - Interactive setup UI
- `src/app/setup/page.tsx` - Setup page for first-run configuration

### Description

Configuration flow for providing Anthropic API key when not set via environment variable.

### Behavior

**Priority order:**
1. Check for `ANTHROPIC_API_KEY` environment variable
2. If not found, prompt user interactively
3. Store prompted key in `~/.foundry/credentials`
4. Supports both developer UX and CI automation

---

## Dependencies

- **F6 (Constitution)** is referenced by:
  - Enhanced Analyzer - Constitution compliance checks
  - F12 (Agent Hooks) - Hook definitions in constitution.yaml
  - AI Recommendation Badges - Constitution preference matching

- **F12 (Agent Hooks)** uses:
  - Validation Engine - validateSchema action
  - Enhanced Analyzer - runAnalyzer action

- **API Key Setup** required for:
  - All AI-driven features and workflows
