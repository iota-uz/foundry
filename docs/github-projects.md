---
layout: default
title: GitHub Projects Integration
nav_order: 35
description: 'Update issue status in GitHub Projects V2 when workflows complete'
---

# GitHub Projects Integration

A module for updating issue status in GitHub Projects V2 via GraphQL API. Use this to automatically move issues between status columns (e.g., "In Progress" to "Done") when workflows complete.

## Overview

The GitHub Projects module provides:

1. **Project validation** at startup - ensures project exists and status options are valid
2. **Exact status matching** - status names must exactly match project options (case-insensitive)
3. **Auto-add to project** - issues not in the project are automatically added
4. **Flexible transitions** - update to any status at any time (not just completion)
5. **Standalone usage** - works independently or integrated with dispatch/graph workflows

### Example Status Transitions

```
Issue Lifecycle:
  Backlog → In Progress → In Review → Done

Workflow Integration:
  - Issue dispatched → "In Progress"
  - Worker completes → "In Review"
  - CI passes → "Done"
  - CI fails → "Needs Work"
```

## Installation

The module is included with Foundry. Import it in your code:

```typescript
import { ProjectsClient, createProjectsClient } from '@/lib/github-projects';
```

## Usage

### Basic Usage

```typescript
import { createProjectsClient } from '@/lib/github-projects';

const client = createProjectsClient({
  token: process.env.GITHUB_TOKEN!,
  projectOwner: 'iota-uz',
  projectNumber: 1,
  verbose: true,
});

// Validate project and cache status options
const validation = await client.validate();
if (!validation.valid) {
  console.error('Project validation failed:', validation.errors);
  process.exit(1);
}

console.log('Available statuses:', client.getAvailableStatuses());
// ['Todo', 'In Progress', 'Done']

// Update issue status
const result = await client.updateStatus({
  owner: 'iota-uz',
  repo: 'foundry',
  issueNumber: 123,
  status: 'Done',
});

if (result.success) {
  console.log(`Updated issue #123 to "${result.newStatus}"`);
} else {
  console.error('Failed:', result.error);
}
```

### Integration with Dispatch

After dispatching issues, update their status to "In Progress":

```typescript
import { dispatch } from '@/lib/dispatch';
import { createProjectsClient } from '@/lib/github-projects';

const dispatchResult = await dispatch(config);

// Setup projects client
const projectsClient = createProjectsClient({
  token: config.token,
  projectOwner: 'iota-uz',
  projectNumber: 1,
});

await projectsClient.validate();

// Mark dispatched issues as "In Progress"
for (const issue of dispatchResult.readyIssues) {
  await projectsClient.updateStatus({
    owner: issue.issue.owner,
    repo: issue.issue.repo,
    issueNumber: issue.issue.number,
    status: 'In Progress',
  });
}
```

### Intermediate Status Transitions

The module supports any status transition at any point in a workflow:

```typescript
import { createProjectsClient } from '@/lib/github-projects';

const client = createProjectsClient({ /* config */ });
await client.validate();

// When work starts
await client.updateStatus({
  owner: 'iota-uz',
  repo: 'foundry',
  issueNumber: 123,
  status: 'In Progress',
});

// When PR is created (intermediate step)
await client.updateStatus({
  owner: 'iota-uz',
  repo: 'foundry',
  issueNumber: 123,
  status: 'In Review',
});

// When CI fails (transition to needs-fix state)
await client.updateStatus({
  owner: 'iota-uz',
  repo: 'foundry',
  issueNumber: 123,
  status: 'Needs Work',
});

// When everything passes
await client.updateStatus({
  owner: 'iota-uz',
  repo: 'foundry',
  issueNumber: 123,
  status: 'Done',
});
```

You can also query the current status before deciding on transitions:

```typescript
const currentStatus = await client.getIssueStatus('iota-uz', 'foundry', 123);
console.log(`Current status: ${currentStatus}`);

// Only transition if in expected state
if (currentStatus === 'In Review') {
  await client.updateStatus({
    owner: 'iota-uz',
    repo: 'foundry',
    issueNumber: 123,
    status: 'Done',
  });
}
```

### GitHub Actions Integration

{% raw %}

```yaml
name: Update Project Status

on:
  workflow_run:
    workflows: ['Process Issue']
    types:
      - completed

jobs:
  update-status:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - run: bun install

      - name: Update to Done
        if: ${{ github.event.workflow_run.conclusion == 'success' }}
        run: |
          bun run update-project-status.ts \
            --project-owner ${{ github.repository_owner }} \
            --project-number 1 \
            --issue ${{ github.event.workflow_run.head_sha }} \
            --status "Done"
        env:
          GITHUB_TOKEN: ${{ secrets.PROJECT_TOKEN }}
```

{% endraw %}

## Configuration

### ProjectsConfig

| Option           | Type    | Required | Description                     |
| ---------------- | ------- | -------- | ------------------------------- |
| `token`          | string  | Yes      | GitHub PAT with `project` scope |
| `projectOwner`   | string  | Yes      | User or organization name       |
| `projectNumber`  | number  | Yes      | Project number (from URL)       |
| `verbose`        | boolean | No       | Enable verbose logging          |

### Required Token Scopes

The GitHub token must have these scopes:

- `project` - Read/write access to projects
- `repo` - Read access to repository issues

For organization projects, you may also need:

- `read:org` - Read organization membership

## API Reference

### ProjectsClient

#### `validate(): Promise<ProjectValidation>`

Validates the project configuration and caches status options. **Must be called before other methods.**

Returns:
- `valid`: boolean - Whether validation passed
- `project`: Project details
- `statusField`: Status field configuration
- `statusOptions`: Available status options
- `errors`: Validation errors
- `warnings`: Validation warnings

#### `updateStatus(request: UpdateStatusRequest): Promise<UpdateStatusResult>`

Updates the status of an issue in the project.

Request:
- `owner`: Repository owner
- `repo`: Repository name
- `issueNumber`: Issue number
- `status`: Target status (must exactly match an option)

Result:
- `success`: Whether update succeeded
- `item`: The project item
- `previousStatus`: Previous status (if available)
- `newStatus`: New status value
- `error`: Error message if failed

#### `getIssueStatus(owner, repo, issueNumber): Promise<string | null>`

Gets the current status of an issue in the project. Returns `null` if issue is not in the project.

#### `findProjectItem(owner, repo, issueNumber): Promise<ProjectItem | null>`

Finds a project item by issue. Returns `null` if not found.

#### `addIssueToProject(owner, repo, issueNumber): Promise<ProjectItem>`

Adds an issue to the project. Returns the created project item.

#### `getAvailableStatuses(): string[]`

Returns list of available status option names.

#### `isValidStatus(status: string): boolean`

Checks if a status name is valid (case-insensitive).

## Status Matching

Status names are matched **exactly** (case-insensitive):

| Input        | Project Option | Match? |
| ------------ | -------------- | ------ |
| "Done"       | "Done"         | Yes    |
| "done"       | "Done"         | Yes    |
| "DONE"       | "Done"         | Yes    |
| "Completed"  | "Done"         | No     |
| "In Progress"| "In Progress"  | Yes    |
| "InProgress" | "In Progress"  | No     |

If a status doesn't match, the operation fails with `STATUS_NOT_FOUND` error and lists available options.

## Error Handling

### Error Codes

| Code                  | Description                           |
| --------------------- | ------------------------------------- |
| `AUTH_ERROR`          | Authentication failed or insufficient permissions |
| `PROJECT_NOT_FOUND`   | Project doesn't exist or not accessible |
| `FIELD_NOT_FOUND`     | Status field not found in project     |
| `STATUS_NOT_FOUND`    | Requested status doesn't match any option |
| `ITEM_NOT_FOUND`      | Issue not found in repository         |
| `ISSUE_NOT_IN_PROJECT`| Issue exists but not in project       |
| `GRAPHQL_ERROR`       | GitHub GraphQL API error              |
| `RATE_LIMIT`          | GitHub API rate limit exceeded        |
| `VALIDATION_ERROR`    | Client not validated before operation |

### Example Error Handling

```typescript
import { ProjectsError } from '@/lib/github-projects';

try {
  await client.updateStatus({
    owner: 'iota-uz',
    repo: 'foundry',
    issueNumber: 123,
    status: 'Completed', // Wrong - should be "Done"
  });
} catch (err) {
  if (err instanceof ProjectsError) {
    if (err.code === 'STATUS_NOT_FOUND') {
      console.log('Available statuses:', client.getAvailableStatuses());
    }
  }
}
```

## Graph Workflow Integration

Use `GitHubProjectNode` to update status at any step in a graph workflow.

All configuration is explicit - use `process.env.*` if you need environment variables:

```typescript
import { defineWorkflow, nodes } from '@/lib/graph';

// Configuration shared across nodes
const projectConfig = {
  token: process.env.GITHUB_TOKEN!,
  projectOwner: process.env.PROJECT_OWNER!,
  projectNumber: Number(process.env.PROJECT_NUMBER),
  owner: process.env.REPO_OWNER!,
  repo: process.env.REPO_NAME!,
};

export default defineWorkflow({
  id: 'issue-processor',
  nodes: {
    // Mark issue as In Progress when workflow starts
    START: nodes.GitHubProjectNode({
      ...projectConfig,
      issueNumberKey: 'issueNumber', // read from context
      status: 'In Progress',
      then: 'PLAN',
    }),

    PLAN: nodes.AgentNode({
      role: 'planner',
      system: 'Create implementation plan...',
      then: 'BUILD',
    }),

    BUILD: nodes.CommandNode({
      command: 'bun run build',
      then: 'TEST',
    }),

    TEST: nodes.SlashCommandNode({
      command: 'test',
      args: 'run all tests',
      then: 'REVIEW',
    }),

    // Move to In Review when ready for review
    REVIEW: nodes.GitHubProjectNode({
      ...projectConfig,
      issueNumberKey: 'issueNumber',
      status: 'In Review',
      then: 'DONE',
    }),

    // Mark as Done when complete
    DONE: nodes.GitHubProjectNode({
      ...projectConfig,
      issueNumberKey: 'issueNumber',
      status: 'Done',
      then: 'END',
    }),
  },
});
```

### GitHubProjectNode Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `token` | string | Yes | GitHub token with `project` scope |
| `projectOwner` | string | Yes | Project owner (user or org) |
| `projectNumber` | number | Yes | Project number (from URL) |
| `owner` | string | Yes | Repository owner |
| `repo` | string | Yes | Repository name |
| `status` | string | Yes | Target status (must match project option) |
| `next` | string \| function | Yes | Next node or transition function |
| `issueNumber` | number | No | Static issue number to update |
| `issueNumberKey` | string | No | Context key to read issue number (default: `issueNumber`) |
| `throwOnError` | boolean | No | Throw on update failure (default: true) |
| `resultKey` | string | No | Context key to store result (default: `lastProjectResult`) |

### Dynamic Issue Resolution

The node resolves issue number from (in order):

1. `issueNumber` config option (static)
2. Workflow context via `issueNumberKey` (dynamic)

```typescript
// Issue number from context
nodes.GitHubProjectNode({
  ...projectConfig,
  issueNumberKey: 'currentIssue', // reads from state.context.currentIssue
  status: 'Done',
  then: 'END',
})
```

## Limitations

- **GitHub Projects V2 only** - Classic projects are not supported
- **Single Status field** - Assumes the field is named "Status"
- **Same project only** - Cannot update items across projects in one call
- **API rate limits** - Each operation requires multiple GraphQL calls

## Testing

Run the GitHub Projects tests:

```bash
bun test src/lib/github-projects/__tests__
```
