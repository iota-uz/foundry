# Claude Code Commands Reference

Complete reference for creating and managing slash commands in Claude Code.
Always fetch official documentation: https://docs.claude.com/en/docs/claude-code/slash-commands

### File References with @

Commands can reference files using the `@` prefix:

```markdown
## Analyze This File

Review the code in @src/components/Button.tsx and suggest improvements.
```

Benefits:

- Faster command execution
- Easier to share and review
- Direct file content loading. No need for agent to execute a separate tool call using `Read` tool

### Command Organization

Commands can be organized in subdirectories:

```
.claude/commands/
├── deployment/
│   ├── staging.md
│   └── production.md
├── testing/
│   ├── unit.md
│   └── integration.md
└── review.md
```

## Guidelines for Creating Commands

### Naming

- Use clear, descriptive names (kebab-case)
- Write clear `description`: "When this command should be used"

NEVER use these reserved/built-in command names:

`/add-dir`, `/agents`, `/bug`, `/clear`, `/compact`, `/config`, `/cost`, `/doctor`, `/help`, `/init`, `/login`,
`/logout`, `/mcp`, `/memory`, `/model`, `/permissions`, `/pr_comments`, `/review`, `/rewind`, `/status`,
`/terminal-setup`, `/usage`, `/vim`

**Best Practice:** Use descriptive, project-specific names like `/manage-config`, `/check-quality`, `/deploy-staging`,
etc.

### Context Loading

- Use dynamic context loading (!`command`) instead of static data
- Support arguments with `$ARGUMENTS`, `$1`, `$2` when useful

### Dynamic Execution Safety

**IMPORTANT:** Commands using `!`command`` MUST have the base command whitelisted in `.claude/settings.json`.

**Validation Workflow:**

1. Identify all `!`command`` instances in your slash command
2. Extract base commands (first word of each command)
3. Check `.claude/settings.json` → `permissions.allow` array
4. Add missing `Bash(command:*)` entries if needed

**Examples:**

```markdown
# Command uses: !`ls .claude/commands/`

# Required in settings.json: "Bash(ls:*)"

# Command uses: !`find modules -name "*.go"`

# Required in settings.json: "Bash(find:*)"

# Command uses: !`grep -r "TODO" --include="*.go"`

# Required in settings.json: "Bash(grep:*)"
```

**Common dynamic commands to whitelist:**

- `Bash(ls:*)` - Directory listings
- `Bash(find:*)` - File searches
- `Bash(grep:*)` - Content searches
- `Bash(cat:*)` - File reading (prefer Read tool when possible)
- `Bash(wc:*)` - Counting files/lines
- `Bash(git:*)` - Git commands

**Note:** Dynamic execution runs at command invocation time, so whitelisting must be done before the command is used.

### Tool Permissions

**IMPORTANT: Permission Hierarchy**

Commands can **only restrict** tools already allowed in `settings.json` or `settings.local.json`, never grant new
permissions:

- **Settings files define the ceiling**: These establish the maximum set of allowed tools for the session
- **Commands can only subset**: `allowed-tools` in a command can only restrict from what's in settings
- **Omitting `allowed-tools`**: If not specified, the command inherits all tools from settings

**Example:**

```yaml
# settings.json allows: [Read, Write, Edit, Bash(git:*)]

# VALID - Command restricts to subset
allowed-tools: |
  Read, Edit

# INVALID - Command tries to expand permissions
allowed-tools: |
  Read, Bash(*)  # Bash(*) not in settings, will be ignored

# VALID - Inherits all from settings
# (omit allowed-tools key entirely)
```

**Recommended for file operations:**

- `Read, Write, Edit, Glob, Grep` - File operations
- `Bash(git:*)`, `Bash(make:*)` - Specific patterns only

**Avoid for project commands:**

- `Bash(ls:*)`, `Bash(cat:*)`, `Bash(sed:*)` - Prefer Read/Glob/Grep tools
- `Bash(*)` - Security risk

**Note:** Meta-commands like `/manage-config` may need `ls/sed/cat` for dynamic context loading, but only if these are
already allowed in settings

## Frontmatter Options

Commands use YAML frontmatter to configure behavior:

| Field                      | Description                                                                                                 | Default                             |
|----------------------------|-------------------------------------------------------------------------------------------------------------|-------------------------------------|
| `allowed-tools`            | List of tools the command can use (can only restrict tools already allowed in settings, never grant new)    | Inherits from conversation settings |
| `description`              | Brief description shown in command list and autocomplete                                                    | Uses first line from command prompt |
| `argument-hint`            | Arguments expected for the command (e.g., `<module> [tests\|coverage\|all]`)                                | None                                |
| `model`                    | Specific model to use (e.g., `haiku`, `sonnet`, `opus`)                                                     | Inherits from conversation          |
| `disable-model-invocation` | Prevents SlashCommand tool from automatically invoking this command (for meta-commands or manual execution) | `false`                             |

**Key Points:**

- Only `allowed-tools` restricts permissions (see § Tool Permissions above)
- `argument-hint` appears during autocomplete to guide users
- `model` override useful for simple commands that can use faster/cheaper models
- `disable-model-invocation` used for commands that generate other commands or configs

## Example: Comprehensive Module Analysis Command

This example demonstrates all key features of slash commands in a single, practical command:

```markdown
---
allowed-tools: |
  Read, Grep, Glob, Bash(go:*)
description: "Analyze Go module $1 with optional focus: tests, coverage, or all"
argument-hint: "<module-name> [tests|coverage|all]"
model: sonnet
---

## Module Analysis: $1

### File Structure

Files in module: !`find modules/$1 -type f -name "*.go" | head -20`

### Test Files

Test coverage: !`find modules/$1 -name "*_test.go"`

### Test Execution (if $2 includes "tests" or "all")

!`cd modules/$1 && go test -v ./...`

### Coverage Report (if $2 includes "coverage" or "all")

!`cd modules/$1 && go test -cover ./...`

## Analysis Instructions

Analyze the module structure, review test coverage, and provide:

1. Architecture overview from file organization
2. Test coverage assessment and gaps
3. Code quality recommendations
4. Suggested improvements
```

**Features Demonstrated:**

- **Frontmatter Fields**:
    - `allowed-tools`: Restricts to Read, Grep, Glob, Bash(go:*)
    - `description`: Clear purpose shown in command list
    - `argument-hint`: Shows expected arguments in autocomplete
    - `model`: Uses sonnet for analysis (could use haiku for simpler tasks)
- **Dynamic Context**: !`shell command` loads fresh data at execution time
- **Positional Arguments**: `$1` (required module name), `$2` (optional analysis type)
- **Multiple Contexts**: File listing, test discovery, test execution, coverage analysis
- **Conditional Execution**: Different commands based on `$2` argument value
- **Minimal Permissions**: Only tools needed for the specific task
- **File References**: Can add `@modules/$1/service.go` to pre-load specific files

**Usage Examples:**

- `/analyze-module logistics` - Basic analysis with file structure
- `/analyze-module logistics tests` - Include test execution
- `/analyze-module logistics coverage` - Include coverage report
- `/analyze-module logistics all` - Full analysis with tests and coverage

## Best Practices

1. Single Purpose: Each command should have one clear goal
2. Dynamic Context: Always prefer `!\`command\`` over hardcoded data
3. Minimal Permissions: Grant only the tools needed for the task
4. Clear Description: Make it obvious when the command should be used
5. Argument Support: Use `$1`, `$2` for clarity over `$ARGUMENTS`
6. Documentation: Include examples and expected behavior
