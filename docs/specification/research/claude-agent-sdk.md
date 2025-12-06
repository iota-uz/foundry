---
layout: default
title: Claude Agent SDK Research
nav_order: 20
parent: Specification
---

# Claude Agent SDK Research

**Status:** Research Complete
**Last Updated:** 2025-11-26

This is a comprehensive research document on the Claude Agent SDK.

## Key Contents

- Core API patterns and configuration
- Session management and persistence
- MCP (Model Context Protocol) integration
- Custom tool implementation patterns
- Error handling and retry strategies
- Next.js integration examples
- Performance optimization
- Foundry-specific recommendations

## Complete API Reference

For the complete detailed technical content including comprehensive function signatures, type definitions, message types, hook types, and tool input/output types, please refer to the dedicated API reference document: **claude-agent-sdk-apis.md**

## Research Areas Covered

### 1. Session Management
- Starting and resuming sessions
- Permission mode handling
- Conversation state persistence
- Checkpoint management

### 2. MCP Integration
- Creating MCP servers with the SDK
- Tool definition with Zod schemas
- Server configuration (stdio, SSE, HTTP)
- Tool usage and permissions

### 3. Custom Tools
- Defining type-safe tools
- Handler implementation patterns
- Input validation
- Output formatting

### 4. Error Handling
- Permission denials
- Tool execution errors
- Retry strategies
- Graceful degradation

### 5. Streaming & Async
- Streaming user input
- Async generator patterns
- Progress callbacks
- Real-time feedback

### 6. Performance Optimization
- Context window management
- Token usage tracking
- Batch operations
- Cache utilization

## Foundry-Specific Recommendations

### 1. Use Sonnet as Default Model
- Balanced performance/cost
- Strong code understanding
- Suitable for most tasks
- Fast iteration

### 2. Implement Proper Session Handling
- Resume sessions for multi-turn workflows
- Use checkpoints for workflow phases
- Save session state to SQLite
- Enable recovery on crashes

### 3. MCP for Extension Points
- Custom tools for Foundry-specific operations
- Validation hooks on artifact save
- Git integration points
- File system access controls

### 4. Streaming for Large Operations
- Stream code generation
- Progressive artifact building
- Real-time UI feedback
- User interruption capability

### 5. Permission Model
- Default permissions for local file access
- Explicit approval for external services
- Configuration file for common patterns
- User override capability

## Related Documentation

- **API Schema**: /docs/specification/api-schema.md
- **Technical Architecture**: /docs/specification/technical.md
- **Data Model**: /docs/specification/data-model.md
- **AI Tools & Model Selection**: /docs/specification/tools.md

## Integration Points with Foundry

### Question Generation
- Use Sonnet for initial Q&A workflow generation
- Stream questions as they're formulated
- Store responses in SQLite for audit trail

### Artifact Generation
- Schema, API, and component generators trigger after Q&A
- Use Opus for complex schema analysis (reverse engineering)
- Stream partial results for progressive UI updates

### Analysis & Validation
- Consistency analyzer uses Sonnet
- Lessons learned feedback to model
- Constitution context for all generations

### Reverse Engineering
- AI-driven codebase analysis (no parsers)
- Language-agnostic interpretation
- Confidence levels for each extraction
- Interactive disambiguation

## Performance Targets

| Operation | Target Time | Model |
|-----------|------------|-------|
| Q&A batch (5-7 questions) | 3-5 seconds | Sonnet |
| Schema generation (10 tables) | 2-3 seconds | Sonnet |
| API generation (20 endpoints) | 3-5 seconds | Sonnet |
| Code analysis (reverse engineering) | 10-30 seconds | Opus |
| Consistency check (100 artifacts) | 5-10 seconds | Sonnet |

## Testing Strategy

### Unit Tests
- Tool definition validation
- Permission checking
- Session management

### Integration Tests
- MCP server lifecycle
- Tool execution with real handlers
- Error recovery

### E2E Tests
- Full workflow scenarios
- Multi-turn conversations
- State persistence and recovery

## Known Limitations

1. **Context Window**: Even with 200K tokens, very large codebases may need chunking
2. **Non-Determinism**: Same input may produce slightly different output
3. **Token Costs**: Long sessions or large artifacts increase API costs
4. **Rate Limiting**: May need backoff for rapid requests
5. **File Access**: SDK tools have file system permissions limits

## Migration Path

If Claude API changes or new models become available:
1. Model selection is abstracted to configuration
2. Tool definitions are independent of model
3. Session format is version-controlled
4. Gradual migration path planned

## Additional Resources

- [Claude Agent SDK GitHub](https://github.com/anthropic-ai/claude-agent-sdk)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Anthropic Cookbook: Agent Patterns](https://github.com/anthropic-ai/anthropic-cookbook)

---

## Summary

The Claude Agent SDK provides a powerful, flexible foundation for building AI-driven applications with strong typing, session management, and extensibility through MCP. Foundry's architecture leverages these capabilities to create deterministic workflows while maintaining the flexibility to adapt to user needs through interactive Q&A and verification steps.
