# Retired Spec-Building Code

**Date Retired:** 2025-12-25
**Reason:** Transitioning from spec-building tool to N8N-style visual workflow builder for Claude Code

## What Was Retired

This folder contains the original spec-building functionality including:

- **Workflows**: CPO/Clarify/CTO phase workflows, main orchestration, generators
- **Q&A Interface**: Question cards, answer inputs, progress indicators
- **Module/Feature Management**: CRUD operations, checklists, dependencies
- **Artifacts**: Schema viewers, OpenAPI/GraphQL editors, component gallery
- **Constitution & Lessons**: Project constitution editor, lessons learned
- **Actualization**: Code generation from specs

## File Structure

The code is preserved in its original folder structure:

```
_retired/src/
├── app/           # Pages and API routes
├── components/    # React components
├── lib/           # Utilities, parsers, DB queries
├── services/      # Business logic services
├── store/         # Zustand stores
├── types/         # TypeScript types
└── schemas/       # Zod validation schemas
```

## File Count

~178 files organized by original location.

## How to Reference

Import paths remain the same but prefixed with `_retired/`:

```typescript
// Original
import { SpecService } from '@/services/core/spec.service';

// Reference from retired
import { SpecService } from '@/_retired/src/services/core/spec.service';
```

## Reactivation

To reactivate any component:

1. Copy the file back to its original location in `src/`
2. Update the barrel export (`index.ts`) in the target folder
3. Resolve any dependency changes (imports may have changed)
4. Run `bun typecheck` and `bun lint` to verify
5. Update navigation/routing if needed

## Related Documentation

- Original specification: `docs/specification/`
- Architecture decisions: `docs/specification/decisions.md`
- Technical spec: `docs/specification/technical.md`

## Why Not Delete?

The spec-building functionality may be reactivated in the future as a complementary feature to the workflow builder. Keeping the code allows for:

- Reference implementation for patterns
- Potential feature restoration
- Historical context for decisions
