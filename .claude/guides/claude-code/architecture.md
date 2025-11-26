# Claude Code Architecture Guide

Project-specific patterns and conventions for Claude Code configuration.

## Nested CLAUDE.md Files

- **Parent Discovery**: Recurses UP from working directory, loading parent CLAUDE.md files (root first, then nested)
- **Child Discovery**: Child CLAUDE.md files load on-demand when accessing files in subdirectories
- **Additive**: All CLAUDE.md files load into context together (not replacement)
- **Precedence**: Most nested/specific CLAUDE.md takes precedence when conflicts occur
- **Example**: Working in `modules/aichat/presentation/web/` loads root CLAUDE.md first, then `modules/aichat/presentation/web/CLAUDE.md` if present
    - Root CLAUDE.md: Agent orchestration, project-wide patterns (always applies)
    - Nested CLAUDE.md: Sub-project specific patterns, frontend build commands, npm scripts (supplements root, overrides on conflicts)

## Dynamic Context Pattern

- **Dynamic:** `!\`ls .claude/commands/\`` - Loads fresh data on each invocation
- **Static (avoid):** Hardcoding file lists - Becomes stale, wastes tokens

## MCP Configuration

Use `.mcp.json` for team-shared servers, `settings.local.json` for personal/private servers.

## Personal, Direct Language

- Address Claude directly using "you" instead of generic third-person
- Write instructions as if speaking to Claude personally
- Avoid: "ALL test-related work uses **SINGLE `editor`** agent only"
- Use: "Always use a SINGLE `editor` agent for all test-related work"
- Apply to CLAUDE.md, agent definitions, commands, and all configuration files

## Project-Specific Anti-Patterns

**NEVER:**

- Modify § 1 CRITICAL RULES in CLAUDE.md without full understanding
- Use reserved command names (/config, /help, /clear, /settings)
- Break frontmatter format or bypass orchestration patterns
- Use static context instead of dynamic loading
- Commit secrets or hardcode credentials (use `${ENV_VAR}` expansion)
