---
layout: default
title: Issue Dispatcher
nav_order: 30
description: 'DAG-based GitHub Issue queue for automated software development pipelines'
---

# GitHub Issue DAG Dispatcher

A controller for managing GitHub Issue dependencies and generating execution matrices for distributed workers in GitHub Actions.

## Overview

The dispatch controller is the heart of a distributed, autonomous software factory. It:

1. Fetches GitHub issues with a specified label (default: `queue`)
2. Parses dependency declarations from issue bodies
3. Builds a Directed Acyclic Graph (DAG) of dependencies
4. Determines READY/BLOCKED status for each issue
5. Generates a GitHub Actions matrix for parallel execution

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  GitHub Issues  │────▶│   DAG Builder    │────▶│  Matrix Output  │
│   (with deps)   │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │                       ▼                        │
        │              ┌──────────────────┐              │
        │              │  Cycle Detection │              │
        │              │    (Tarjan's)    │              │
        │              └──────────────────┘              │
        │                       │                        │
        ▼                       ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Dependency    │     │ Status Resolution│     │  GitHub Actions │
│     Parser      │     │ READY/BLOCKED    │     │    Workflow     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Installation

The dispatcher is included with Foundry. Run it using:

```bash
# Using bun directly
bun src/lib/dispatch/cli.ts [options]
```

## Usage

### Command Line Interface

```bash
foundry dispatch [options]
```

#### Options

| Option                 | Description                  | Default                         |
| ---------------------- | ---------------------------- | ------------------------------- |
| `--owner <owner>`      | Repository owner             | Parsed from `GITHUB_REPOSITORY` |
| `--repo <repo>`        | Repository name              | Parsed from `GITHUB_REPOSITORY` |
| `--token <token>`      | GitHub personal access token | `GITHUB_TOKEN` env              |
| `--label <label>`      | Label to filter issues       | `queue`                         |
| `--max-concurrent <n>` | Maximum concurrent issues    | unlimited                       |
| `--output, -o <file>`  | Output file for matrix JSON  | stdout                          |
| `--dry-run`            | Run without side effects     | false                           |
| `--verbose, -v`        | Enable verbose logging       | false                           |

#### Environment Variables

| Variable            | Description                                     |
| ------------------- | ----------------------------------------------- |
| `GITHUB_TOKEN`      | GitHub personal access token                    |
| `GITHUB_REPOSITORY` | Repository in `owner/repo` format (auto-parsed) |

### Programmatic API

```typescript
import { dispatch, type DispatchConfig, type DispatchResult } from '@/lib/dispatch';

const config: DispatchConfig = {
  token: process.env.GITHUB_TOKEN!,
  owner: 'iota-uz',
  repo: 'foundry',
  queueLabel: 'queue',
  maxConcurrent: 5,
  verbose: true,
};

const result: DispatchResult = await dispatch(config);

console.log('Ready issues:', result.readyIssues.length);
console.log('Blocked issues:', result.blockedIssues.length);
console.log('Matrix:', JSON.stringify(result.matrix, null, 2));
```

## Dependency Syntax

Issues can declare dependencies in their body using several formats:

```markdown
# Explicit dependency declarations

Depends on #123
Depends on owner/repo#123
Blocked by #456
Requires #789, #790
After #100, owner/repo#101
```

### Supported Patterns

- `Depends on #<number>` - Same repository dependency
- `Depends on owner/repo#<number>` - Cross-repository dependency
- `Blocked by #<number>` - Alias for depends on
- `Requires #<number>` - Alias for depends on
- `After #<number>` - Alias for depends on

Multiple dependencies can be comma-separated on a single line.

## Priority Labels

Issues are prioritized based on labels:

| Label               | Priority Score |
| ------------------- | -------------- |
| `priority:critical` | 0 (highest)    |
| `priority:high`     | 1              |
| `priority:medium`   | 2              |
| `priority:low`      | 3              |
| (none)              | 4 (lowest)     |

Issues with the same priority are sorted by creation date (FIFO).

## Status Resolution

Each issue is assigned a status:

- **READY**: All dependencies are closed
- **BLOCKED**: One or more dependencies are still open
- **CLOSED**: The issue itself is closed

## GitHub Actions Integration

### Example Workflow

{% raw %}

```yaml
name: Issue Dispatcher

on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes
  workflow_dispatch:

jobs:
  dispatch:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.dispatch.outputs.matrix }}
      has-issues: ${{ steps.check.outputs.has-issues }}
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - run: bun install

      - id: dispatch
        run: |
          bun src/lib/dispatch/cli.ts \
            --max-concurrent 3 \
            --output matrix.json
          echo "matrix=$(cat matrix.json)" >> $GITHUB_OUTPUT
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}

      - id: check
        run: |
          if jq -e '.include | length > 0' matrix.json > /dev/null; then
            echo "has-issues=true" >> $GITHUB_OUTPUT
          else
            echo "has-issues=false" >> $GITHUB_OUTPUT
          fi

  process:
    needs: dispatch
    if: needs.dispatch.outputs.has-issues == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJson(needs.dispatch.outputs.matrix) }}
      fail-fast: false
    steps:
      - name: Process Issue
        run: |
          echo "Processing issue #${{ matrix.issue_number }}"
          echo "Title: ${{ matrix.title }}"
          echo "Priority: ${{ matrix.priority }}"
```

{% endraw %}

### Matrix Output Format

```json
{
  "include": [
    {
      "issue_number": 123,
      "title": "Implement feature X",
      "priority": "high",
      "priority_score": 1,
      "repository": "iota-uz/foundry",
      "url": "https://github.com/iota-uz/foundry/issues/123"
    }
  ]
}
```

## Key Types

```typescript
// Configuration
interface DispatchConfig {
  token: string; // GitHub PAT
  owner: string; // Repo owner
  repo: string; // Repo name
  queueLabel?: string; // Filter by label (default: 'queue')
  maxConcurrent?: number; // Limit parallel jobs
  verbose?: boolean;
}

// Issue dependency references
interface DependencyRef {
  owner: string; // Can span repos
  repo: string;
  number: number;
}

// DAG Node representation
interface DagNode {
  id: string; // "owner/repo#number"
  issue: ResolvedIssue;
  dependsOn: string[]; // Forward edges
  dependedBy: string[]; // Reverse edges
}

// Issue status in the DAG
type IssueStatus = 'READY' | 'BLOCKED' | 'CLOSED';

// Priority levels (0=critical, 4=none)
type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';
```

## Edge Cases

### Circular Dependencies

The dispatcher detects circular dependencies and warns about them:

```
[Dispatcher] WARNING: Circular dependency detected: owner/repo#1 -> owner/repo#2 -> owner/repo#1
```

Issues involved in cycles are still processed - they're not automatically blocked. The warning helps maintainers identify and fix the cycle.

### Missing Dependencies

If a dependency reference points to a non-existent issue:

- Cross-repo dependencies: The dispatcher attempts to fetch the issue. If it fails, the dependency is considered blocking (conservative approach).
- Same-repo dependencies not in queue: Similar behavior - if not found, assumed blocking.

### Stale Labels

Issues that have been closed but still have the queue label are filtered out during processing. Only open issues are considered for dispatch.

### Rate Limiting

The GitHub client handles rate limiting gracefully:

- Throws a `GITHUB_RATE_LIMIT` error with reset time information
- Implements pagination to minimize API calls

## Error Codes

| Code                | Description                           |
| ------------------- | ------------------------------------- |
| `GITHUB_AUTH_ERROR` | Authentication failed (invalid token) |
| `GITHUB_RATE_LIMIT` | GitHub API rate limit exceeded        |
| `GITHUB_NOT_FOUND`  | Resource not found (404)              |
| `GITHUB_API_ERROR`  | General GitHub API error              |
| `PARSE_ERROR`       | Failed to parse issue body            |
| `INVALID_CONFIG`    | Invalid configuration                 |
| `CYCLE_DETECTED`    | Circular dependency warning           |
| `IO_ERROR`          | File system error                     |

## Testing

Run the dispatch tests:

```bash
bun test src/lib/dispatch/__tests__
```

Test coverage includes:

- Dependency parsing (various formats)
- DAG building and cycle detection
- Priority sorting
- MAX_CONCURRENT limiting
- CLI argument parsing
- Matrix generation
