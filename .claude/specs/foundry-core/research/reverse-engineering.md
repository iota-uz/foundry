# Reverse Engineering Research

**Status:** Research Complete
**Last Updated:** 2025-11-25

## Overview

Foundry's reverse engineering mode analyzes existing codebases to extract specifications. The approach is **AI-driven and language-agnostic** - Claude reads and interprets any text-based code without hardcoded parsers.

## Design Philosophy

### AI-Driven Analysis

**Approach:** Claude Agent SDK powers all code analysis. No language-specific parsers.

**Advantages:**
- Works with any programming language
- Understands custom patterns and abstractions
- No maintenance burden for parser updates
- Can interpret comments, naming conventions, documentation

**Trade-offs:**
- Less precise than AST parsing for known languages
- Depends on AI model capabilities
- May need user clarification for ambiguous patterns

### Language Agnostic

**Approach:** Treat all code as text that Claude interprets.

**What Claude Analyzes:**
- Source code files (any extension)
- Configuration files (yaml, json, toml, etc.)
- SQL files and migrations
- Documentation and comments
- Directory structure and naming

## Analysis Phases

### Phase 1: Project Discovery

**Goal:** Understand project structure and technology stack.

**AI Instructions:**
```
Analyze the project directory structure and identify:
1. Programming language(s) used
2. Framework(s) detected (web, API, CLI, etc.)
3. Database technology if any
4. Build/package management system
5. Key directories and their purposes

Look for:
- Package files (package.json, go.mod, requirements.txt, Cargo.toml, etc.)
- Framework config files
- Source code directories
- Test directories
- Migration/schema directories
```

**Output:**
```yaml
discovery:
  languages:
    - name: "TypeScript"
      confidence: high
      indicators: ["tsconfig.json", ".ts files"]
    - name: "SQL"
      confidence: medium
      indicators: ["migrations/ directory"]

  frameworks:
    - name: "Next.js"
      confidence: high
      indicators: ["next.config.js", "app/ directory"]

  database:
    - name: "PostgreSQL"
      confidence: medium
      indicators: ["prisma schema", "pg connection string"]

  structure:
    source: "src/"
    components: "src/components/"
    api: "src/app/api/"
    migrations: "prisma/migrations/"
```

### Phase 2: Schema Extraction

**Goal:** Extract database schema and generate DBML.

**AI Instructions:**
```
Find and analyze database schema definitions:

1. Look for ORM model files (any language):
   - Class/struct definitions with database annotations
   - Schema definition files
   - Entity/model directories

2. Look for SQL schema files:
   - Migration files (CREATE TABLE, ALTER TABLE)
   - Schema dump files
   - Seed files with INSERT statements

3. Look for schema configuration:
   - ORM config files (prisma.schema, etc.)
   - Database connection configs

For each entity found, extract:
- Entity/table name
- Fields with types
- Primary keys
- Foreign keys and relationships
- Indexes and constraints
- Comments/descriptions

Generate DBML output format.
```

**Confidence Indicators:**
- **High:** Explicit schema definition (Prisma, SQL DDL)
- **Medium:** ORM decorators/annotations
- **Low:** Inferred from code usage

### Phase 3: API Extraction

**Goal:** Extract API endpoints and generate OpenAPI spec.

**AI Instructions:**
```
Find and analyze API endpoint definitions:

1. Look for route/endpoint definitions:
   - Router configurations
   - Controller/handler files
   - API directory structures
   - Decorator-based routes

2. For each endpoint, extract:
   - HTTP method (GET, POST, PUT, DELETE, etc.)
   - URL path (including parameters)
   - Request body structure (if any)
   - Response structure (if determinable)
   - Authentication requirements (if visible)

3. Look for GraphQL schemas:
   - .graphql files
   - Code-first schema definitions
   - Type definitions

Generate OpenAPI 3.0 format for REST.
Generate GraphQL SDL for GraphQL.
```

**Pattern Recognition:**
- File-based routing (Next.js, SvelteKit, etc.)
- Explicit route registration (Express, Chi, Flask, etc.)
- Decorator-based routing (NestJS, FastAPI, etc.)
- Convention-based routing (Rails, Django, etc.)

### Phase 4: Component Extraction

**Goal:** Extract UI component inventory.

**AI Instructions:**
```
Find and analyze UI components:

1. Identify component directories:
   - Common patterns: components/, ui/, views/, pages/
   - Framework-specific locations

2. For each component, extract:
   - Component name
   - Type (page vs reusable component)
   - Props/inputs if determinable
   - Route association (for pages)

3. Capture component HTML/template:
   - Extract the render/template portion
   - Preserve styling classes
   - Note component dependencies

Output component inventory with:
- Name, type, file path
- Props list (if determinable)
- Route (for pages)
- HTML snapshot (template content)
```

### Phase 5: Dependency Analysis

**Goal:** Extract and categorize dependencies.

**AI Instructions:**
```
Find and analyze project dependencies:

1. Locate package/dependency files:
   - package.json (Node.js)
   - go.mod (Go)
   - requirements.txt / pyproject.toml (Python)
   - Cargo.toml (Rust)
   - pom.xml / build.gradle (Java)
   - Gemfile (Ruby)
   - Any other dependency manifest

2. For each dependency, determine:
   - Name and version
   - Category (framework, database, UI, utility, dev tool)
   - Purpose (based on known libraries or README)

3. Identify internal module dependencies:
   - Import patterns between directories
   - Module boundaries
```

### Phase 6: Architecture Synthesis

**Goal:** Generate data flow and architecture diagrams.

**AI Instructions:**
```
Based on all extracted information, synthesize:

1. Data Flow Diagram:
   - Entry points (UI, API endpoints)
   - Service/business logic layers
   - Data access patterns
   - External integrations

2. Module Dependencies:
   - Which modules depend on which
   - Circular dependency detection
   - Layer violations

3. Architecture Pattern:
   - Identify pattern (MVC, Clean Architecture, etc.)
   - Note deviations or hybrid approaches
```

## Streaming Progress

### Event Types

```typescript
interface ProgressEvent {
  phase: 'discovery' | 'schema' | 'api' | 'components' | 'dependencies' | 'architecture';
  status: 'started' | 'progress' | 'completed' | 'error';
  message: string;
  artifact?: ExtractedArtifact;  // Partial result
  confidence?: 'high' | 'medium' | 'low';
}
```

### User Feedback Loop

**During Analysis:**
```
┌─────────────────────────────────────────────────────────────┐
│ Analyzing Codebase                                          │
├─────────────────────────────────────────────────────────────┤
│ ✓ Project Discovery                                         │
│   Detected: TypeScript, Next.js, PostgreSQL                 │
│                                                             │
│ ● Schema Extraction (in progress)                           │
│   Found: 5 entities so far...                               │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ Question: I found two schema sources:               │  │
│   │ - prisma/schema.prisma                              │  │
│   │ - migrations/*.sql                                  │  │
│   │                                                     │  │
│   │ Which should I treat as the source of truth?        │  │
│   │                                                     │  │
│   │ ○ Prisma schema (recommended for Prisma projects)   │  │
│   │ ○ SQL migrations                                    │  │
│   │ ○ Merge both (may have conflicts)                   │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│ ○ API Extraction (pending)                                  │
│ ○ Component Extraction (pending)                            │
│ ○ Dependency Analysis (pending)                             │
│                                                             │
│ [Cancel]                                          [Pause]   │
└─────────────────────────────────────────────────────────────┘
```

## Confidence & Verification

### Confidence Levels

| Level | Meaning | UI Indicator |
|-------|---------|--------------|
| High | Explicit definition found | ✓ Green |
| Medium | Inferred from patterns | ⚠ Yellow |
| Low | Best guess, needs review | ? Orange |

### Verification Workflow

Each extracted artifact includes:
- Source file and line reference
- Confidence level
- "Verify" button to review source
- "Edit" button to correct

```yaml
entity:
  name: User
  confidence: high
  source: prisma/schema.prisma:15
  fields:
    - name: id
      type: uuid
      confidence: high
    - name: metadata
      type: jsonb
      confidence: medium  # Inferred from usage
      needs_review: true
```

## Open Questions

### File Size Limits

**Question:** How large of files can Claude effectively analyze?

**Considerations:**
- Context window limits
- Processing time
- Cost per analysis

**Recommendation:**
- Chunk large files (>500 lines)
- Prioritize key sections (schema definitions, route handlers)
- Summarize less critical files

### Binary Files

**Question:** How to handle non-text files?

**Approach:**
- Skip binary files
- Note their existence in dependency analysis
- Flag if they appear to be relevant (e.g., SQLite database files)

### Ambiguity Resolution

**Question:** When should AI ask vs guess?

**Recommendation:**
- Ask when confidence is "low" and decision affects many artifacts
- Guess when confidence is "medium" and impact is limited
- Always mark guesses as "needs review"

### Cost Management

**Question:** RE mode may require many AI calls. How to manage?

**Options:**
1. Fixed budget per analysis (warn when approaching)
2. Tiered analysis (quick scan vs deep analysis)
3. Caching of common pattern recognition

**Recommendation:** Tiered analysis
- Quick scan: Structure discovery, high-confidence extractions only
- Deep analysis: Full extraction with all phases

## Recommendations

### 1. Discovery First, Always

**Rationale:**
- Gives AI context for subsequent phases
- Sets user expectations
- Identifies potential issues early

### 2. Stream Partial Results

**Rationale:**
- User sees progress immediately
- Can course-correct if AI misunderstands
- Better UX than waiting for completion

### 3. Confidence Everywhere

**Rationale:**
- User knows what to trust
- Focuses verification effort
- Honest about AI limitations

### 4. Source Links Required

**Rationale:**
- Every artifact traces to source
- Enables verification
- Builds trust in extraction

### 5. Allow Corrections

**Rationale:**
- AI will make mistakes
- User can fix without re-running
- Corrections improve final spec

## AI Tool Definition

```typescript
const codeAnalysisTool = {
  name: 'analyze_codebase',
  description: 'Analyze a codebase directory to extract specifications',
  parameters: {
    targetPath: { type: 'string', description: 'Path to analyze' },
    phase: {
      type: 'string',
      enum: ['discovery', 'schema', 'api', 'components', 'dependencies', 'architecture', 'all']
    },
    depth: {
      type: 'string',
      enum: ['quick', 'thorough'],
      default: 'thorough'
    }
  }
};
```

## Related Resources

- [Claude's Code Understanding](https://www.anthropic.com/research/claude-code-understanding)
- [DBML Specification](https://dbml.dbdiagram.io/docs/)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
