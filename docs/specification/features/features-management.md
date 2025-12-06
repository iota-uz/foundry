---
layout: default
title: Management Phase Features
nav_order: 12
parent: Specification
---

# Management Phase Features

**Status:** Draft
**Last Updated:** 2025-11-26

## Overview

Features for reviewing, refining, and validating generated specifications. These features help maintain quality and consistency after Q&A workflows complete.

**When to Use:** After Q&A workflows complete, during ongoing spec editing and refinement.

---

## Discovery & Navigation

### F1: Global Search

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/search.ts` - Search engine and indexing
- `src/app/api/search/route.ts` - Search API endpoint
- `src/components/SearchBar.tsx` - Search UI component
- `src/store/search.ts` - Search state management
- `src/lib/search-filters.ts` - Search filtering and result grouping

#### Description

Simple text search across all spec content to quickly find features, entities, endpoints, and components.

#### Requirements

**Functional:**
- Search all text content in `.foundry/` directory
- Return results grouped by type (feature, entity, endpoint, component)
- Highlight matching text in results
- Click result to navigate to artifact

**Scope:**
- Features (name, description, implementation plan)
- Schema entities (table names, field names)
- API endpoints (paths, operation names)
- UI components (names, HTML content)
- Conversation history (searchable via SQLite FTS)

#### Implementation Details

**Search Scope (Resolved):**
- **Decision:** Conversation history opt-in via filter toggle
- Default search: Features, entities, endpoints, components (file-based content)
- Optional filter: "Include conversation history" checkbox
- Rationale: Conversation history can be noisy; opt-in keeps results focused

**Debounce Timing (Resolved):**
- **Decision:** 200ms debounce for live search
- Balances responsiveness with performance
- Shorter than typical 300ms: Foundry's local file search is fast
- Cancel pending search on new input
- Show "searching..." indicator after 100ms

---

### F4: Cross-References

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/cross-reference.ts` - Reference graph and navigation
- `src/components/CrossRefViewer.tsx` - Cross-reference UI component
- `src/app/api/cross-refs/route.ts` - Cross-reference API endpoints
- `src/store/references.ts` - Reference state management
- `src/lib/dependency-analyzer.ts` - Artifact dependency analysis

#### Description

Navigate relationships between artifacts - see which features use an entity, which components belong to a feature, etc.

---

## Quality Assurance

### F2: Validation Engine

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/validators/index.ts` - Core validation engine
- `src/lib/validators/schema.ts` - DBML schema validation
- `src/lib/validators/api.ts` - OpenAPI/GraphQL validation
- `src/app/api/validate/route.ts` - Validation API endpoints
- `src/components/ValidationReport.tsx` - Validation results UI

#### Description

Real-time validation of all artifacts with clear error reporting.

---

### F9: Enhanced Consistency Analyzer

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/consistency-analyzer.ts` - Consistency checking engine
- `src/lib/naming-conventions.ts` - Naming pattern validation
- `src/lib/constitution-checker.ts` - Constitution compliance checks
- `src/app/api/analyze/consistency/route.ts` - Analysis API endpoints
- `src/components/AnalysisReport.tsx` - Analysis results UI

#### Description

Deep analysis of specification consistency, checking constitution compliance, naming conventions, and cross-artifact coherence.

---

### F10: Implementation Checklist

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/checklist-generator.ts` - Checklist generation from criteria
- `src/components/ChecklistView.tsx` - Checklist UI component
- `src/app/api/checklists/route.ts` - Checklist API endpoints
- `src/store/checklists.ts` - Checklist state management
- `src/lib/progress-tracker.ts` - Completion tracking

#### Description

Auto-generated checklist from acceptance criteria with manual verification tracking.

---

## Artifact Management

### F3: Artifact Export

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/exporters/index.ts` - Export engine and format handlers
- `src/lib/exporters/json.ts` - JSON export handler
- `src/lib/exporters/yaml.ts` - YAML export handler
- `src/app/api/export/route.ts` - Export API endpoint
- `src/components/ExportDialog.tsx` - Export options UI

#### Description

Export generated artifacts in various formats for external tools.

---

### F5: Batch Operations

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/batch-operations.ts` - Batch operation engine
- `src/components/BatchOperationsPanel.tsx` - Batch operations UI
- `src/app/api/batch/route.ts` - Batch operations API endpoint
- `src/store/batch.ts` - Batch operations state management
- `src/lib/transaction-manager.ts` - Transactional batch execution

#### Description

Bulk edit, move, or delete multiple features, entities, or components at once.

---

### F8: Task Breakdown

**Status:** ✅ Implemented

#### Key Implementation Files

- `src/lib/task-generator.ts` - Task generation from implementation steps
- `src/components/TaskBreakdown.tsx` - Task breakdown UI component
- `src/app/api/tasks/route.ts` - Task management API endpoints
- `src/store/tasks.ts` - Task state management
- `src/lib/dependency-resolver.ts` - Task dependency resolution

#### Description

Break implementation steps into manageable tasks with dependencies and complexity estimates.

---

## Dependencies

- **F1 (Search)** enables discovery for all other management features
- **F2-F10** work together to maintain specification quality and consistency
