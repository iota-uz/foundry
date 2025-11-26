# AI Tools & Model Selection

**Status:** Draft
**Last Updated:** 2025-11-26

## Overview

This document defines Foundry's AI architecture using a **workflow-based** approach:
- **Workflows** for sequential tasks with deterministic step sequences and bounded LLM calls
- **Workflow steps** include: Code (pure logic), LLM (bounded AI calls), Question (user input), Conditional, Loop, Nested
- **Custom tools** (MCP) for pure logic/data operations (no model calls)
- **SDK built-in tools** for file operations, search, and web access

**Reference Documentation:** For complete Claude SDK API reference, see [research/claude-agent-sdk-apis.md](research/claude-agent-sdk-apis.md)

### Why Workflows Instead of Agents

| Benefit | Description |
|---------|-------------|
| **Maximum Predictability** | Every step explicitly defined, no hallucinated tool calls |
| **Cost Control** | LLM calls bounded and predictable, can estimate cost per workflow |
| **Better Testing** | Unit test individual steps, mock LLM responses |
| **Clear Debugging** | Full execution history, step-by-step tracing |
| **Retry Granularity** | Can retry individual steps, not entire conversations |
| **Timeout Handling** | Each step has explicit timeout |
| **Auditability** | Compliance-friendly logging, decision points visible |

---

## AI Model Selection

### Model Usage by Task

| Task | Model | Rationale |
|------|-------|-----------|
| CPO Q&A | Sonnet 4.5 | Good balance of speed and quality for product discussions |
| Clarify Phase | Sonnet 4.5 | Fast ambiguity detection, sufficient for language analysis |
| CTO Q&A | Sonnet 4.5 | Technical decisions need quality but not maximum depth |
| Schema Generation | Sonnet 4.5 | Structured output, patterns are well-defined |
| API Generation | Sonnet 4.5 | Template-based generation |
| Component Generation | Sonnet 4.5 | HTML/CSS patterns are straightforward |
| Reverse Engineering | **Opus 4.5** | Complex codebase analysis requires deepest reasoning |
| Actualize (Spec Sync) | **Opus 4.5** | Comparing code to specs requires nuanced understanding |
| Consistency Analysis | Haiku 4.5 | Fast validation checks, simple pattern matching |

### Model Configuration

```typescript
interface ModelConfig {
  default: 'claude-sonnet-4.5-20250514';
  tasks: {
    cpo_qa: 'claude-sonnet-4.5-20250514';
    clarify: 'claude-sonnet-4.5-20250514';
    cto_qa: 'claude-sonnet-4.5-20250514';
    reverse_engineering: 'claude-opus-4.5-20250514';
    actualize: 'claude-opus-4.5-20250514';
    analysis: 'claude-haiku-4.5-20250514';
  };
  // User can override in constitution.yaml
  overrides?: Partial<ModelConfig['tasks']>;
}
```

### Cost Considerations

- **Opus**: Use sparingly - reverse engineering, actualize, complex debugging
- **Sonnet**: Default for most interactive tasks
- **Haiku**: Background validation, simple checks, high-volume operations

---

## Workflow Definitions

Workflows are deterministic step sequences executed by the WorkflowEngine. Each workflow defines:
- **Steps**: Ordered sequence of operations (code, LLM, question, conditional, loop, nested)
- **Topics**: Logical groupings for Q&A workflows (CPO, CTO)
- **Model**: Which Claude model to use for LLM steps
- **Output schema**: Structured output format for validation

### Step Types

```typescript
type WorkflowStep =
  | CodeStep          // Pure code execution (handlers)
  | LLMStep           // Single bounded LLM call with structured output
  | QuestionStep      // User interaction via AskUserQuestion
  | ConditionalStep   // Branching based on state
  | LoopStep          // Iteration over collections
  | NestedWorkflowStep; // Invoke another workflow

interface LLMStep {
  type: 'llm';
  id: string;
  model: 'sonnet' | 'opus' | 'haiku';
  systemPromptFile: string;    // Path to .hbs file in .foundry/prompts/
  userPromptFile: string;      // Path to .hbs file in .foundry/prompts/
  outputSchema: ZodSchema;     // Enforced structured output
  maxTokens: number;
  timeout: number;
  next: string;                // Next step ID
}

interface QuestionStep {
  type: 'question';
  id: string;
  topicId: string;
  aiGenerated: boolean;        // If true, LLM generates question text
  questionType: 'single_choice' | 'multiple_choice' | 'text' | 'code';
  targetField: string;         // Dot notation spec path to save answer
  next: string;
}
```

### Constitution Injection

The project constitution (if exists) is automatically injected into every LLM step's system prompt.

**Process:**
1. Load system prompt file from `.foundry/prompts/{systemPromptFile}`
2. Compile Handlebars template with workflow state as context
3. Append constitution to compiled prompt
4. Send final prompt to Claude

```typescript
function buildLLMPrompt(compiledSystemPrompt: string, constitution?: Constitution): string {
  if (!constitution) return compiledSystemPrompt;

  return `${compiledSystemPrompt}

## Project Constitution

${formatConstitution(constitution)}

You MUST follow all constitution rules.`;
}
```

---

### Prompt Files and Handlebars Templates

All LLM step prompts are stored as Handlebars templates in `.foundry/prompts/`.

#### File Organization

All prompt files are stored in a single flat directory:
- Location: `.foundry/prompts/`
- Naming: `{workflow}-{operation}-{type}.hbs`
- Examples:
  - `cpo-generate-question-system.hbs`
  - `cto-generate-question-user.hbs`
  - `schema-generator-system.hbs`

#### Handlebars Syntax

Prompts use basic Handlebars templating:
- **Variables**: `{{variableName}}` - Access workflow state
- **Conditionals**: `{{#if condition}}...{{/if}}` - Conditional content
- **Nested access**: `{{object.property}}` - Dot notation for nested values

**Example template:**
```handlebars
Generate a question for: {{currentTopic.name}}

{{#if answersSummary}}
Previous context: {{answersSummary}}
{{/if}}

Your task: Generate one clear question.
```

#### Template Context

Templates receive workflow state as context:
- `currentTopic` - Current topic/feature being explored
- `answers` - Accumulated answers from previous questions
- `answersSummary` - Formatted summary of previous answers
- `phase` - Current workflow phase (cpo, clarify, cto)
- `model` - Which Claude model is being used
- All other workflow state variables

#### File Path Resolution

Paths in `systemPromptFile` and `userPromptFile` are relative to `.foundry/prompts/`:
- `cpo-generate-question-system.hbs` → `.foundry/prompts/cpo-generate-question-system.hbs`
- No subdirectories or absolute paths

#### Compilation Flow

```
1. WorkflowEngine encounters LLMStep
2. Load systemPromptFile from .foundry/prompts/
3. Compile with Handlebars (inject workflow state as context)
4. Append constitution (if exists)
5. Load userPromptFile from .foundry/prompts/
6. Compile with Handlebars (inject workflow state as context)
7. Call Claude SDK with compiled prompts
```

---

### Main Orchestration Workflow

Pure code workflow controller (no LLM orchestration). Manages phase transitions as a state machine.

```yaml
id: main-orchestration
name: Spec Building Orchestration
description: Coordinates all phases - pure code, no LLM

steps:
  - id: start
    type: code
    handler: loadProjectState
    next: check_mode

  - id: check_mode
    type: conditional
    branches:
      - condition: "state.mode === 'reverse'"
        next: run_re_workflow
      - condition: "state.mode === 'new'"
        next: run_cpo_workflow
    default: run_cpo_workflow

  - id: run_cpo_workflow
    type: nested_workflow
    workflowId: cpo-phase
    inputMapping:
      projectId: projectId
      existingAnswers: cpoAnswers
    outputMapping:
      cpoAnswers: cpoAnswers
      features: features
    next: run_clarify_workflow

  - id: run_clarify_workflow
    type: nested_workflow
    workflowId: clarify-phase
    inputMapping:
      cpoAnswers: cpoAnswers
      features: features
    outputMapping:
      clarifiedAnswers: clarifiedAnswers
      ambiguities: resolvedAmbiguities
    next: run_cto_workflow

  - id: run_cto_workflow
    type: nested_workflow
    workflowId: cto-phase
    inputMapping:
      cpoAnswers: clarifiedAnswers
      features: features
    outputMapping:
      techDecisions: techDecisions
      schemas: schemas
      apis: apis
    next: complete

  - id: run_re_workflow
    type: nested_workflow
    workflowId: reverse-engineering
    inputMapping:
      codebasePath: codebasePath
    outputMapping:
      discoveredSpec: discoveredSpec
    next: complete

  - id: complete
    type: code
    handler: finalizeProject
    next: END
```

---

### CPO Phase Workflow

Gathers product requirements through structured topic-based Q&A. Questions are AI-generated within topic constraints.

```yaml
id: cpo-phase
name: CPO Requirements Gathering
model: sonnet  # For question generation steps
estimatedQuestions: 15-25

topics:
  - id: problem-statement
    name: Problem Statement
    description: Core problem being solved
    estimatedQuestions: 2-3
    required: true
    targetFields:
      - business.problemStatement
      - business.painPoints

  - id: target-users
    name: Target Users
    description: Who will use this product
    estimatedQuestions: 2-3
    required: true
    targetFields:
      - business.targetUsers.primary
      - business.targetUsers.technicalLevel

  - id: core-features
    name: Core Features
    description: Main functionality for MVP
    estimatedQuestions: 3-5
    required: true
    targetFields:
      - business.features.mvp
      - business.features.details

  - id: user-flows
    name: User Flows
    description: How users accomplish tasks
    estimatedQuestions: 2-3
    required: true
    targetFields:
      - business.userFlows.primary
      - business.userFlows.alternatives

  - id: priorities
    name: Priority Ranking
    description: Feature prioritization
    estimatedQuestions: 2-3
    required: true
    targetFields:
      - business.priorities.ranking
      - business.priorities.v2

  - id: success-metrics
    name: Success Metrics
    description: How success is measured
    estimatedQuestions: 1-2
    required: false
    targetFields:
      - business.metrics.kpis
      - business.metrics.targets

  - id: competitive-landscape
    name: Competitive Landscape
    description: Market positioning
    estimatedQuestions: 1-2
    required: false
    targetFields:
      - business.competitive.competitors
      - business.competitive.differentiation

  - id: constraints
    name: Constraints & Non-Goals
    description: Explicit scope boundaries
    estimatedQuestions: 1-2
    required: false
    targetFields:
      - business.constraints
      - business.nonGoals

steps:
  - id: topic_loop
    type: loop
    collection: topics
    itemKey: currentTopic
    body: process_topic
    next: check_completeness

  - id: process_topic
    type: code
    handler: initTopicContext
    next: generate_question

  - id: generate_question
    type: llm
    model: sonnet
    systemPrompt: |
      Generate a conversational question for the given topic.
      Reference previous answers where relevant.
      Keep questions under 100 words.
    userPromptTemplate: |
      Topic: {{currentTopic.name}}
      Description: {{currentTopic.description}}
      Previous answers: {{answersSummary}}

      Generate a clear, conversational question.
    outputSchema:
      type: object
      properties:
        question: { type: string }
        questionType: { type: string }
        options: { type: array, optional: true }
    maxTokens: 200
    next: ask_question

  - id: ask_question
    type: question
    topicId: "{{currentTopic.id}}"
    aiGenerated: true
    targetField: "{{currentTopic.targetFields[0]}}"
    next: save_answer

  - id: save_answer
    type: code
    handler: saveAnswerToSpec
    next: check_followup

  - id: check_followup
    type: llm
    model: haiku
    systemPrompt: |
      Determine if a follow-up question is needed.
      Return followUpNeeded: true/false.
    userPromptTemplate: |
      Topic: {{currentTopic.name}}
      Question: {{lastQuestion}}
      Answer: {{lastAnswer}}
    outputSchema:
      type: object
      properties:
        followUpNeeded: { type: boolean }
        followUpQuestion: { type: string, optional: true }
    maxTokens: 100
    next: handle_followup

  - id: handle_followup
    type: conditional
    branches:
      - condition: "state.followUpNeeded && state.topicQuestionCount < 5"
        next: generate_question
    default: LOOP_CONTINUE

  - id: check_completeness
    type: llm
    model: sonnet
    systemPrompt: |
      Review collected answers and identify critical gaps (max 3).
    userPromptTemplate: |
      Collected answers: {{answersSummary}}
      What critical product requirements are missing?
    outputSchema:
      type: object
      properties:
        gaps: { type: array, items: { type: string } }
        complete: { type: boolean }
    maxTokens: 300
    next: handle_gaps

  - id: handle_gaps
    type: conditional
    branches:
      - condition: "state.gaps.length > 0"
        next: address_gaps
    default: show_summary

  - id: address_gaps
    type: loop
    collection: gaps
    itemKey: currentGap
    body: ask_gap_question
    next: show_summary

  - id: ask_gap_question
    type: question
    aiGenerated: false
    questionType: text
    text: "You mentioned {{currentGap}}. Can you provide more details?"
    next: LOOP_CONTINUE

  - id: show_summary
    type: code
    handler: generateCPOSummary
    next: END

output:
  cpoAnswers: Record<string, any>
  features: Feature[]
  summary: CPOSummary
```

---

### CTO Phase Workflow

Defines technical architecture through structured topic-based Q&A. Auto-invokes generators after relevant topics.

```yaml
id: cto-phase
name: CTO Technical Specification
model: sonnet
estimatedQuestions: 20-30

topics:
  - id: tech-stack
    name: Technology Stack
    description: Languages, frameworks, infrastructure
    estimatedQuestions: 3-4
    required: true
    targetFields:
      - technical.stack.language
      - technical.stack.framework
      - technical.constraints.existingSystems

  - id: data-model
    name: Data Model
    description: Entities and relationships
    estimatedQuestions: 4-5
    required: true
    targetFields:
      - technical.dataModel.entities
      - technical.dataModel.fields
      - technical.dataModel.relationships
    onComplete: schema-generator  # Auto-invoke after topic

  - id: api-design
    name: API Design
    description: REST, GraphQL, authentication
    estimatedQuestions: 3-4
    required: true
    targetFields:
      - technical.api.style
      - technical.api.endpoints
      - technical.api.versioning
    onComplete: api-generator  # Auto-invoke after topic

  - id: authentication
    name: Authentication & Authorization
    description: Security model
    estimatedQuestions: 3-4
    required: true
    targetFields:
      - technical.auth.methods
      - technical.auth.oauthProviders
      - technical.auth.roles
      - technical.auth.mfa

  - id: integrations
    name: External Integrations
    description: Third-party dependencies
    estimatedQuestions: 2-3
    required: false
    targetFields:
      - technical.integrations.services
      - technical.integrations.details

  - id: performance
    name: Performance & Scale
    description: Expected load and requirements
    estimatedQuestions: 2
    required: false
    targetFields:
      - technical.performance.users
      - technical.performance.responseTime
      - technical.performance.caching

  - id: deployment
    name: Deployment
    description: Hosting, CI/CD, environments
    estimatedQuestions: 2
    required: false
    targetFields:
      - technical.deployment.cloud
      - technical.deployment.containers
      - technical.deployment.cicd

  - id: ui-components
    name: UI Components
    description: Key screens and interactions
    estimatedQuestions: 3-4
    required: true
    targetFields:
      - technical.ui.framework
      - technical.ui.screens
    onComplete: component-generator  # Auto-invoke after topic

steps:
  - id: topic_loop
    type: loop
    collection: topics
    itemKey: currentTopic
    body: process_topic
    next: finalize

  - id: process_topic
    type: code
    handler: initTopicContext
    next: generate_question

  - id: generate_question
    type: llm
    model: sonnet
    systemPrompt: |
      Generate a technical question for the given topic.
      Reference CPO answers and previous technical decisions.
      For choice questions, provide 3-5 concrete options.
    userPromptTemplate: |
      Topic: {{currentTopic.name}}
      Description: {{currentTopic.description}}
      CPO context: {{cpoSummary}}
      Previous tech decisions: {{techDecisionsSummary}}
    outputSchema:
      type: object
      properties:
        question: { type: string }
        questionType: { type: string }
        options: { type: array }
    maxTokens: 300
    next: ask_question

  - id: ask_question
    type: question
    topicId: "{{currentTopic.id}}"
    aiGenerated: true
    targetField: "{{currentTopic.targetFields[0]}}"
    next: save_answer

  - id: save_answer
    type: code
    handler: saveAnswerToSpec
    next: check_topic_complete

  - id: check_topic_complete
    type: conditional
    branches:
      - condition: "state.topicQuestionCount >= currentTopic.estimatedQuestions"
        next: invoke_generator_if_needed
    default: generate_question

  - id: invoke_generator_if_needed
    type: conditional
    branches:
      - condition: "currentTopic.onComplete"
        next: run_generator
    default: LOOP_CONTINUE

  - id: run_generator
    type: nested_workflow
    workflowId: "{{currentTopic.onComplete}}"
    inputMapping:
      answers: state.answers
      topic: currentTopic
    outputMapping:
      generatedArtifact: "artifacts.{{currentTopic.onComplete}}"
    next: LOOP_CONTINUE

  - id: finalize
    type: code
    handler: generateCTOSummary
    next: END

output:
  techDecisions: Record<string, any>
  schemas: DBMLSchema
  apis: OpenAPISpec | GraphQLSchema
  components: UIComponent[]
```

---

### Clarify Phase Workflow

Detects and resolves ambiguities in specifications. Combines rule-based scanning with LLM categorization.

```yaml
id: clarify-phase
name: Ambiguity Detection and Resolution
model: sonnet

steps:
  - id: scan_for_ambiguities
    type: code
    handler: detectAmbiguities
    description: |
      Rule-based detection:
      - Regex for vague words: "fast", "easy", "user-friendly", "secure"
      - Missing required fields check
      - Edge case pattern detection
    output:
      detectedIssues: DetectedIssue[]
    next: categorize_ambiguities

  - id: categorize_ambiguities
    type: llm
    model: sonnet
    systemPrompt: |
      Categorize each detected ambiguity by severity.
      Generate a clarifying question for each.
      Provide 2-4 suggested answers where applicable.
    userPromptTemplate: |
      Detected issues:
      {{detectedIssues}}

      For each issue, provide:
      - severity (high/medium/low)
      - clarifying question
      - suggested options (2-4)
    outputSchema:
      type: object
      properties:
        ambiguities:
          type: array
          items:
            type: object
            properties:
              issue: { type: string }
              severity: { type: string, enum: [high, medium, low] }
              question: { type: string }
              options: { type: array, items: { type: string } }
              targetField: { type: string }
    maxTokens: 1000
    next: check_ambiguities

  - id: check_ambiguities
    type: conditional
    branches:
      - condition: "state.ambiguities.length === 0"
        next: END
    default: present_ambiguities

  - id: present_ambiguities
    type: code
    handler: showClarifyUI
    description: Display ambiguity summary to user
    next: resolve_loop

  - id: resolve_loop
    type: loop
    collection: ambiguities
    itemKey: currentAmbiguity
    body: resolve_single
    next: END

  - id: resolve_single
    type: question
    aiGenerated: false
    questionType: single_choice
    text: "{{currentAmbiguity.question}}"
    options: "{{currentAmbiguity.options}}"
    context: "Clarifying: {{currentAmbiguity.issue}}"
    allowSkip: true
    next: handle_resolution

  - id: handle_resolution
    type: conditional
    branches:
      - condition: "state.userAnswer === 'SKIP'"
        next: mark_deferred
    default: apply_resolution

  - id: apply_resolution
    type: code
    handler: applyResolutionToSpec
    description: Update spec with user's clarification
    next: LOOP_CONTINUE

  - id: mark_deferred
    type: code
    handler: markAsTBD
    description: Mark for CTO phase resolution
    next: LOOP_CONTINUE

output:
  ambiguities:
    type: array
    items:
      type: object
      properties:
        type: { type: string, enum: [vague_language, missing_edge_case, ambiguous_flow, conflict] }
        severity: { type: string, enum: [high, medium, low] }
        location: { type: object }
        issue: { type: string }
        question: { type: string }
        resolution: { type: string }
        status: { type: string, enum: [resolved, deferred] }
  summary:
    total: number
    resolved: number
    deferred: number
```

---

### RE Workflow (Reverse Engineering)

Analyzes existing codebases to generate specifications. Uses Opus for complex reasoning steps.

```yaml
id: reverse-engineering
name: Codebase Analysis
model: opus  # For analysis steps

steps:
  - id: discover_structure
    type: code
    handler: scanDirectoryStructure
    description: |
      Pure code operations:
      - Glob patterns for file discovery
      - Detect project type (package.json, go.mod, Cargo.toml, etc.)
      - Count files per directory
      - Identify config files and entry points
    output:
      directories: Directory[]
      configFiles: string[]
      entryPoints: string[]
      projectType: string
    next: analyze_architecture

  - id: analyze_architecture
    type: llm
    model: opus
    systemPrompt: |
      Analyze the codebase structure and identify:
      - Module boundaries and responsibilities
      - Architecture patterns (MVC, Clean, Hexagonal, etc.)
      - Core vs utility code distinction
      - Design patterns used
    userPromptTemplate: |
      Project type: {{projectType}}
      Directory tree:
      {{directoryTree}}

      Config files content:
      {{configFilesContent}}

      Analyze the architecture and module structure.
    outputSchema:
      type: object
      properties:
        modules:
          type: array
          items:
            type: object
            properties:
              name: { type: string }
              path: { type: string }
              purpose: { type: string }
        architecture: { type: string }
        patterns: { type: array, items: { type: string } }
    maxTokens: 2000
    next: extract_features_loop

  - id: extract_features_loop
    type: loop
    collection: modules
    itemKey: currentModule
    body: analyze_module
    next: find_schema_files

  - id: analyze_module
    type: code
    handler: loadModuleFiles
    description: Read source files for current module
    next: llm_extract_features

  - id: llm_extract_features
    type: llm
    model: opus
    systemPrompt: |
      Extract features from this module's source code.
      For each feature identify:
      - Name and description
      - Implementation files
      - Confidence level (high/medium/low)
      - Design patterns used
    userPromptTemplate: |
      Module: {{currentModule.name}}
      Purpose: {{currentModule.purpose}}
      Files:
      {{moduleFilesContent}}
    outputSchema:
      type: object
      properties:
        features:
          type: array
          items:
            type: object
            properties:
              name: { type: string }
              description: { type: string }
              files: { type: array }
              confidence: { type: string }
              patterns: { type: array }
    maxTokens: 2000
    next: LOOP_CONTINUE

  - id: find_schema_files
    type: code
    handler: findSchemaFiles
    description: Find migrations, models, ORM definitions
    next: parse_schemas

  - id: parse_schemas
    type: llm
    model: opus
    systemPrompt: |
      Parse database schema definitions.
      Extract entities, fields, types, and relationships.
      Output as DBML format.
    userPromptTemplate: |
      Schema files found:
      {{schemaFilesContent}}

      Convert to DBML format and list entities with relationships.
    outputSchema:
      type: object
      properties:
        dbml: { type: string }
        entities:
          type: array
          items:
            type: object
            properties:
              name: { type: string }
              source: { type: string }
              fields: { type: array }
              relationships: { type: array }
    maxTokens: 3000
    next: find_api_files

  - id: find_api_files
    type: code
    handler: findAPIFiles
    description: Find routes, controllers, handlers
    next: parse_apis

  - id: parse_apis
    type: llm
    model: opus
    systemPrompt: |
      Extract API endpoints from route/handler files.
      Include method, path, parameters, authentication requirements.
      Output as OpenAPI format.
    userPromptTemplate: |
      Route/handler files:
      {{apiFilesContent}}

      Extract all endpoints and convert to OpenAPI paths.
    outputSchema:
      type: object
      properties:
        openapi: { type: string }
        endpoints:
          type: array
          items:
            type: object
            properties:
              method: { type: string }
              path: { type: string }
              handler: { type: string }
              parameters: { type: array }
              authentication: { type: boolean }
    maxTokens: 3000
    next: compile_report

  - id: compile_report
    type: code
    handler: compileREResults
    description: Assemble all analysis into final report
    next: END

output:
  structure:
    directories: Directory[]
    entryPoints: string[]
    configFiles: string[]
  features: Feature[]
  schema:
    entities: Entity[]
    dbml: string
  api:
    endpoints: Endpoint[]
    openapi: string
  dependencies:
    runtime: Dependency[]
    dev: Dependency[]
```

---

### Actualize Workflow

Synchronizes specifications with codebase implementation. Detects drift and offers resolution options.

```yaml
id: actualize
name: Spec-Code Synchronization
model: opus

steps:
  - id: load_current_spec
    type: code
    handler: loadCurrentSpec
    description: Read all spec files into memory
    output:
      specFeatures: Feature[]
      specSchema: Schema
      specAPI: API
    next: run_re_analysis

  - id: run_re_analysis
    type: nested_workflow
    workflowId: reverse-engineering
    inputMapping:
      codebasePath: codebasePath
    outputMapping:
      currentCodeState: discoveredSpec
    next: compute_structural_diffs

  - id: compute_structural_diffs
    type: code
    handler: computeDiffs
    description: |
      Structural comparison:
      - Entity name/field matching
      - Endpoint path matching
      - Feature name similarity
    output:
      structuralDiffs: StructuralDiff[]
    next: semantic_comparison

  - id: semantic_comparison
    type: llm
    model: opus
    systemPrompt: |
      Compare spec to code and determine semantic equivalence.
      For each diff, determine if:
      - Code correctly implements spec (different naming but same concept)
      - Spec is outdated (code has evolved)
      - Feature is missing from code
      - New feature in code not in spec

      Recommend action for each drift item.
    userPromptTemplate: |
      Spec features:
      {{specFeatures}}

      Code features:
      {{codeFeatures}}

      Structural diffs:
      {{structuralDiffs}}

      Analyze semantic equivalence and recommend actions.
    outputSchema:
      type: object
      properties:
        drift:
          type: array
          items:
            type: object
            properties:
              type: { type: string, enum: [spec_outdated, code_missing, new_in_code, conflict] }
              specItem: { type: string }
              codeItem: { type: string }
              recommendation: { type: string, enum: [update_spec, keep_spec, add_to_spec, flag_conflict] }
              details: { type: string }
    maxTokens: 2000
    next: generate_report

  - id: generate_report
    type: code
    handler: compileDriftReport
    next: check_drift

  - id: check_drift
    type: conditional
    branches:
      - condition: "state.drift.length === 0"
        next: END
    default: prompt_actions

  - id: prompt_actions
    type: question
    aiGenerated: false
    questionType: single_choice
    text: "Found {{drift.length}} differences between spec and code. How would you like to proceed?"
    options:
      - id: apply_all
        label: "Apply all non-conflicting changes"
        description: "Automatically update spec where safe"
      - id: review_each
        label: "Review each change"
        description: "Step through each difference"
      - id: skip
        label: "Skip - generate report only"
        description: "No changes, just show diff report"
    next: handle_action

  - id: handle_action
    type: conditional
    branches:
      - condition: "state.userAnswer === 'apply_all'"
        next: apply_all_changes
      - condition: "state.userAnswer === 'review_each'"
        next: review_loop
    default: END

  - id: apply_all_changes
    type: code
    handler: applyNonConflictingChanges
    description: Apply all changes where recommendation is not 'flag_conflict'
    next: END

  - id: review_loop
    type: loop
    collection: drift
    itemKey: currentDrift
    body: review_single_drift
    next: END

  - id: review_single_drift
    type: question
    aiGenerated: false
    questionType: single_choice
    text: |
      {{currentDrift.type}}: {{currentDrift.details}}

      Spec: {{currentDrift.specItem}}
      Code: {{currentDrift.codeItem}}

      Recommendation: {{currentDrift.recommendation}}
    options:
      - id: apply
        label: "Apply recommendation"
      - id: skip
        label: "Skip this change"
      - id: custom
        label: "Custom action"
    next: handle_drift_action

  - id: handle_drift_action
    type: conditional
    branches:
      - condition: "state.userAnswer === 'apply'"
        next: apply_single_drift
    default: LOOP_CONTINUE

  - id: apply_single_drift
    type: code
    handler: applySingleDrift
    next: LOOP_CONTINUE

output:
  status: { type: string, enum: [synced, drift_detected, changes_applied] }
  drift:
    specToCode: DriftItem[]
    codeToSpec: DriftItem[]
    schemaDrift: SchemaDrift[]
    apiDrift: APIDrift[]
  appliedChanges: Change[]
  skippedChanges: Change[]
```

---

### Analyzer Workflow

Validates specification consistency. Mostly code-based checks with minimal LLM usage.

```yaml
id: analyzer
name: Spec Consistency Validation
model: haiku  # For any semantic checks

steps:
  - id: load_specs
    type: code
    handler: loadAllSpecs
    description: Load all spec files into memory
    next: check_schema_refs

  - id: check_schema_refs
    type: code
    handler: validateSchemaReferences
    description: Check all schemaRefs point to existing DBML entities
    output:
      schemaRefIssues: Issue[]
    next: check_api_refs

  - id: check_api_refs
    type: code
    handler: validateAPIReferences
    description: Check all apiRefs point to existing endpoints
    output:
      apiRefIssues: Issue[]
    next: check_component_refs

  - id: check_component_refs
    type: code
    handler: validateComponentReferences
    description: Check all componentRefs point to existing components
    output:
      componentRefIssues: Issue[]
    next: check_naming_conventions

  - id: check_naming_conventions
    type: code
    handler: validateNamingConventions
    description: |
      Read constitution.yaml if exists.
      Apply regex patterns for naming rules.
      Check slug formats, case conventions.
    output:
      namingIssues: Issue[]
    next: check_circular_deps

  - id: check_circular_deps
    type: code
    handler: detectCircularDependencies
    description: Graph traversal to find circular refs
    output:
      circularDepIssues: Issue[]
    next: check_orphans

  - id: check_orphans
    type: code
    handler: findOrphanArtifacts
    description: Find artifacts not referenced by any feature
    output:
      orphanIssues: Issue[]
    next: compile_results

  - id: compile_results
    type: code
    handler: compileValidationReport
    description: Aggregate all issues into final report
    next: END

output:
  passed: boolean
  results:
    type: array
    items:
      type: object
      properties:
        check: { type: string }
        status: { type: string, enum: [pass, fail, warn, skip] }
        issues:
          type: array
          items:
            type: object
            properties:
              severity: { type: string, enum: [error, warning, info] }
              message: { type: string }
              location: { type: string }
              autoFixable: { type: boolean }
              fixCommand: { type: string }
  summary:
    total: number
    passed: number
    failed: number
    warnings: number
```

---

### Schema Generator Workflow

Generates DBML database schemas. Single bounded LLM call with structured output.

```yaml
id: schema-generator
name: DBML Schema Generation
model: sonnet

steps:
  - id: load_context
    type: code
    handler: loadSchemaContext
    description: Load data model answers and existing schemas
    output:
      entities: Entity[]
      relationships: Relationship[]
      existingSchema: string | null
    next: generate_dbml

  - id: generate_dbml
    type: llm
    model: sonnet
    systemPrompt: |
      Generate DBML database schema based on the data model requirements.

      Guidelines:
      - Use snake_case for table and column names
      - Include primary keys (prefer uuid over auto-increment)
      - Add created_at and updated_at timestamps
      - Define relationships with proper cardinality (1-1, 1-n, n-n)
      - Add indexes for frequently queried columns
      - Include table and column notes for documentation

      Output valid DBML syntax only.
    userPromptTemplate: |
      Entities to model:
      {{entities}}

      Relationships:
      {{relationships}}

      {{#if existingSchema}}
      Existing schema to extend:
      {{existingSchema}}
      {{/if}}

      Generate complete DBML schema.
    outputSchema:
      type: object
      properties:
        dbml: { type: string, description: "Valid DBML syntax" }
        tables: { type: array, items: { type: string } }
        relationships: { type: array }
    maxTokens: 3000
    next: write_schema

  - id: write_schema
    type: code
    handler: writeSchemaFile
    description: Write DBML to schemas/schema.dbml
    next: END

output:
  dbml: string
  filePath: string
  tables: string[]
```

---

### API Generator Workflow

Generates OpenAPI or GraphQL specifications. Single bounded LLM call.

```yaml
id: api-generator
name: API Specification Generation
model: sonnet

steps:
  - id: load_context
    type: code
    handler: loadAPIContext
    description: Load API design answers, schema, existing APIs
    output:
      apiStyle: 'rest' | 'graphql' | 'both'
      endpoints: EndpointRequirement[]
      schema: DBMLSchema
      existingAPI: string | null
    next: determine_format

  - id: determine_format
    type: conditional
    branches:
      - condition: "state.apiStyle === 'graphql'"
        next: generate_graphql
      - condition: "state.apiStyle === 'both'"
        next: generate_openapi
    default: generate_openapi

  - id: generate_openapi
    type: llm
    model: sonnet
    systemPrompt: |
      Generate OpenAPI 3.0 specification based on requirements.

      Guidelines:
      - Define clear paths with appropriate HTTP methods
      - Include request/response schemas referencing data model
      - Document all parameters (path, query, header, body)
      - Add authentication requirements (Bearer, API Key, etc.)
      - Use tags for logical grouping
      - Include example values
    userPromptTemplate: |
      API style: REST
      Endpoints required:
      {{endpoints}}

      Data model (DBML):
      {{schema}}

      Generate OpenAPI 3.0 YAML specification.
    outputSchema:
      type: object
      properties:
        openapi: { type: string, description: "Valid OpenAPI 3.0 YAML" }
        paths: { type: array }
    maxTokens: 4000
    next: write_openapi

  - id: generate_graphql
    type: llm
    model: sonnet
    systemPrompt: |
      Generate GraphQL SDL based on requirements.

      Guidelines:
      - Define types with proper nullability
      - Include queries for all read operations
      - Include mutations for all write operations
      - Add descriptions for documentation
      - Define input types for mutations
      - Consider subscriptions for real-time needs
    userPromptTemplate: |
      Operations required:
      {{endpoints}}

      Data model (DBML):
      {{schema}}

      Generate GraphQL SDL.
    outputSchema:
      type: object
      properties:
        graphql: { type: string, description: "Valid GraphQL SDL" }
        types: { type: array }
        queries: { type: array }
        mutations: { type: array }
    maxTokens: 4000
    next: write_graphql

  - id: write_openapi
    type: code
    handler: writeOpenAPIFile
    description: Write to apis/openapi.yaml
    next: check_both_needed

  - id: write_graphql
    type: code
    handler: writeGraphQLFile
    description: Write to apis/schema.graphql
    next: END

  - id: check_both_needed
    type: conditional
    branches:
      - condition: "state.apiStyle === 'both'"
        next: generate_graphql
    default: END

output:
  openapi: string | null
  graphql: string | null
  filePaths: string[]
```

---

### Component Generator Workflow

Generates HTML/CSS UI components with Tailwind styling.

```yaml
id: component-generator
name: UI Component Generation
model: sonnet

steps:
  - id: load_context
    type: code
    handler: loadComponentContext
    description: Load UI requirements, existing components, design system
    output:
      screens: ScreenRequirement[]
      uiFramework: string
      existingComponents: Component[]
    next: generate_components_loop

  - id: generate_components_loop
    type: loop
    collection: screens
    itemKey: currentScreen
    body: generate_single_component
    next: END

  - id: generate_single_component
    type: llm
    model: sonnet
    systemPrompt: |
      Generate HTML component with Tailwind CSS styling.

      Guidelines:
      - Use semantic HTML elements
      - Apply Tailwind utility classes for styling
      - Create responsive designs (mobile-first: sm:, md:, lg:)
      - Include accessibility attributes (aria-*, roles, labels)
      - Create variants for states (hover:, focus:, disabled:)
      - Include dark mode variants (dark:) if applicable
      - Add comments for prop documentation
    userPromptTemplate: |
      Screen: {{currentScreen.name}}
      Description: {{currentScreen.description}}
      UI Framework: {{uiFramework}}

      Related data:
      {{currentScreen.dataRequirements}}

      Generate component HTML with Tailwind classes.
    outputSchema:
      type: object
      properties:
        html: { type: string }
        variants: { type: array, items: { type: object, properties: { name: string, html: string } } }
        props: { type: array, items: { type: object, properties: { name: string, type: string, description: string } } }
    maxTokens: 2000
    next: write_component

  - id: write_component
    type: code
    handler: writeComponentFile
    description: Write to components/{{currentScreen.name}}.html
    next: LOOP_CONTINUE

output:
  components:
    type: array
    items:
      type: object
      properties:
        name: { type: string }
        filePath: { type: string }
        html: { type: string }
        variants: { type: array }
```

---

## Custom Tools (MCP Server)

These tools are pure logic operations that don't require AI model calls. They're defined as MCP tools using Zod schemas.

---

### AskUserQuestion

Present a question to the user and wait for response.

```typescript
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const askUserQuestion = tool(
  "ask_user_question",
  "Present a question to the user and wait for response",
  {
    question: z.string().describe("The question text"),
    questionType: z.enum([
      'single_choice',
      'multiple_choice',
      'text',
      'color',
      'code',
      'icon_picker',
      'component_variant',
      'comparison_table',
      'layout_template'
    ]),
    options: z.array(z.object({
      id: z.string(),
      label: z.string(),
      description: z.string().optional(),
      // Feature 7: Impact Preview on Hover
      impactPreview: z.object({
        summary: z.string().describe("Brief impact summary, e.g., 'Adds 2 entities, 3 endpoints'"),
        specChanges: z.object({
          sections: z.array(z.string()).describe("Affected spec sections"),
          estimatedFields: z.number().describe("Approximate field count")
        }),
        additionalQuestions: z.object({
          estimate: z.number().describe("Expected follow-up questions"),
          topics: z.array(z.string()).describe("Topics of follow-up questions")
        }),
        dependencies: z.object({
          creates: z.array(z.string()).describe("New dependencies created"),
          removes: z.array(z.string()).describe("Dependencies removed")
        }),
        pros: z.array(z.string()).describe("Advantages of this choice"),
        cons: z.array(z.string()).describe("Disadvantages of this choice"),
        reversibility: z.enum(['easy', 'moderate', 'significant']).describe("Effort to change later")
      }).optional().describe("Impact preview shown on hover/focus")
    })).optional().describe("Required for choice types"),
    validation: z.object({
      required: z.boolean().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional()
    }).optional().describe("For text types"),
    colorOptions: z.object({
      format: z.enum(['hex', 'rgb', 'hsl', 'tailwind']),
      allowCustom: z.boolean(),
      suggestedPalettes: z.array(z.enum(['tailwind', 'material', 'custom'])).optional(),
      showAlpha: z.boolean().optional()
    }).optional().describe("For color type"),
    codeOptions: z.object({
      language: z.enum(['json', 'yaml', 'sql', 'dbml', 'graphql', 'javascript', 'typescript']),
      theme: z.enum(['dark', 'light']).optional(),
      maxLines: z.number().optional(),
      placeholder: z.string().optional()
    }).optional().describe("For code type"),
    iconPickerOptions: z.object({
      library: z.enum(['heroicons', 'lucide', 'fontawesome', 'custom']),
      categories: z.array(z.string()).optional(),
      allowSearch: z.boolean().optional(),
      size: z.enum(['sm', 'md', 'lg']).optional()
    }).optional().describe("For icon_picker type"),
    componentVariantOptions: z.object({
      componentType: z.enum(['button', 'card', 'input', 'custom']),
      variants: z.array(z.object({
        id: z.string(),
        label: z.string(),
        htmlPreview: z.string().describe("Tailwind HTML"),
        description: z.string().optional()
      }))
    }).optional().describe("For component_variant type"),
    comparisonTableOptions: z.object({
      items: z.array(z.object({
        id: z.string(),
        label: z.string()
      })),
      criteria: z.array(z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(['boolean', 'text', 'rating'])
      })),
      cells: z.record(z.record(z.any())).describe("itemId -> criteriaId -> value")
    }).optional().describe("For comparison_table type"),
    layoutTemplateOptions: z.object({
      templates: z.array(z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
        wireframeSvg: z.string().describe("SVG preview")
      })),
      allowMultiple: z.boolean().optional()
    }).optional().describe("For layout_template type"),
    // Feature 9: "Why This Question?" Explainers
    explainer: z.object({
      connection: z.string().describe("How this relates to previous answers, e.g., 'Based on your choice of PostgreSQL...'"),
      purpose: z.string().describe("What this information will be used for"),
      downstream: z.object({
        schemaImpact: z.array(z.string()).describe("Schema sections affected"),
        apiImpact: z.array(z.string()).describe("API endpoints affected"),
        componentImpact: z.array(z.string()).describe("UI components affected")
      }),
      example: z.object({
        ifYouChoose: z.string().describe("Example option"),
        thenSpecWillHave: z.string().describe("Concrete spec outcome")
      }).optional(),
      relatedAnswer: z.object({
        questionId: z.string(),
        summary: z.string().describe("Summary of related previous answer")
      }).optional()
    }).optional().describe("Expandable context explaining why this question is asked"),

    // Feature 3: AI Recommendation Badges
    recommendation: z.object({
      recommendedOptionId: z.string().describe("ID of the suggested option"),
      confidence: z.enum(['high', 'medium']).describe("Confidence level - high (>80%) or medium (50-80%)"),
      reasoning: z.string().max(200).describe("Why this is recommended (shown on hover)"),
      source: z.enum([
        'constitution',        // Matches project constitution rule
        'best_practice',       // Industry standard
        'context_inference',   // Inferred from previous answers
        'majority_usage'       // Most common choice in similar projects
      ]).describe("Basis for recommendation"),
      caveats: z.array(z.string()).optional().describe("When NOT to choose this option")
    }).optional().describe("AI suggestion - omit if no strong recommendation"),

    defaultValue: z.union([z.string(), z.array(z.string()), z.any()]).optional(),
    context: z.string().optional().describe("Why AI is asking (shown to user) - DEPRECATED: use explainer instead"),
    phase: z.enum(['cpo', 'clarify', 'cto'])
  },
  async (args) => {
    // 1. Emit SSE event with question data
    // 2. Block until user responds
    // 3. Validate response against validation rules
    // 4. Return answer
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          answer: userResponse,
          skipped: false,
          answeredAt: new Date().toISOString()
        })
      }]
    };
  }
);
```

**Errors:**
- `QUESTION_TIMEOUT`: User did not respond within session timeout
- `INVALID_OPTIONS`: Choice question requires at least 2 options
- `SESSION_CANCELLED`: User cancelled the session
- `CODE_PARSE_ERROR`: Code content is syntactically invalid
- `INVALID_ICON_LIBRARY`: Specified icon library not available

---

### UpdateSpec

Modify spec content with automatic validation and undo tracking.

```typescript
const updateSpec = tool(
  "update_spec",
  "Update a field in project, module, or feature spec",
  {
    target: z.enum(['project', 'module', 'feature']),
    targetId: z.string().describe("Slug ID of target"),
    operation: z.enum(['set', 'append', 'remove', 'merge']),
    field: z.string().describe("Dot notation path (e.g., 'business.acceptanceCriteria')"),
    value: z.any().describe("New value (type depends on field)"),
    reason: z.string().optional().describe("Why this change (for undo history)")
  },
  async (args) => {
    // 1. Load current spec file
    // 2. Validate field path exists
    // 3. Apply operation (set/append/remove/merge)
    // 4. Validate resulting spec against schema
    // 5. Create undo action with before/after state
    // 6. Write file atomically
    // 7. Trigger relevant hooks (onFeatureSave, etc.)
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          previousValue: prev,
          newValue: current,
          undoActionId: undoId
        })
      }]
    };
  }
);
```

**Errors:**
- `TARGET_NOT_FOUND`: Specified target does not exist
- `FIELD_NOT_FOUND`: Field path is invalid
- `VALIDATION_FAILED`: New value fails schema validation
- `READONLY_FIELD`: Field cannot be modified (id, createdAt)
- `TYPE_MISMATCH`: Value type does not match field schema

---

### LogLesson

Record learned patterns for AI improvement.

```typescript
const logLesson = tool(
  "log_lesson",
  "Record a correction or learned pattern for future reference",
  {
    type: z.enum(['correction', 'pattern', 'constraint', 'preference']),
    context: z.string().describe("When/where this applies"),
    problem: z.string().describe("What went wrong or was suboptimal"),
    solution: z.string().describe("Correct approach"),
    examples: z.array(z.object({
      bad: z.string(),
      good: z.string()
    })).optional(),
    scope: z.enum(['global', 'project']).optional().default('project')
  },
  async (args) => {
    // Store lesson in lessons.yaml
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          lessonId: id,
          addedAt: new Date().toISOString(),
          totalLessons: count
        })
      }]
    };
  }
);
```

**Errors:**
- `DUPLICATE_LESSON`: Similar lesson already exists
- `INVALID_LESSON`: Lesson content is too vague

---

### PresentQuestionBatch (Feature 1)

Present a batch of related questions with shared context, reducing cognitive load from topic switching.

```typescript
const presentQuestionBatch = tool(
  "present_question_batch",
  "Present a batch of related questions to the user with shared context",
  {
    batchId: z.string().describe("Unique identifier for this batch"),
    topic: z.string().describe("Topic name shown as batch header, e.g., 'Authentication Method'"),
    topicDescription: z.string().describe("1-2 sentence context explaining why these questions matter"),
    questions: z.array(z.object({
      id: z.string(),
      question: z.string(),
      questionType: z.enum(['single_choice', 'multiple_choice', 'text', 'color', 'code']),
      options: z.array(z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
        impactPreview: z.any().optional()  // Same schema as AskUserQuestion options
      })).optional(),
      required: z.boolean().default(true),
      dependsOn: z.object({
        questionId: z.string().describe("ID of question this depends on"),
        condition: z.enum(['answered', 'equals', 'not_equals']),
        value: z.any().optional().describe("Required value for 'equals'/'not_equals' conditions")
      }).optional().describe("Show this question only if condition is met"),
      explainer: z.any().optional(),        // Same schema as AskUserQuestion
      recommendation: z.any().optional()    // Same schema as AskUserQuestion
    })).min(1).max(7).describe("Questions in this batch (max 7 per Miller's Law)"),
    estimatedTimeMinutes: z.number().min(1).max(15).describe("Estimated time to complete batch"),
    batchPosition: z.object({
      current: z.number().describe("Current batch number (1-indexed)"),
      total: z.number().describe("Total number of batches"),
      phase: z.enum(['cpo', 'clarify', 'cto'])
    }).describe("Progress context for user")
  },
  async (args) => {
    // 1. Emit SSE 'batch' event with full batch data
    // 2. UI renders all questions with topic header and context
    // 3. User can answer questions in any order within batch
    // 4. Wait for all required questions answered OR "complete batch" action
    // 5. Return all answers together
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          batchId: args.batchId,
          answers: {}, // Map of questionId -> answer
          skipped: [], // Array of skipped question IDs
          timeSpentSeconds: 0,
          completedAt: new Date().toISOString()
        })
      }]
    };
  }
);
```

**SSE Events:**
- `batch`: Server -> Client with full batch data
- `batch_complete`: Server -> Client when batch is completed

**Keyboard Shortcuts:**
- `Tab`: Move between questions in batch
- `Enter`: Submit batch (when all required answered)
- `1-9`: Select option in focused question

**Errors:**
- `BATCH_TIMEOUT`: User did not complete batch within session timeout
- `REQUIRED_UNANSWERED`: Attempted to submit with required questions unanswered
- `TOO_MANY_QUESTIONS`: Batch contains more than 7 questions

---

### EmitSpecPreview (Feature 2)

Stream incremental spec changes to the live preview panel for real-time feedback.

```typescript
const emitSpecPreview = tool(
  "emit_spec_preview",
  "Stream incremental spec changes to the live preview panel",
  {
    featureId: z.string().describe("Feature being updated"),
    previewType: z.enum(['incremental', 'full']).describe("Incremental for single update, full for complete refresh"),
    changes: z.array(z.object({
      section: z.enum([
        'business.userStory',
        'business.acceptanceCriteria',
        'technical.schemaRefs',
        'technical.apiRefs',
        'technical.componentRefs',
        'implementationPlan',
        'dependencies'
      ]).describe("Spec section being changed"),
      operation: z.enum(['add', 'modify', 'remove']),
      path: z.string().describe("JSON path within section, e.g., 'acceptanceCriteria[2]'"),
      beforeValue: z.any().optional().describe("Previous value (for modify/remove)"),
      afterValue: z.any().optional().describe("New value (for add/modify)"),
      confidence: z.enum(['definite', 'inferred', 'placeholder']).describe("How certain this change is"),
      sourceQuestionId: z.string().optional().describe("Which question triggered this change")
    })),
    highlightDuration: z.number().default(3000).describe("How long to highlight changes in UI (ms)")
  },
  async (args) => {
    // 1. Emit SSE 'spec_update' event with preview data
    // 2. UI renders diff-style preview in side panel
    // 3. User can click on changes to see source question
    // 4. Return immediately (non-blocking)
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ emitted: true, changeCount: args.changes.length })
      }]
    };
  }
);
```

**SSE Events:**
- `spec_update`: Granular spec update with before/after and format
- `spec_preview_chunk`: Streaming chunk for large updates

**Animation Patterns:**
- New content: Fade in (200ms) with green highlight pulse
- Modified content: Yellow highlight (300ms), then fade
- Removed content: Red strikethrough, then collapse (400ms)
- Pending changes: Dashed border with "~" prefix

**Errors:**
- `INVALID_SECTION`: Section path is not valid
- `RATE_LIMITED`: Too many updates per second (max 1/sec)

---

### LogDecision (Feature 4)

Record a decision for the decision journal with context and impact tracking.

```typescript
const logDecision = tool(
  "log_decision",
  "Record a decision with context for the decision journal and undo timeline",
  {
    decisionId: z.string().describe("Unique identifier"),
    title: z.string().max(80).describe("Brief summary, e.g., 'Chose PostgreSQL over MongoDB'"),
    category: z.enum([
      'product_scope',      // Feature in/out decisions
      'user_experience',    // UX choices
      'data_model',         // Schema decisions
      'api_design',         // API structure
      'technology',         // Tech stack
      'security',           // Security approach
      'performance',        // Performance tradeoffs
      'integration'         // Third-party integrations
    ]),
    context: z.object({
      questionId: z.string().optional(),
      questionText: z.string().optional(),
      phase: z.enum(['cpo', 'clarify', 'cto']),
      featureId: z.string().optional(),
      batchId: z.string().optional()
    }),
    choice: z.object({
      selected: z.string().describe("What user chose"),
      alternatives: z.array(z.string()).describe("What they didn't choose"),
      wasRecommended: z.boolean().describe("Did AI recommend this option?")
    }),
    rationale: z.object({
      explicit: z.string().optional().describe("User-stated reason if provided"),
      inferred: z.string().optional().describe("AI-inferred reason from context"),
      confidence: z.enum(['stated', 'inferred', 'unknown'])
    }),
    impact: z.object({
      specChanges: z.array(z.string()).describe("Spec paths that changed"),
      downstreamEffects: z.array(z.string()).optional().describe("Future questions affected"),
      reversibility: z.enum(['easy', 'moderate', 'difficult']).describe("How hard to undo")
    })
  },
  async (args) => {
    // 1. Store in SQLite decisions table
    // 2. Link to undo_actions for reversibility
    // 3. Index for search and filtering
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          decisionId: args.decisionId,
          loggedAt: new Date().toISOString(),
          canUndo: true
        })
      }]
    };
  }
);
```

**Cascading Undo:**
When user selects "Jump to This Point", all subsequent decisions are undone in reverse order. Each decision links to its undo_action for state restoration.

**Errors:**
- `DUPLICATE_DECISION`: Decision ID already exists
- `INVALID_IMPACT`: Impact references non-existent spec paths

---

## SDK Built-in Tools

The following tools are provided by Claude Agent SDK and available to all Foundry agents:

| SDK Tool | Usage in Foundry |
|----------|------------------|
| `Read` | Read codebase files during reverse engineering and actualize |
| `Write` | Write spec files (YAML, DBML, etc.) |
| `Edit` | Modify existing spec files |
| `Glob` | List/find files in project directory |
| `Grep` | Search file contents |
| `Bash` | Execute shell commands (git, etc.) |
| `WebSearch` | Search for library docs, patterns, best practices |
| `WebFetch` | Fetch and analyze web pages |
| `Task` | Invoke sub-agents for complex tasks |

These tools should be used directly without redefinition.

---

## Summary

### Workflows

| Workflow | Model | Purpose | Step Types |
|----------|-------|---------|------------|
| Main Orchestration | None (pure code) | Phase coordination | Code, Conditional, Nested |
| CPO Phase | Sonnet | Product requirements (15-25 questions) | Loop, LLM, Question, Code |
| CTO Phase | Sonnet | Technical architecture (20-30 questions) | Loop, LLM, Question, Nested |
| Clarify Phase | Sonnet | Ambiguity detection & resolution | Code, LLM, Loop, Question |
| RE (Reverse Engineering) | **Opus** | Codebase analysis | Code, Loop, LLM |
| Actualize | **Opus** | Spec-code sync | Code, Nested, LLM, Question |
| Analyzer | Haiku | Consistency validation | Code (mostly) |
| Schema Generator | Sonnet | DBML generation | Code, LLM |
| API Generator | Sonnet | OpenAPI/GraphQL | Code, Conditional, LLM |
| Component Generator | Sonnet | HTML/CSS mockups | Code, Loop, LLM |

### Workflow Step Types

| Step Type | Description |
|-----------|-------------|
| `code` | Pure code execution via handler function |
| `llm` | Bounded LLM call with structured output schema |
| `question` | User interaction via AskUserQuestion |
| `conditional` | Branching based on state conditions |
| `loop` | Iteration over collections |
| `nested_workflow` | Invoke another workflow |

### Custom Tools (MCP)

| Tool | Purpose |
|------|---------|
| AskUserQuestion | Present question with explainer, recommendation, and impact preview |
| UpdateSpec | Modify spec fields with validation |
| LogLesson | Record learned patterns |
| PresentQuestionBatch | Group related questions with shared context (Feature 1) |
| EmitSpecPreview | Stream incremental spec changes to preview panel (Feature 2) |
| LogDecision | Record decisions for journal and undo timeline (Feature 4) |

*Note: Constitution is injected into LLM step prompts, not loaded via tool.*

### SDK Built-in Tools (used by code handlers)

| Tool | Usage in Workflows |
|------|-------------------|
| Read | Code handlers for file loading |
| Write | Code handlers for artifact output |
| Glob | Code handlers for file discovery |
| Grep | Code handlers for content search |

*Note: Task tool is no longer used - workflows replace sub-agent invocation.*
