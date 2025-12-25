---
layout: default
title: AI Tools & Model Selection
nav_order: 7
---

# AI Tools & Model Selection

**Status:** Draft
**Last Updated:** 2025-11-26

## Overview

This document defines Foundry's AI architecture using a **workflow-based** approach:

- **Workflows** for sequential tasks with deterministic step sequences and bounded LLM calls
- **Workflow steps** include: Code (pure logic), LLM (bounded AI calls), Question (user input), Conditional, Loop, Nested
- **Custom tools** (MCP) for pure logic/data operations (no model calls)

**Reference Documentation:** For complete Claude SDK API reference, see [research/claude-agent-sdk-apis.md](research/claude-agent-sdk-apis.md)

### Why Workflows Instead of Agents

| Benefit                    | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| **Maximum Predictability** | Every step explicitly defined, no hallucinated tool calls         |
| **Cost Control**           | LLM calls bounded and predictable, can estimate cost per workflow |
| **Better Testing**         | Unit test individual steps, mock LLM responses                    |
| **Clear Debugging**        | Full execution history, step-by-step tracing                      |
| **Retry Granularity**      | Can retry individual steps, not entire conversations              |
| **Timeout Handling**       | Each step has explicit timeout                                    |
| **Auditability**           | Compliance-friendly logging, decision points visible              |

---

## AI Model Selection

### Model Usage by Task

| Task                 | Model        | Rationale                                                  |
| -------------------- | ------------ | ---------------------------------------------------------- |
| CPO Q&A              | Sonnet 4.5   | Good balance of speed and quality for product discussions  |
| Clarify Phase        | Sonnet 4.5   | Fast ambiguity detection, sufficient for language analysis |
| CTO Q&A              | Sonnet 4.5   | Technical decisions need quality but not maximum depth     |
| Schema Generation    | Sonnet 4.5   | Structured output, patterns are well-defined               |
| API Generation       | Sonnet 4.5   | Template-based generation                                  |
| Component Generation | Sonnet 4.5   | HTML/CSS patterns are straightforward                      |
| Reverse Engineering  | **Opus 4.5** | Complex codebase analysis requires deepest reasoning       |
| Consistency Analysis | Haiku 4.5    | Fast validation checks, simple pattern matching            |

### Model Configuration

```typescript
interface ModelConfig {
  default: 'claude-sonnet-4.5';
  tasks: {
    cpo_qa: 'claude-sonnet-4.5';
    clarify: 'claude-sonnet-4.5';
    cto_qa: 'claude-sonnet-4.5';
    reverse_engineering: 'claude-opus-4.5';
    analysis: 'claude-haiku-4.5';
  };
  // User can override in constitution.yaml
  overrides?: Partial<ModelConfig['tasks']>;
}
```

### Cost Considerations

- **Opus**: Use sparingly - reverse engineering, complex analysis
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
  | CodeStep // Pure code execution (handlers)
  | LLMStep // Single bounded LLM call with structured output
  | QuestionStep // User interaction via AskUserQuestion
  | ConditionalStep // Branching based on state
  | LoopStep // Iteration over collections
  | NestedWorkflowStep; // Invoke another workflow

interface LLMStep {
  type: 'llm';
  id: string;
  model: 'sonnet' | 'opus' | 'haiku';
  systemPromptFile: string; // Path to .hbs file in .foundry/prompts/
  userPromptFile: string; // Path to .hbs file in .foundry/prompts/
  outputSchema: ZodSchema; // Enforced structured output
  maxTokens: number;
  timeout: number;
  then: string; // Next step ID
}

interface QuestionStep {
  type: 'question';
  id: string;
  topicId: string;
  aiGenerated: boolean; // If true, LLM generates question text
  questionType: 'single_choice' | 'multiple_choice' | 'text' | 'code';
  targetField: string; // Dot notation spec path to save answer
  then: string;
}
```

### Constitution Injection

The project constitution (if exists) is automatically injected into every LLM step's system prompt.

**Process:**

1. Load system prompt file from `.foundry/prompts/{systemPromptFile}`
2. Compile Handlebars template with workflow state as context
3. Append constitution to compiled prompt
4. Send final prompt to Claude

---

### Prompt Files and Handlebars Templates

All LLM step prompts are stored as Handlebars templates in `.foundry/prompts/`.

#### File Organization

All prompt files are stored in a single flat directory:

- Location: `.foundry/prompts/`
- Naming: `{workflow}-{operation}-{type}.hbs`

#### Handlebars Syntax

{% raw %}
Prompts use basic Handlebars templating:

- **Variables**: `{{variableName}}` - Access workflow state
- **Conditionals**: `{{#if condition}}...{{/if}}` - Conditional content
- **Nested access**: `{{object.property}}` - Dot notation for nested values
  {% endraw %}

#### Template Context

Templates receive workflow state as context:

- `currentTopic` - Current topic/feature being explored
- `answers` - Accumulated answers from previous questions
- `answersSummary` - Formatted summary of previous answers
- `phase` - Current workflow phase (cpo, clarify, cto)
- `model` - Which Claude model is being used

---

## Main Orchestration Workflow

Pure code workflow controller (no LLM orchestration). Manages phase transitions as a state machine.

- Loads project state
- Checks project mode (new vs reverse_engineered)
- Routes to appropriate workflow (CPO or RE)
- Coordinates phase transitions
- Finalizes project
