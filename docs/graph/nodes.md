---
layout: default
title: Node Types
parent: Graph Workflow Engine
nav_order: 2
description: 'Built-in node types for common workflow operations'
---

# Node Types

The Graph Engine provides built-in node types for common workflow operations. Nodes are created using the schema-based API for compile-time type safety.

## Schema-Based API

Define nodes using `defineNodes` and a typed schema:

```typescript
import { defineNodes, defineWorkflow, StdlibTool, AgentModel, SpecialNode } from '@sys/graph';

// Define context type
interface MyContext extends Record<string, unknown> {
  issueNumber: number;
  plan?: string[];
}

// Create schema with valid node names
const schema = defineNodes<MyContext>()(['PLAN', 'IMPLEMENT', 'TEST'] as const);

// Define workflow with type-safe nodes
export default defineWorkflow({
  id: 'my-workflow',
  schema,
  initialContext: { issueNumber: 42 },
  nodes: [
    schema.agent('PLAN', {
      role: 'architect',
      prompt: 'Create an implementation plan...',
      capabilities: [StdlibTool.Read, StdlibTool.Glob],
      then: () => 'IMPLEMENT',
    }),
    schema.command('IMPLEMENT', {
      command: 'bun build',
      then: () => 'TEST',
    }),
    schema.slashCommand('TEST', {
      command: 'test',
      args: 'Run all tests',
      then: () => SpecialNode.End,
    }),
  ],
});
```

---

## Core Enums

### StdlibTool

Built-in tools available to agent nodes:

```typescript
import { StdlibTool } from '@sys/graph';

// File System
StdlibTool.Read          // Read files (text, images, PDFs, notebooks)
StdlibTool.Write         // Write content to a file
StdlibTool.Edit          // Perform string replacements
StdlibTool.Glob          // File pattern matching
StdlibTool.Grep          // Code search with ripgrep
StdlibTool.NotebookEdit  // Edit Jupyter notebook cells

// Shell & System
StdlibTool.Bash          // Execute shell commands
StdlibTool.BashOutput    // Retrieve background shell output
StdlibTool.KillShell     // Kill a running shell

// Web & Network
StdlibTool.WebFetch      // Fetch and process URL content
StdlibTool.WebSearch     // Web search

// Agent & Workflow
StdlibTool.Task          // Launch subagents
StdlibTool.TodoWrite     // Task list management
StdlibTool.ExitPlanMode  // Exit planning mode
StdlibTool.AskUserQuestion  // Ask user clarifying questions

// MCP Integration
StdlibTool.ListMcpResources  // List MCP resources
StdlibTool.ReadMcpResource   // Read MCP resource
```

### AgentModel

Model selection for agent nodes:

```typescript
import { AgentModel } from '@sys/graph';

AgentModel.Haiku   // Fast, cost-effective for routine tasks
AgentModel.Sonnet  // Balanced performance (default)
AgentModel.Opus    // Most capable for complex reasoning
```

---

## AgentNode

Executes Claude Agent SDK queries with tool access.

### Configuration

```typescript
schema.agent('PLAN', {
  role: 'architect',              // Role identifier for logging
  prompt: 'System prompt...',     // AI instructions
  capabilities: [StdlibTool.Read], // Tools (StdlibTool or inline)
  model: AgentModel.Sonnet,       // Model selection (optional)
  maxTurns: 10,                   // Max conversation turns (optional)
  temperature: 0,                 // Generation temperature (optional)
  then: () => 'NEXT_NODE',        // Transition function
});
```

### Features

- Full Claude Agent SDK integration
- Tool execution with Zod validation
- Conversation history persistence
- Multi-turn interactions

### Result Storage

Stores the agent's response in conversation history with metadata.

### Example

```typescript
schema.agent('PLAN', {
  role: 'planner',
  prompt: `You are a Tech Lead. Analyze the request and create a task plan.
Output a JSON object: { "tasks": ["task1", "task2", ...] }`,
  capabilities: [StdlibTool.Glob, StdlibTool.Read],
  then: () => 'IMPLEMENT',
}),
```

---

## CommandNode

Executes shell commands with output capture.

### Configuration

```typescript
schema.command('BUILD', {
  command: 'bun test',           // Shell command to run (string or array)
  cwd: '/path/to/dir',           // Working directory (optional)
  env: { NODE_ENV: 'test' },     // Environment variables (optional)
  timeout: 300000,               // Timeout in ms (default: 5 minutes)
  throwOnError: true,            // Throw on non-zero exit (default: true)
  then: () => 'NEXT_NODE',       // Transition function
});
```

### Command Formats

Commands can be specified as either a string or an array:

```typescript
// String: Executed via shell (sh -c), supports pipes, redirects, etc.
command: 'git status | head -10'

// Array: Executed directly without shell interpretation (safer for user input)
command: ['gh', 'pr', 'create', '--title', userTitle]
```

**Use array form when command includes user input to prevent shell injection.**

### Features

- Captures stdout and stderr
- Exit code available in context
- Configurable timeout
- Shell syntax support (pipes, redirects) with string form
- Injection-safe execution with array form

### Result Storage

Stores result in `state.context.lastCommandResult`:

```typescript
interface CommandResult {
  exitCode: number;   // Process exit code
  stdout: string;     // Standard output
  stderr: string;     // Standard error
  success: boolean;   // exitCode === 0
  duration: number;   // Execution time in ms
}
```

### Example

```typescript
schema.command('BUILD', {
  command: 'bun build',
  then: (state) => {
    if (state.context.lastCommandResult?.success) {
      return 'TEST';
    }
    return 'FIX_BUILD';
  },
}),
```

---

## SlashCommandNode

Invokes Claude Code slash commands.

### Configuration

```typescript
schema.slashCommand('TEST', {
  command: 'test',                    // Command without leading /
  args: 'Run all tests',              // Arguments/instructions
  cwd: '/path/to/dir',                // Working directory (optional)
  timeout: 600000,                    // Timeout in ms (default: 10 minutes)
  throwOnError: true,                 // Throw on failure (default: true)
  model: 'claude-sonnet-4.5',         // Model override (optional)
  additionalContext: 'Focus on...',   // Extra context (optional)
  then: () => 'NEXT_NODE',            // Transition function
});
```

### Supported Commands

| Command | Purpose |
|---------|---------|
| `/edit` | Edit files |
| `/test` | Run tests |
| `/run` | Run commands |
| `/review` | Code review |
| `/explain` | Explain code |
| `/fix` | Fix issues |
| `/refactor` | Refactor code |
| `/docs` | Generate documentation |
| `/commit` | Git commit |

### Result Storage

Stores result in `state.context.lastSlashCommandResult`:

```typescript
interface SlashCommandResult {
  command: string;        // The slash command executed
  args: string;           // Arguments passed
  success: boolean;       // Command completed successfully
  output: string;         // Command output
  error?: {               // Error details if failed
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  duration: number;       // Execution time in ms
  filesAffected?: string[]; // Files modified by the command
}
```

### Example

```typescript
schema.slashCommand('COMMIT', {
  command: 'commit',
  args: 'Fix authentication bug',
  then: (state) => {
    if (state.context.lastSlashCommandResult?.success) {
      return 'PUSH';
    }
    return 'HANDLE_COMMIT_ERROR';
  },
}),
```

---

## EvalNode

Pure context transformation without LLM calls. Fast execution for programmatic state updates.

### Configuration

```typescript
schema.eval('INCREMENT', {
  update: (state) => ({           // Pure function returning context updates
    counter: state.context.counter + 1,
  }),
  then: () => 'NEXT_NODE',        // Transition function
});
```

### Use Cases

- Loop index management
- Setting/computing derived values
- Array operations (push, pop, filter, map)
- Conditional value assignment

### Result Storage

Stores metadata in `state.context.lastEvalResult`:

```typescript
interface EvalResult {
  success: boolean;       // Whether evaluation succeeded
  updatedKeys: string[];  // Keys that were modified
  duration: number;       // Execution time in ms
}
```

### Example: Loop Pattern

```typescript
// Increment and check loop
schema.eval('INCREMENT', {
  update: (state) => ({
    currentIndex: state.context.currentIndex + 1,
    currentTask: state.context.tasks[state.context.currentIndex + 1],
  }),
  then: (state) => {
    if (state.context.currentIndex < state.context.tasks.length) {
      return 'PROCESS_TASK';
    }
    return 'DONE';
  },
}),

// Collect results
schema.eval('COLLECT', {
  update: (state) => ({
    results: [...state.context.results, state.context.lastResult],
  }),
  then: () => 'NEXT_ITEM',
}),
```

---

## DynamicAgentNode

Agent node with runtime configuration. Model, prompt, and tools are resolved at execution time from workflow state.

### Configuration

```typescript
schema.dynamicAgent('EXECUTE_TASK', {
  model: (state) => state.context.currentTask.model,    // Dynamic model
  prompt: (state) => state.context.currentTask.prompt,  // Dynamic prompt
  system: 'You are a helpful assistant.',               // Optional system prompt
  capabilities: [StdlibTool.Read, StdlibTool.Write],    // Static or dynamic tools
  maxTurns: 10,                                         // Max agent turns
  temperature: 0,                                       // Generation temperature
  maxTokens: 4096,                                      // Max output tokens
  then: () => 'NEXT_TASK',                              // Transition function
});
```

### Features

- Dynamic model selection per task
- Prompts generated by previous nodes
- Tool sets that vary based on context
- Token usage tracking

### Result Storage

Stores result in `state.context.lastDynamicAgentResult`:

```typescript
interface DynamicAgentResult {
  success: boolean;
  response: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
  duration: number;
}
```

### Example: Task Queue Processing

```typescript
interface TaskContext extends Record<string, unknown> {
  tasks: Array<{ model: AgentModel; prompt: string }>;
  currentIndex: number;
  currentTask: { model: AgentModel; prompt: string };
}

schema.dynamicAgent('EXECUTE_TASK', {
  model: (state) => state.context.currentTask.model,
  prompt: (state) => state.context.currentTask.prompt,
  capabilities: [StdlibTool.Read, StdlibTool.Write, StdlibTool.Bash],
  then: () => 'COLLECT_RESULT',
}),
```

---

## DynamicCommandNode

Shell command node with runtime configuration. Command, cwd, and env are resolved at execution time.

### Configuration

```typescript
schema.dynamicCommand('RUN_SCRIPT', {
  command: (state) => state.context.scriptPath,    // Dynamic command (string or array)
  cwd: (state) => state.context.workDir,           // Dynamic working directory
  env: { NODE_ENV: 'production' },                 // Static or dynamic env
  timeout: 300000,                                 // Timeout in ms
  throwOnError: true,                              // Throw on failure
  then: () => 'CHECK_RESULT',                      // Transition function
});
```

### Command Formats

Like CommandNode, supports both string and array forms:

```typescript
// String: shell execution with pipes/redirects
command: (state) => `bun test ${state.context.testFile}`

// Array: injection-safe for user input
command: (state) => ['gh', 'pr', 'create', '--title', state.context.title]
```

### Features

- Commands generated by previous nodes
- Working directories that vary per task
- Environment variables from context
- Injection-safe execution with array form

### Result Storage

Stores result in `state.context.lastDynamicCommandResult`:

```typescript
interface DynamicCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
  command: string;    // The actual command that was run
  duration: number;
}
```

### Example

```typescript
schema.dynamicCommand('RUN_TEST', {
  command: (state) => `bun test ${state.context.testFile}`,
  cwd: (state) => state.context.projectRoot,
  then: (state) => {
    if (state.context.lastDynamicCommandResult?.success) {
      return 'NEXT_TEST';
    }
    return 'FIX_TEST';
  },
}),
```

---

## HttpNode

Makes HTTP requests with JSON I/O.

### Configuration

```typescript
// Note: HttpNode uses createHttpNode factory for now
import { createHttpNode } from '@sys/graph/nodes';

createHttpNode({
  method: 'POST',                                   // HTTP method
  url: 'https://api.example.com/deploy',            // Static or dynamic URL
  headers: { 'Authorization': 'Bearer xxx' },       // Request headers
  body: { version: '1.0.0' },                       // Static or dynamic body
  params: { env: 'production' },                    // Query parameters
  timeout: 30000,                                   // Timeout in ms (default: 30s)
  throwOnError: true,                               // Throw on non-2xx
  then: () => 'VERIFY',                             // Transition function
});
```

### Features

- All standard HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Dynamic URL and body from state
- Query parameters support
- Timeout handling

### Result Storage

Stores result in `state.context.lastHttpResult`:

```typescript
interface HttpResult {
  success: boolean;              // 2xx status
  status: number;                // HTTP status code
  statusText: string;            // HTTP status text
  headers: Record<string, string>;
  data: unknown;                 // Parsed JSON response
  error?: string;
  duration: number;
}
```

### Example: API Integration

```typescript
createHttpNode({
  method: 'POST',
  url: (state) => `https://api.github.com/repos/${state.context.repo}/deployments`,
  headers: {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
  },
  body: (state) => ({
    ref: state.context.branch,
    environment: 'production',
  }),
  then: (state) => {
    if (state.context.lastHttpResult?.success) {
      return 'WAIT_DEPLOY';
    }
    return 'HANDLE_ERROR';
  },
}),
```

---

## LLMNode

Structured LLM invocation with JSON I/O and optional schema validation.

### Configuration

```typescript
import { z } from 'zod';

const TaskPlanSchema = z.object({
  tasks: z.array(z.string()),
  priority: z.enum(['low', 'medium', 'high']),
});

// Note: LLMNode uses LLMNodeRuntime directly for now
import { LLMNodeRuntime } from '@sys/graph/nodes';

new LLMNodeRuntime({
  model: 'sonnet',                             // haiku | sonnet | opus
  system: 'You are a task planner.',           // System prompt
  prompt: (state) => `Plan: ${state.context.request}`,
  outputSchema: TaskPlanSchema,                // Optional output validation
  temperature: 0,                              // Generation temperature
  maxTokens: 4096,                             // Max output tokens
  reasoningEffort: 'medium',                   // low | medium | high (future)
  then: () => 'IMPLEMENT',                     // Transition function
});
```

### Features

- Model selection (haiku, sonnet, opus)
- Input/output schema validation with Zod
- Dynamic prompts from state
- Extended thinking / reasoning effort (planned)

### Result Storage

Stores result in `state.context.lastLLMResult`:

```typescript
interface LLMResult<TOutput> {
  success: boolean;
  output?: TOutput;              // Parsed & validated output
  rawOutput?: string;            // Raw text response
  thinking?: string;             // Thinking output (if enabled)
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
  duration: number;
}
```

### Example: Structured Output

```typescript
const AnalysisSchema = z.object({
  summary: z.string(),
  issues: z.array(z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    file: z.string(),
  })),
  recommendations: z.array(z.string()),
});

new LLMNodeRuntime({
  model: 'sonnet',
  system: 'You are a code reviewer. Analyze the code and output JSON.',
  prompt: (state) => `Review this code:\n\n${state.context.codeToReview}`,
  outputSchema: AnalysisSchema,
  then: (state) => {
    const result = state.context.lastLLMResult;
    if (result?.output?.issues.some(i => i.severity === 'critical')) {
      return 'BLOCK_MERGE';
    }
    return 'APPROVE';
  },
}),
```

---

## GitHubProjectNode

Updates fields in GitHub Projects V2 via GraphQL API.

### Configuration

```typescript
import { createGitHubProjectNode } from '@sys/graph/nodes';

createGitHubProjectNode({
  // Required: GitHub authentication
  token: process.env.GITHUB_TOKEN!,

  // Required: Project identification
  projectOwner: 'my-org',           // User or organization
  projectNumber: 1,                  // From project URL

  // Required: Repository context
  owner: 'my-org',
  repo: 'my-repo',

  // Required: Field updates (single or array)
  updates: { type: 'single_select', field: 'Status', value: 'Done' },

  // Issue number (one of these required)
  issueNumber: 123,                 // Static issue number
  issueNumberKey: 'currentIssue',   // Or read from context

  // Optional settings
  throwOnError: true,               // Throw on failure (default: true)
  verbose: false,                   // Enable detailed logging

  then: () => 'NEXT_NODE',          // Transition function
});
```

### Field Update Types

```typescript
// Single select (Status, Priority, etc.)
{ type: 'single_select', field: 'Status', value: 'Done' }

// Text field
{ type: 'text', field: 'Notes', value: 'Completed implementation' }

// Number field
{ type: 'number', field: 'Story Points', value: 5 }

// Date field
{ type: 'date', field: 'Due Date', value: '2024-12-31' }

// Multiple updates at once
updates: [
  { type: 'single_select', field: 'Status', value: 'In Progress' },
  { type: 'single_select', field: 'Priority', value: 'High' },
  { type: 'text', field: 'Notes', value: 'Working on it' },
]
```

### Result Storage

Stores result in `state.context.lastProjectResult`:

```typescript
interface GitHubProjectResult {
  success: boolean;
  updatedFields: Array<{
    field: string;
    success: boolean;
    previousValue?: string;
    newValue?: string;
    error?: string;
  }>;
  issueNumber: number;
  repository: string;
  error?: string;
  duration: number;
}
```

### Example: Issue Workflow

```typescript
import { defineWorkflow, StdlibTool, SpecialNode } from '@sys/graph';
import { createGitHubProjectNode } from '@sys/graph/nodes';

const projectConfig = {
  token: process.env.GITHUB_TOKEN!,
  projectOwner: 'acme',
  projectNumber: 5,
  owner: 'acme',
  repo: 'webapp',
  issueNumberKey: 'issueNumber',
};

defineWorkflow<{ issueNumber: number }>({
  id: 'issue-workflow',
  schema,
  initialContext: { issueNumber: 42 },
  nodes: [
    // Mark as In Progress
    createGitHubProjectNode({
      ...projectConfig,
      updates: { type: 'single_select', field: 'Status', value: 'In Progress' },
      then: () => 'WORK',
    }),

    schema.agent('WORK', {
      role: 'developer',
      prompt: 'Implement the feature described in the issue.',
      capabilities: [StdlibTool.Read, StdlibTool.Write],
      then: () => 'COMPLETE',
    }),

    // Mark as Done
    createGitHubProjectNode({
      ...projectConfig,
      updates: { type: 'single_select', field: 'Status', value: 'Done' },
      then: () => SpecialNode.End,
    }),
  ],
});
```

---

## GitCheckoutNode

Clones a GitHub repository for workflow execution. Credentials are resolved from the automation context.

### Configuration

```typescript
import { GitCheckoutNodeRuntime } from '@sys/graph/nodes';

new GitCheckoutNodeRuntime({
  useIssueContext: true,          // Resolve repo from issue (default: true)
  owner: 'my-org',                // Manual owner override
  repo: 'my-repo',                // Manual repo override
  ref: 'main',                    // Branch/tag/SHA (default: 'main')
  depth: 1,                       // Clone depth (default: 1, shallow)
  skipIfExists: true,             // Skip if directory exists (default: true)
  baseDir: '/workspace',          // Base directory for checkouts
  resultKey: 'checkout',          // Context key for result (default: 'checkout')
  then: () => 'BUILD',            // Transition function
});
```

### Features

- Automatic credential resolution from issue metadata
- Shallow and full clone support
- Sets `workDir` in context for subsequent nodes
- Handles existing directories gracefully

### Result Storage

Stores result in `state.context.checkout` (or custom `resultKey`):

```typescript
interface GitCheckoutResult {
  workDir: string;    // Cloned directory path
  owner: string;      // Repository owner
  repo: string;       // Repository name
  ref: string;        // Git ref that was checked out
  sha: string;        // Commit SHA
}
```

### Example

```typescript
// From issue context (most common)
new GitCheckoutNodeRuntime({
  useIssueContext: true,
  ref: 'main',
  then: () => 'IMPLEMENT',
});

// Manual override
new GitCheckoutNodeRuntime({
  useIssueContext: false,
  owner: 'myorg',
  repo: 'myrepo',
  ref: 'feature-branch',
  then: () => 'BUILD',
});
```

---

## Dispatch Nodes

Specialized nodes for GitHub issue DAG workflows. These power the dispatch system for managing issue queues.

### FetchIssuesNode

Fetches issues from GitHub by label or project.

```typescript
import { createFetchIssuesNode } from '@sys/graph/nodes';

createFetchIssuesNode({
  source: 'label',               // 'label' or 'project'
  label: 'queue',                // Label to filter (for label source)
  projectNumber: 14,             // Project number (for project source)
  readyStatus: 'Ready',          // Status filter (for project source)
  then: () => 'BUILD_DAG',
});
```

**Result Storage:** `state.context.fetchedIssues`

### BuildDagNode

Builds a dependency DAG from fetched issues.

```typescript
import { createBuildDagNode } from '@sys/graph/nodes';

createBuildDagNode({
  maxConcurrent: 5,              // Max issues to dispatch
  then: () => 'SET_STATUS',
});
```

**Features:**
- Parses dependency syntax from issue bodies
- Detects circular dependencies (Tarjan's algorithm)
- Resolves READY/BLOCKED status
- Priority sorting

**Result Storage:** `state.context.dagResult`

### SetStatusNode

Batch updates issue status in GitHub Projects.

```typescript
import { createSetStatusNode } from '@sys/graph/nodes';

createSetStatusNode({
  projectNumber: 14,
  status: 'In Progress',         // New status value
  statusField: 'Status',         // Project field name
  then: () => 'DISPATCH',
});
```

**Result Storage:** `state.context.statusUpdateResult`

---

## Multi-Provider LLM Support

The LLMNode supports multiple AI providers beyond Anthropic.

### LLMProvider Enum

```typescript
import { LLMProvider } from '@sys/graph';

LLMProvider.Anthropic  // Claude models
LLMProvider.OpenAI     // GPT models
LLMProvider.Gemini     // Google Gemini models
```

### Supported Models

| Provider | Models |
|----------|--------|
| **Anthropic** | `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5` |
| **OpenAI** | `gpt-5.2`, `gpt-5-pro`, `gpt-5-mini`, `gpt-5-nano` |
| **Gemini** | `gemini-3-pro`, `gemini-3-flash-preview` |

### Model Metadata

Each model includes metadata about its capabilities:

```typescript
interface LLMModelMetadata {
  id: LLMModelId;
  provider: LLMProvider;
  displayName: string;
  supportsReasoning: boolean;    // Extended thinking
  supportsWebSearch: boolean;    // Web search tool
  maxOutputTokens: number;
}
```

### Example: Multi-Provider Workflow

```typescript
import { LLMNodeRuntime } from '@sys/graph/nodes';

// Use OpenAI for code generation
new LLMNodeRuntime({
  model: 'gpt-5-pro',
  system: 'You are a code generator.',
  prompt: (state) => `Generate code for: ${state.context.task}`,
  then: () => 'REVIEW',
});

// Use Claude for review
new LLMNodeRuntime({
  model: 'claude-sonnet-4-5',
  system: 'You are a code reviewer.',
  prompt: (state) => `Review this code: ${state.context.code}`,
  then: () => 'COMMIT',
});
```
