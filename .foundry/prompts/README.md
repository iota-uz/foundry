# Foundry Prompt Templates

All AI prompts for Foundry workflows are stored as Handlebars (.hbs) templates in this directory.

## File Organization

All templates use a flat directory structure with naming convention: `{workflow}-{operation}-{type}.hbs`

- `system` suffix: System prompts (role definition, guidelines, output format)
- `user` suffix: User prompts (specific task context with variables)

## Workflow Templates

### CPO Phase (Product Requirements)

- **cpo-generate-question-system.hbs** - System prompt defining the CPO role, question types, and output format
- **cpo-generate-question-user.hbs** - User prompt with topic context, previous answers, and question count

**Model:** Sonnet 4.5
**Purpose:** Generate conversational questions about product vision, users, features, and business requirements
**Topics:** Problem statement, target users, core features, user flows, priorities, success metrics, competitive landscape, constraints

**Context Variables:**
- `currentTopic.name` - Name of the topic being explored
- `currentTopic.description` - Topic description
- `previousAnswers` - Array of previous Q&A within this topic
- `questionCount` - Current question number for this topic

### Clarify Phase (Ambiguity Detection)

- **clarify-categorize-system.hbs** - System prompt for ambiguity detection and categorization
- **clarify-categorize-user.hbs** - User prompt with gathered features and CPO answers

**Model:** Sonnet 4.5
**Purpose:** Detect and categorize ambiguities in product specifications
**Ambiguity Types:** Vague language, missing edge cases, ambiguous flows, conflicts

**Context Variables:**
- `features` - Gathered features from CPO phase
- `cpoAnswers` - All answers from CPO phase

### CTO Phase (Technical Architecture)

- **cto-generate-question-system.hbs** - System prompt for technical question generation
- **cto-generate-question-user.hbs** - User prompt with business context and previous technical decisions

**Model:** Sonnet 4.5
**Purpose:** Generate technical questions about architecture, data model, API design, authentication, and deployment
**Topics:** Tech stack, data model, API design, authentication, integrations, performance, deployment, UI components

**Context Variables:**
- `currentTopic.name` - Name of the technical topic
- `currentTopic.description` - Topic description
- `businessContext` - Summarized CPO phase decisions
- `previousAnswers` - Technical decisions made so far

### Schema Generator

- **schema-generator-system.hbs** - System prompt for DBML schema generation
- **schema-generator-user.hbs** - User prompt with entities, relationships, and technical constraints

**Model:** Sonnet 4.5
**Purpose:** Generate complete DBML database schemas
**Output:** Valid DBML with tables, relationships, indexes, and documentation

**Context Variables:**
- `entities` - List of entities to create
- `relationships` - Entity relationships and cardinality
- `technicalAnswers` - CTO phase decisions
- `existingSchema` - Current schema to extend (optional)
- `constitution` - Project constitution rules (optional)

### API Generator

- **api-generator-system.hbs** - System prompt for OpenAPI 3.0 or GraphQL generation
- **api-generator-user.hbs** - User prompt with endpoints, data model, and API decisions

**Model:** Sonnet 4.5
**Purpose:** Generate API specifications (REST or GraphQL)
**Output:** Valid OpenAPI 3.0 YAML or GraphQL SDL

**Context Variables:**
- `endpoints` - Required API operations
- `schema` - DBML schema for reference
- `apiAnswers` - API design decisions
- `existingAPI` - Current API to extend (optional)
- `apiStyle` - API style (rest, graphql, or both)
- `constitution` - Project constitution rules (optional)

### Component Generator

- **component-generator-system.hbs** - System prompt for HTML/Tailwind component generation
- **component-generator-user.hbs** - User prompt with screen/component requirements

**Model:** Sonnet 4.5
**Purpose:** Generate responsive HTML components with Tailwind CSS
**Output:** Valid HTML with Tailwind utilities, accessibility attributes, and variants

**Context Variables:**
- `currentScreen.name` - Component/screen name
- `currentScreen.description` - What the component does
- `currentScreen.purpose` - Component purpose
- `currentScreen.dataRequirements` - Data the component works with
- `currentScreen.interactions` - User interactions
- `currentScreen.features` - Related features
- `uiFramework` - UI framework being used
- `constitution` - Project constitution rules (optional)

### Reverse Engineering (RE)

- **re-analyze-system.hbs** - System prompt for codebase analysis
- **re-analyze-user.hbs** - User prompt with codebase structure and configuration

**Model:** Opus 4.5 (complex reasoning for code analysis)
**Purpose:** Analyze existing codebases and extract specifications
**Output:** Architecture patterns, features, data model, API endpoints

**Context Variables:**
- `projectType` - Detected project type (node, python, go, etc.)
- `scope` - Analysis scope (architecture, features, schema, api)
- `directoryTree` - Directory structure of the codebase
- `configFilesContent` - Configuration file contents (package.json, etc.)
- `analysisType` - Type of analysis to perform

## Handlebars Features Used

### Variable Interpolation
```handlebars
{{variableName}}          <!-- Simple variable -->
{{object.property}}       <!-- Nested property access -->
{{array.0}}               <!-- Array index access -->
```

### Conditionals
```handlebars
{{#if condition}}
  Content shown if condition is true
{{else}}
  Content shown if condition is false
{{/if}}

{{#unless condition}}
  Content shown if condition is false
{{/unless}}
```

### Loops
```handlebars
{{#each array}}
  {{this}}                <!-- Current item -->
  {{@index}}              <!-- Current index -->
  {{@key}}                <!-- Current key (for objects) -->
{{/each}}
```

### Built-in Helpers
```handlebars
{{#with object}}
  {{property}}            <!-- Property of with context -->
{{/with}}
```

## Constitution Injection

The project `constitution.yaml` (if exists) is automatically injected into every LLM step's system prompt during execution by the WorkflowEngine.

**Flow:**
1. Load system prompt template from this directory
2. Compile with Handlebars (inject workflow state)
3. **Append constitution to compiled prompt** (automatic, not in template)
4. Load user prompt template
5. Compile with Handlebars
6. Send final prompts to Claude

Templates should reference constitution with conditional blocks:
```handlebars
{{#if constitution}}
Follow these rules: {{constitution}}
{{/if}}
```

The WorkflowEngine will populate this variable if constitution exists.

## Context Variables Available to All Templates

These variables are available in **both** system and user prompts:

- `currentTopic.id` - Topic identifier
- `currentTopic.name` - Topic name
- `currentTopic.description` - Topic description
- `phase` - Current phase: 'cpo', 'clarify', 'cto'
- `model` - Claude model being used
- `sessionId` - Current workflow session
- `timestamp` - Current timestamp
- `projectName` - Name of the project
- `constitution` - Constitution rules (if defined)

**Phase-specific variables:**
- CPO/CTO: `answers`, `answersSummary`, `questionCount`, `topicIndex`
- Clarify: `detectedIssues`, `ambiguities`
- Generators: `entities`, `relationships`, `endpoints`, `schema`
- RE: `projectType`, `directoryTree`, `analysisType`

## Output Schema Guidelines

All LLM steps expect structured JSON output. Templates specify the expected format in the system prompt.

**Key principles:**
1. Specify exact JSON structure expected
2. Include field descriptions
3. Provide examples where helpful
4. Note required vs optional fields
5. For choice questions: always include id, label, description

## Adding New Templates

When adding a new workflow phase or generator:

1. Create two files: `{workflow}-{operation}-system.hbs` and `{workflow}-{operation}-user.hbs`
2. System prompt should:
   - Define the AI's role clearly
   - List guidelines and constraints
   - Specify output format as JSON
   - Reference constitution rules if applicable
3. User prompt should:
   - Provide task-specific context
   - Include all relevant variables with `{{variable}}`
   - Use conditionals for optional sections
   - End with clear task description
4. Update this README with documentation

## Testing Templates

To test a template:

1. Prepare test context data as JSON
2. Compile with Handlebars compiler
3. Verify output format matches specification
4. Test with actual Claude API

Example Node.js test:
```javascript
const Handlebars = require('handlebars');
const fs = require('fs');

const template = fs.readFileSync('cpo-generate-question-user.hbs', 'utf-8');
const compiled = Handlebars.compile(template);
const output = compiled({
  currentTopic: { name: 'Problem Statement', description: '...' },
  previousAnswers: [],
  questionCount: 1
});
console.log(output);
```

## Version Control

These templates are tracked in Git and should be updated when:
- Workflows change
- New LLM steps are added
- Output schemas are modified
- Guidelines or constraints evolve

All templates should be kept in sync with the corresponding workflow definitions in `tools.md`.
