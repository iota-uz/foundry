---
layout: default
title: MCP Servers
parent: Workflow Builder
nav_order: 5
description: 'Model Context Protocol server configuration for agent nodes'
---

# MCP Server Configuration

Agent nodes can connect to Model Context Protocol (MCP) servers to extend their capabilities with external tools and resources.

## Overview

MCP servers provide additional tools beyond the standard library. Foundry supports:

- **Preset servers** - Pre-configured popular integrations
- **Custom servers** - Your own MCP server configurations

## Presets

Foundry includes presets for common MCP integrations:

| Preset | Description | Transport |
|--------|-------------|-----------|
| **Playwright** | Browser automation and testing | stdio |
| **Figma** | Design file access and manipulation | HTTP |
| **Sequential Thinking** | Structured reasoning capabilities | stdio |

### Playwright

Enables browser automation for web testing and scraping.

**Tools provided:**
- Navigate to URLs
- Click elements
- Fill forms
- Take screenshots
- Execute JavaScript

### Figma

Provides access to Figma design files.

**Tools provided:**
- Read design nodes
- Extract styles and components
- Get design metadata

### Sequential Thinking

Adds structured reasoning capabilities for complex problem-solving.

**Tools provided:**
- Step-by-step thinking
- Hypothesis generation
- Verification chains

## Configuration

### Using Presets

In the visual builder, select MCP servers from the agent node configuration panel. Presets are available as one-click options.

Programmatically, reference presets in agent node configuration:

```typescript
schema.agent('BROWSER_TEST', {
  role: 'tester',
  prompt: 'Test the web application.',
  capabilities: [StdlibTool.Read],
  mcpServers: [
    { type: 'preset', presetId: 'playwright' },
  ],
  then: 'VERIFY',
});
```

### Custom Servers

Define custom MCP servers for specialized integrations.

#### Stdio Transport

For servers that run as child processes:

```typescript
mcpServers: [
  {
    type: 'custom',
    name: 'my-server',
    config: {
      command: 'npx',
      args: ['my-mcp-server'],
      env: { API_KEY: process.env.MY_API_KEY },
    },
  },
]
```

#### HTTP Transport

For servers accessible via HTTP:

```typescript
mcpServers: [
  {
    type: 'custom',
    name: 'my-http-server',
    config: {
      type: 'http',
      url: 'https://mcp.example.com/api',
      headers: { Authorization: 'Bearer token' },
    },
  },
]
```

#### SSE Transport

For servers using Server-Sent Events:

```typescript
mcpServers: [
  {
    type: 'custom',
    name: 'my-sse-server',
    config: {
      type: 'sse',
      url: 'https://mcp.example.com/sse',
      headers: { Authorization: 'Bearer token' },
    },
  },
]
```

## Types

### McpServerSelection

```typescript
type McpServerSelection = PresetMcpServer | CustomMcpServer;

interface PresetMcpServer {
  type: 'preset';
  presetId: 'playwright' | 'figma' | 'sequential-thinking';
  env?: Record<string, string>;  // Environment overrides
}

interface CustomMcpServer {
  type: 'custom';
  name: string;
  config: McpServerConfig;
}
```

### McpServerConfig

```typescript
type McpServerConfig = McpStdioConfig | McpHttpConfig | McpSseConfig;

interface McpStdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpHttpConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

interface McpSseConfig {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}
```

## Visual Builder

In the workflow builder UI:

1. Select an Agent node on the canvas
2. Open the configuration panel on the right
3. Scroll to the "MCP Servers" section
4. Click "Add MCP Server"
5. Choose a preset or configure a custom server

Presets show as clickable cards with icons. Custom servers open a configuration form for transport type, URL/command, and optional headers or environment variables.

## Best Practices

### Security

- Store API keys and tokens in environment variables
- Use encrypted workflow secrets for sensitive configuration
- Prefer HTTPS for HTTP/SSE transports

### Performance

- Only include MCP servers when their tools are needed
- Stdio servers have startup overhead on first use
- HTTP servers are generally faster for repeated calls

### Debugging

Enable verbose logging to see MCP communication:

```bash
GRAPH_VERBOSE=true bun run graph workflow.config.ts
```
