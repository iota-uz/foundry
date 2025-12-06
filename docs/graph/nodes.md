---
layout: default
title: Node Types
parent: Graph Workflow Engine
nav_order: 2
description: 'Built-in node types for common workflow operations'
---

# Node Types

The Graph Engine provides four built-in node types for common workflow operations.

## AgentNode

Executes Claude Agent SDK queries with tool access.

### Configuration

```typescript
nodes.AgentNode({
  role: 'architect',           // Role identifier for logging
  system: 'System prompt...',  // AI instructions
  tools: ['list_files'],       // Tool names or inline definitions
  maxTurns: 10,                // Max conversation turns (optional)
  next: 'NEXT_NODE',           // Static or dynamic transition
});
```

### Features

- Full Claude Agent SDK integration
- Tool execution with Zod validation
- Conversation history persistence
- Multi-turn interactions

### Result Storage

Stores the agent's final response in `state.context.lastAgentResponse`.

### Example

```typescript
PLAN: nodes.AgentNode({
  role: 'planner',
  system: `You are a Tech Lead. Analyze the request and create a task plan.
Output a JSON object: { "tasks": ["task1", "task2", ...] }`,
  tools: ['list_files', 'read_file'],
  next: 'IMPLEMENT',
}),
```

---

## CommandNode

Executes shell commands with output capture.

### Configuration

```typescript
nodes.CommandNode({
  command: 'bun test',           // Shell command to run
  cwd: '/path/to/dir',           // Working directory (optional)
  env: { NODE_ENV: 'test' },     // Environment variables (optional)
  timeout: 300000,               // Timeout in ms (default: 5 minutes)
  throwOnError: true,            // Throw on non-zero exit (default: true)
  resultKey: 'lastCommandResult', // Context key for result (default)
  next: 'NEXT_NODE',             // Static or dynamic transition
});
```

### Features

- Captures stdout and stderr
- Exit code available in context
- Configurable timeout
- Shell syntax support (pipes, redirects)

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
BUILD: nodes.CommandNode({
  command: 'bun build',
  next: (state) => {
    if (state.context.lastCommandResult?.exitCode === 0) {
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
nodes.SlashCommandNode({
  command: 'commit',                    // Command without leading /
  args: 'Implement feature X',          // Arguments/instructions
  resultKey: 'lastSlashCommandResult',  // Context key (default)
  next: 'NEXT_NODE',                    // Static or dynamic transition
});
```

### Supported Commands

| Command | Purpose |
|---------|---------|
| `/edit` | Edit files |
| `/commit` | Git commit |
| `/test` | Run tests |
| `/review` | Code review |

### Result Storage

Stores result in `state.context.lastSlashCommandResult`:

```typescript
interface SlashCommandResult {
  success: boolean;     // Command completed successfully
  output?: string;      // Command output
  error?: string;       // Error message if failed
  exitCode?: number;    // Exit code from command
}
```

### Example

```typescript
COMMIT: nodes.SlashCommandNode({
  command: 'commit',
  args: 'Fix authentication bug',
  next: (state) => {
    if (state.context.lastSlashCommandResult?.success) {
      return 'PUSH';
    }
    return 'HANDLE_COMMIT_ERROR';
  },
}),
```

---

## GitHubProjectNode

Updates issue status in GitHub Projects V2.

### Configuration

All configuration fields are **required** - no environment variable fallbacks. Use `process.env.*` explicitly if needed:

```typescript
nodes.GitHubProjectNode({
  // Required: GitHub authentication
  token: process.env.GITHUB_TOKEN!,

  // Required: Project identification
  projectOwner: 'my-org',           // User or organization
  projectNumber: 1,                  // From project URL

  // Required: Repository context
  owner: 'my-org',
  repo: 'my-repo',

  // Required: Target status
  status: 'In Progress',            // Must match project option exactly

  // Issue number (one of these required)
  issueNumber: 123,                 // Static issue number
  issueNumberKey: 'currentIssue',   // Or read from context

  // Optional settings
  throwOnError: true,               // Throw on failure (default: true)
  resultKey: 'lastProjectUpdate',   // Context key for result
  verbose: false,                   // Enable detailed logging

  next: 'NEXT_NODE',
});
```

### Shared Configuration Pattern

For workflows with multiple status transitions, define shared config:

```typescript
const projectConfig = {
  token: process.env.GITHUB_TOKEN!,
  projectOwner: 'my-org',
  projectNumber: 1,
  owner: 'my-org',
  repo: 'my-repo',
  issueNumberKey: 'issueNumber',
};

export default defineWorkflow({
  nodes: {
    START: nodes.GitHubProjectNode({
      ...projectConfig,
      status: 'In Progress',
      next: 'IMPLEMENT',
    }),

    DONE: nodes.GitHubProjectNode({
      ...projectConfig,
      status: 'Done',
      next: 'END',
    }),
  },
});
```

### Result Storage

Stores result in `state.context.lastProjectUpdate`:

```typescript
interface GitHubProjectResult {
  success: boolean;
  itemId?: string;           // Project item ID
  previousStatus?: string;   // Status before update
  newStatus: string;         // Status after update
  error?: string;            // Error message if failed
}
```

### Example: Full Workflow

```typescript
defineWorkflow<{ issueNumber: number }>({
  id: 'issue-workflow',

  initialState: {
    context: { issueNumber: 42 },
  },

  nodes: {
    START: nodes.GitHubProjectNode({
      token: process.env.GITHUB_TOKEN!,
      projectOwner: 'acme',
      projectNumber: 5,
      owner: 'acme',
      repo: 'webapp',
      status: 'In Progress',
      issueNumberKey: 'issueNumber',
      next: 'WORK',
    }),

    WORK: nodes.AgentNode({
      role: 'developer',
      system: 'Implement the feature described in the issue.',
      tools: ['read_file', 'write_file'],
      next: 'COMPLETE',
    }),

    COMPLETE: nodes.GitHubProjectNode({
      token: process.env.GITHUB_TOKEN!,
      projectOwner: 'acme',
      projectNumber: 5,
      owner: 'acme',
      repo: 'webapp',
      status: 'Done',
      issueNumberKey: 'issueNumber',
      next: 'END',
    }),
  },
});
```
