# Claude Agent SDK Research

**Status:** Research Complete
**Last Updated:** 2025-11-26

## Overview

The Claude Agent SDK (formerly Claude Code SDK) provides a production-ready framework for building AI agents with Claude. This document focuses on **non-obvious implementation details, gotchas, and advanced patterns** relevant to building Foundry.

### Package Information

| Attribute | Value |
|-----------|-------|
| npm Package | `@anthropic-ai/claude-agent-sdk` |
| Previous Name | `@anthropic-ai/claude-code` |
| Node.js Requirement | 18+ |
| Python Requirement | 3.10+ |
| Installation | `npm install @anthropic-ai/claude-agent-sdk` |

---

## Core API Patterns

### The `query()` Function

The SDK's primary interface is the `query()` function, which returns an async iterator of messages:

```typescript
import { query, type Query } from '@anthropic-ai/claude-agent-sdk';

// Basic query
const stream: Query = query({
  prompt: 'Analyze this codebase structure',
});

// Iterate over streamed responses
for await (const item of stream) {
  if (item.type === 'assistant') {
    for (const chunk of item.message.content) {
      if (chunk.type === 'text') {
        console.log(chunk.text);
      }
    }
  }
}
```

### Session Management

**⚠️ Key Insight:** You only need to persist the **session ID string** (~40 chars). The SDK reconstructs full conversation history from this ID alone.

```typescript
// Start new session
let sessionId: string | undefined;

const stream = query({
  prompt: 'Initial message',
});

for await (const msg of stream) {
  if (msg.type === 'system' && msg.subtype === 'init') {
    sessionId = msg.session_id;
    // Store this in database - that's ALL you need!
    await db.sessions.save({ userId, sessionId });
  }
}

// Resume session later (even after server restart)
const resumedStream = query({
  prompt: 'Follow-up question',
  options: {
    resume: sessionId,  // Full context restored automatically
  },
});
```

### Configuration Options

```typescript
interface QueryOptions {
  // Model selection
  model?: string;                    // e.g., 'claude-sonnet-4.5'
  fallback_models?: string[];

  // Session management
  resume?: string;                   // Resume from session ID

  // Permission control
  permissions?: {
    mode?: 'standard' | 'all_tools' | 'file_edit_only';
  };
  allowedTools?: string[];           // Whitelist specific tools

  // MCP servers
  mcpServers?: Record<string, MCPServerConfig>;

  // Critical: Filesystem settings
  settingSources?: boolean;          // ⚠️ undefined = NO settings loaded!

  // Hooks
  hooks?: {
    on_tool_use?: (tool: any) => void;
    on_session_start?: (sessionId: string) => void;
  };

  // Structured outputs
  schema?: JSONSchema;
}
```

**⚠️ Critical Gotcha:** When `settingSources` is **undefined** (not explicitly `false`), the SDK does **NOT** load any filesystem configuration. This is unintuitive but important for serverless isolation.

### Environment Variables & Authentication

```bash
# Required
export ANTHROPIC_API_KEY=sk-ant-...

# Optional alternatives
export CLAUDE_CODE_USE_BEDROCK=1    # AWS Bedrock
export CLAUDE_CODE_USE_VERTEX=1     # Google Vertex AI
```

**⚠️ Critical Gotcha:** If `ANTHROPIC_API_KEY` is set, it **takes precedence** over Claude.ai subscription authentication, resulting in **API charges** rather than free Claude.ai usage.

### Message Types

```typescript
type StreamMessage =
  | { type: 'system'; subtype: 'init'; session_id: string }
  | { type: 'assistant'; message: { content: ContentBlock[] } }
  | { type: 'user'; text: string }
  | { type: 'tool_use'; tool_name: string; input: any }
  | { type: 'result'; subtype: 'success' | 'error'; result?: any }
  | { type: 'stream'; content: string };
```

---

## MCP (Model Context Protocol) Integration

MCP allows extending the SDK with custom tools and data sources. Three configuration methods exist:

### Method 1: `.mcp.json` File (Recommended for Persistence)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem"],
      "env": {
        "ALLOWED_PATHS": "/Users/me/projects"
      }
    },
    "remote-api": {
      "type": "sse",
      "url": "https://api.example.com/mcp/sse",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      }
    }
  }
}
```

### Method 2: Programmatic Configuration

```typescript
for await (const msg of query({
  prompt: "List files in my project",
  options: {
    mcpServers: {
      "filesystem": {
        command: "npx",
        args: ["@modelcontextprotocol/server-filesystem"],
        env: { ALLOWED_PATHS: "/Users/me/projects" }
      }
    },
    allowedTools: ["mcp__filesystem__list_files"]
  }
})) {
  // Process...
}
```

### Method 3: SDK MCP Server (In-Process Custom Tools)

```typescript
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const weatherTool = tool('get_weather', {
  description: 'Get current weather for a location',
  input: z.object({
    location: z.string().describe('City name'),
    units: z.enum(['celsius', 'fahrenheit']).optional(),
  }),
  execute: async (input) => {
    // Custom logic
    return `Weather in ${input.location}: Sunny`;
  },
});

const mcpServer = createSdkMcpServer({
  tools: [weatherTool],
});
```

### Transport Types

- **stdio**: External processes via stdin/stdout
- **HTTP/SSE**: Remote servers over network
- **In-process**: Custom tools within your application

**⚠️ Gotcha:** OAuth2 authentication for MCP servers is **not currently supported**. Use environment variable substitution (`${API_TOKEN}`) instead.

### Built-in Tools

The SDK includes 16 built-in tools:

**File Operations:** `Read`, `Write`, `Edit`, `Delete`, `List`
**Code Execution:** `Bash`, `Python`
**Web Access:** `WebSearch`, `WebFetch`
**Search:** `Glob`, `Grep`

---

## Custom Tool Implementation

### Tool Definition with Zod Schema

```typescript
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const customTool = tool(
  "tool_name",                        // Required: unique identifier
  "Human-readable description",       // Required: shown to Claude
  {
    // Input schema using Zod
    param1: z.string().describe("Parameter description"),
    param2: z.number().min(0).max(100),
    optional: z.string().optional(),
    complex: z.object({
      nested: z.string(),
      fields: z.array(z.string())
    }),
    validated: z.string().email()
  },
  async (args) => {
    // Handler function - always async
    // args is fully typed based on schema
    return {
      content: [{ type: "text", text: "result" }]
    };
  }
);
```

### Schema Validation Examples

```typescript
{
  // Type constraints
  email: z.string().email(),
  age: z.number().min(0).max(150),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]),
  items: z.array(z.string()).min(1).max(10),
  pattern: z.string().regex(/^[A-Z]+$/),
  flexible: z.union([z.string(), z.number()]),

  // Complex structures
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    metadata: z.record(z.string(), z.any()).optional()
  }),

  // Optional with defaults
  timeout: z.number().default(30),
  enabled: z.boolean().optional()
}
```

### Blocking Tool Pattern (Wait for External Input)

**This is the critical pattern for Foundry's `ask_user_question` tool:**

```typescript
// Global registry for response resolvers
const responseRegistry = new Map<
  string,
  { resolve: (value: string) => void; timeout: NodeJS.Timeout }
>();

const askUserTool = tool(
  "ask_user_question",
  "Ask user a question and wait for response",
  {
    question: z.string(),
    options: z.array(z.string()).optional(),
    timeoutSeconds: z.number().default(300)
  },
  async (args, extra) => {
    const sessionId = extra.session_id;

    return new Promise<any>((resolve, reject) => {
      // 1. Create promise resolver
      const handler = (response: string) => {
        responseRegistry.delete(sessionId);
        clearTimeout(timeoutHandle);

        resolve({
          content: [{
            type: "text",
            text: JSON.stringify({
              answer: response,
              answeredAt: new Date().toISOString()
            })
          }]
        });
      };

      // 2. Register handler
      responseRegistry.set(sessionId, {
        resolve: handler,
        timeout: null as any
      });

      // 3. Set timeout
      const timeoutHandle = setTimeout(() => {
        responseRegistry.delete(sessionId);
        reject(new Error("Question timeout"));
      }, args.timeoutSeconds * 1000);

      responseRegistry.get(sessionId)!.timeout = timeoutHandle;

      // 4. Emit SSE event to browser
      broadcastSSE("question", {
        sessionId,
        question: args.question,
        options: args.options
      });
    });
  }
);

// HTTP endpoint to receive user answer
app.post("/api/answer/:sessionId", (req, res) => {
  const handler = responseRegistry.get(req.params.sessionId);
  if (handler) {
    handler.resolve(req.body.answer);
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});
```

### Tool Execution Context

Tools receive `(args, extra)` where `extra` contains:

```typescript
interface ToolExtra {
  session_id: string;           // Current session ID
  transcript_path?: string;     // Path to conversation log
  cwd?: string;                 // Current working directory
  user_id?: string;             // If authenticated
  environment?: Record<string, string>;
}

const contextAwareTool = tool("example", "...", {},
  async (args, extra) => {
    console.log(`Session: ${extra.session_id}`);
    console.log(`CWD: ${extra.cwd}`);

    // Access shared state using session_id as key
    const state = sharedState.get(extra.session_id);
  }
);
```

### Error Handling Pattern

**⚠️ Critical:** Tools must **return errors as content**, not throw exceptions:

```typescript
const safeTool = tool(
  "risky_operation",
  "Operation that might fail",
  { input: z.string() },
  async (args) => {
    try {
      const result = await riskyOperation(args.input);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, result })
        }]
      };
    } catch (error) {
      // Return error as content, DON'T throw
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            code: "OPERATION_FAILED",
            timestamp: new Date().toISOString()
          })
        }]
      };
    }
  }
);
```

### Multi-Layer Permission Model

```typescript
// Layer 1: Global allowlist
const allowedTools = [
  "mcp__custom__read_file",
  "mcp__custom__fetch_api"
];

// Layer 2: Runtime permission callback
async function canUseTool(toolName: string, input: any) {
  if (toolName.includes("delete")) {
    const approved = await getUserApproval(`Delete: ${toolName}`);
    return {
      behavior: approved ? "allow" : "deny",
      message: approved ? undefined : "User denied"
    };
  }

  if (input.command?.includes("rm -rf")) {
    return {
      behavior: "deny",
      message: "Dangerous command blocked"
    };
  }

  return { behavior: "allow" };
}

// Layer 3: Hooks for programmatic control
const options = {
  hooks: {
    PreToolUse: [{
      hooks: [async (toolName, input) => {
        if (!validateInput(input)) {
          return { decision: "block" };
        }
        return { decision: "allow" };
      }]
    }]
  },
  canUseTool
};
```

### Real-World Example: Database Query Tool

```typescript
import { Pool } from "pg";

const pool = new Pool();

const dbQueryTool = tool(
  "query_database",
  "Execute SQL query with parameter safety",
  {
    query: z.string().describe("SQL with $1, $2 placeholders"),
    parameters: z.array(z.any()).optional(),
    timeout: z.number().default(30)
  },
  async (args) => {
    try {
      const client = await pool.connect();
      const result = await client.query({
        text: args.query,
        values: args.parameters,
        timeout: args.timeout * 1000
      });
      client.release();

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            rows: result.rows,
            rowCount: result.rowCount
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown",
            code: "DATABASE_ERROR"
          })
        }]
      };
    }
  }
);
```

---

## Session Management & Events

### Session Lifecycle

1. **Creation**: Session created automatically on first `query()` call
2. **Persistence**: SDK stores full conversation history server-side
3. **Resumption**: Pass session ID to `resume` parameter to restore
4. **Forking**: Use `forkSession` to branch conversations

**⚠️ Key Insight:** The SDK manages full conversation history internally. You only need to store the **session ID string** (~40 characters).

```typescript
// What you persist
await db.sessions.save({
  userId: "user123",
  sessionId: "abc123...",  // ~40 char string - that's ALL!
  createdAt: Date.now()
});

// What the SDK reconstructs automatically
// - Full message history
// - Tool execution results
// - Decision points
// - Context state
```

### Hook System

The SDK supports 6 lifecycle hooks:

| Hook | Timing | Payload |
|------|--------|---------|
| **PreToolUse** | Before tool execution | `{toolName, inputs, sessionId}` |
| **PostToolUse** | After tool completes | `{toolName, inputs, output, success}` |
| **UserPromptSubmit** | Before processing input | `{prompt, sessionId}` |
| **PermissionRequest** | Permission dialog | `{toolName, reason}` |
| **SessionStart** | Session begins | `{sessionId}` |
| **SessionEnd** | Session terminates | `{sessionId, duration}` |

**⚠️ Gotcha:** Hooks are configured in `~/.claude/settings.json`, not passed programmatically:

```json
{
  "hooks": [
    {
      "event": "PreToolUse",
      "matcher": "bash:*",
      "command": "validate-command.sh"
    },
    {
      "event": "PostToolUse",
      "matcher": "*:*",
      "command": "log-tool-use.sh"
    }
  ]
}
```

### Streaming vs Single Message Mode

```typescript
// Streaming (recommended) - full capabilities
for await (const msg of query({
  prompt: "...",
  // streaming: true is implicit
})) {
  // Receives messages as they stream
  // Supports images, hooks, interruption
}

// Single message (stateless) - simple queries
const response = await query({
  prompt: "...",
  options: { streaming: false }
});
```

### Tool Use Events During Streaming

```typescript
for await (const msg of query({ prompt: "..." })) {
  switch (msg.type) {
    case 'system':
      console.log(`Session: ${msg.session_id}`);
      break;

    case 'tool_use':
      console.log(`Tool: ${msg.tool_name}`);
      console.log(`Input: ${JSON.stringify(msg.input)}`);
      // Can intercept here via PreToolUse hook
      break;

    case 'result':
      if (msg.subtype === 'success') {
        console.log(`Result: ${msg.result}`);
      } else {
        console.error(`Error: ${msg.result}`);
      }
      break;

    case 'assistant':
      msg.message.content.forEach(block => {
        if (block.type === 'text') {
          console.log(block.text);
        }
      });
      break;
  }
}
```

### Multi-Turn Conversation Pattern for Web Servers

```typescript
// HTTP POST /api/ai/query
export async function POST(req: NextRequest) {
  const { message, sessionId } = await req.json();

  let activeSessionId = sessionId;
  let response = "";

  for await (const msg of query({
    prompt: message,
    options: {
      resume: sessionId,
      settingSources: false,  // Important for serverless!
    }
  })) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      activeSessionId = msg.session_id;
    }

    if (msg.type === 'assistant') {
      for (const block of msg.message.content) {
        if (block.type === 'text') {
          response += block.text;
        }
      }
    }
  }

  return NextResponse.json({
    sessionId: activeSessionId,
    response
  });
}
```

---

## Performance Considerations & Gotchas

### Token Usage & Caching

**⚠️ Performance Tip:** Prompt caching provides **10x effective throughput improvement**:

- With 80% cache hit rate: **10M tokens/min** vs 2M uncached
- Only **uncached input tokens** count toward rate limits
- Cached tokens cost **0.1x** of regular input tokens

```typescript
// Structure prompts for caching
const cachedSystemPrompt = `
System instructions (cached, reused across calls)
${largeCodebaseAnalysis}

---
Current query follows:
`;

// Repeated calls reuse cached system prompt
for await (const msg of query({
  prompt: cachedSystemPrompt + userQuery
})) {
  // Process...
}
```

### Rate Limits & Exponential Backoff

```typescript
async function queryWithRetry(prompt: string, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const stream = query({ prompt });
      for await (const msg of stream) {
        yield msg;
      }
      return;
    } catch (error: any) {
      if (error.status === 429) {
        // Exponential backoff: 2^attempt seconds, cap at 30s
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        throw error;  // Don't retry other errors
      }
    }
  }
}
```

### Known Issues & Limitations

| Issue | Impact | Workaround |
|-------|--------|------------|
| **Grep tool 100K limit** | SDK subprocess crash on excessive results | Pre-filter or use more specific patterns |
| **AbortController SIGTERM** | Ungraceful termination on timeout | Implement graceful timeout handling |
| **No `--timeout` option** | Can't set operation timeout via CLI | Use request-level timeouts in code |
| **Serverless timeouts** | Vercel free tier has 60s limit | Use streaming or upgrade tier |
| **settingSources undefined** | No config loaded (unintuitive) | Explicitly set `false` for clarity |

### Error Types & Retry Strategy

```typescript
// Only retry these errors:
const RETRYABLE_ERRORS = [
  408,  // Timeout
  429,  // Rate limit
  500,  // Internal server error
  502,  // Bad gateway
  503,  // Service unavailable
  529   // Overloaded
];

async function shouldRetry(error: any): Promise<boolean> {
  return RETRYABLE_ERRORS.includes(error.status);
}
```

**Don't retry:**
- 400 (Invalid request)
- 401 (Authentication error)
- 403 (Permission denied)
- 404 (Not found)
- 413 (Request too large)

---

## Next.js Integration

### Basic API Route

```typescript
// app/api/claude/route.ts
import { query } from '@anthropic-ai/claude-agent-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { prompt, sessionId } = await req.json();

  let newSessionId = sessionId;
  let response = "";

  for await (const msg of query({
    prompt,
    options: {
      resume: sessionId,
      settingSources: false,  // Critical for serverless!
    }
  })) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      newSessionId = msg.session_id;
    }

    if (msg.type === 'assistant') {
      for (const block of msg.message.content) {
        if (block.type === 'text') {
          response += block.text;
        }
      }
    }
  }

  return NextResponse.json({
    sessionId: newSessionId,
    response
  });
}
```

### Streaming Response with SSE

```typescript
// app/api/claude/stream/route.ts
export async function POST(req: NextRequest) {
  const { prompt, sessionId } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const msg of query({
          prompt,
          options: { resume: sessionId, settingSources: false }
        })) {
          const data = JSON.stringify(msg) + '\n';
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

### Important Considerations

1. **Serverless Timeouts**: Default Next.js API routes timeout after 60s (Vercel free tier). Use streaming for long operations.

2. **Configuration Isolation**: Always set `settingSources: false` in serverless to prevent loading unexpected local config files.

3. **Session Storage**: Store session IDs in:
   - Database for persistent multi-device access
   - Cookies for single-device continuity
   - Redis for high-performance session lookup

4. **Error Boundaries**: Wrap SDK calls in try-catch for production:

```typescript
try {
  for await (const msg of query({...})) {
    // Process
  }
} catch (error: any) {
  if (error.status === 429) {
    return NextResponse.json(
      { error: "Rate limited, try again later" },
      { status: 429 }
    );
  }
  throw error;
}
```

---

## Foundry-Specific Recommendations

### 1. Authentication Strategy

```typescript
// Priority order for API key
export function getAPIKey(): string {
  // 1. Environment variable (highest priority)
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // 2. Credentials file
  const credPath = path.join(os.homedir(), '.foundry/credentials');
  if (fs.existsSync(credPath)) {
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    return creds.apiKey;
  }

  // 3. Interactive prompt on first run
  const apiKey = await promptUser('Enter Anthropic API key:');
  fs.writeFileSync(credPath, JSON.stringify({ apiKey }));
  return apiKey;
}
```

### 2. `ask_user_question` Tool Implementation

```typescript
// Response registry for blocking tool
const questionRegistry = new Map<string, {
  resolve: (value: any) => void;
  timeout: NodeJS.Timeout;
}>();

export const askUserQuestion = tool(
  "ask_user_question",
  "Present question to user and wait for answer",
  {
    question: z.string(),
    questionType: z.enum(["yes_no", "text", "choice"]),
    options: z.array(z.string()).optional(),
    context: z.string().optional()
  },
  async (args, extra) => {
    const sessionId = extra.session_id;

    return new Promise((resolve) => {
      const handler = (response: any) => {
        questionRegistry.delete(sessionId);
        clearTimeout(timeoutHandle);
        resolve({
          content: [{
            type: "text",
            text: JSON.stringify({ answer: response })
          }]
        });
      };

      questionRegistry.set(sessionId, {
        resolve: handler,
        timeout: null as any
      });

      const timeoutHandle = setTimeout(() => {
        questionRegistry.delete(sessionId);
        handler({ timeout: true });
      }, 300000);

      questionRegistry.get(sessionId)!.timeout = timeoutHandle;

      // Emit SSE to browser
      emitSSE(sessionId, {
        type: "question",
        data: {
          question: args.question,
          questionType: args.questionType,
          options: args.options,
          context: args.context
        }
      });
    });
  }
);

// HTTP endpoint
app.post("/api/ai/answer/:sessionId", (req, res) => {
  const handler = questionRegistry.get(req.params.sessionId);
  if (handler) {
    handler.resolve(req.body);
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "Question not found" });
  }
});
```

### 3. Session Storage Schema (SQLite)

```sql
CREATE TABLE ai_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,  -- ~40 char string from SDK
  phase TEXT NOT NULL,  -- 'cpo' | 'clarify' | 'cto'
  created_at INTEGER NOT NULL,
  last_activity INTEGER NOT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_session_id (session_id)
);

CREATE TABLE ai_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' | 'assistant' | 'tool'
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES ai_sessions(session_id)
);
```

### 4. Error Handling Pattern

```typescript
// Structured error responses for UI
interface AIResponse {
  success: boolean;
  sessionId?: string;
  response?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export async function queryAI(
  prompt: string,
  sessionId?: string
): Promise<AIResponse> {
  try {
    let newSessionId = sessionId;
    let response = "";

    for await (const msg of query({
      prompt,
      options: { resume: sessionId, settingSources: false }
    })) {
      if (msg.type === 'system' && msg.subtype === 'init') {
        newSessionId = msg.session_id;
      }
      if (msg.type === 'assistant') {
        response += extractText(msg);
      }
    }

    return {
      success: true,
      sessionId: newSessionId,
      response
    };
  } catch (error: any) {
    const isRetryable = [429, 500, 502, 503].includes(error.status);

    return {
      success: false,
      sessionId,
      error: {
        code: error.status || 'UNKNOWN',
        message: error.message || 'AI request failed',
        retryable: isRetryable
      }
    };
  }
}
```

### 5. Token Management & Context Compaction

```typescript
// Automatic compaction when approaching limits
// No action needed - SDK handles automatically

// Manual compaction before large tasks
async function compactAndQuery(prompt: string, sessionId: string) {
  // First, compact the session
  for await (const msg of query({
    prompt: "/compact",
    options: { resume: sessionId }
  })) {
    // Wait for compaction to complete
  }

  // Then proceed with actual query
  for await (const msg of query({
    prompt,
    options: { resume: sessionId }
  })) {
    // Process...
  }
}
```

---

## Implementation Checklist

### Setup
- [ ] Install: `npm install @anthropic-ai/claude-agent-sdk`
- [ ] Verify Node.js 18+
- [ ] Set `ANTHROPIC_API_KEY` environment variable
- [ ] Create `.env.local` with API key for development

### Core Integration
- [ ] Create API route with `query()` function
- [ ] Implement session management with `resume` parameter
- [ ] Set `settingSources: false` for serverless isolation
- [ ] Add SQLite schema for session storage
- [ ] Create session persistence logic

### Custom Tools
- [ ] Define `ask_user_question` tool with Zod schema
- [ ] Implement Promise registry for blocking tool pattern
- [ ] Create SSE endpoint for real-time question emission
- [ ] Add HTTP endpoint to receive user answers
- [ ] Test timeout handling (default: 5 minutes)

### Error Handling
- [ ] Implement exponential backoff for 429 errors
- [ ] Add structured error responses for UI
- [ ] Handle 4xx/5xx errors appropriately
- [ ] Add request timeout handling
- [ ] Test error recovery and resumption

### Performance
- [ ] Structure prompts for cache reuse
- [ ] Monitor token usage patterns
- [ ] Test with Vercel serverless timeouts
- [ ] Implement streaming for long operations
- [ ] Add progress indicators for user feedback

### Testing
- [ ] Test session creation and resumption
- [ ] Test multi-turn conversations
- [ ] Test tool execution and blocking pattern
- [ ] Test error scenarios and retries
- [ ] Test with different prompt complexities

---

## Key Takeaways

### Non-Obvious Behaviors

1. **`settingSources` undefined = NO config loaded** (not default load)
2. **Environment API key overrides subscription** (causes charges)
3. **Tools return errors as content, not exceptions**
4. **Grep tool crashes on >100K results** (undocumented limit)
5. **Session ID is all you persist** (~40 char string)
6. **Hooks configured in JSON, not code**
7. **No OAuth2 for MCP servers** (use env vars)

### Performance Tips

1. **Cache hits = 10x throughput** (80% hit rate: 10M vs 2M tokens/min)
2. **Only uncached tokens count** toward rate limits
3. **Exponential backoff: 2^n seconds**, capped at 30s
4. **Vercel free tier 60s timeout** may be insufficient
5. **Use streaming** for better UX

### Implementation Patterns

1. **Blocking tool:** Promise registry + SSE + HTTP resolver
2. **Session management:** Store only ID, pass to `resume`
3. **Error handling:** Structured JSON with `success: false`
4. **Multi-turn:** Each request passes session ID
5. **Permissions:** Three layers (allowlist, callback, hooks)

---

## Sources

- [Agent SDK Overview](https://platform.claude.com/docs/en/api/agent-sdk/overview)
- [TypeScript API Reference](https://docs.claude.com/en/api/agent-sdk/typescript)
- [NPM Package](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk)
- [MCP Integration Guide](https://platform.claude.com/docs/en/agent-sdk/mcp)
- [Rate Limits](https://docs.claude.com/en/api/rate-limits)
- [API Errors](https://docs.claude.com/en/api/errors)
- [Building Agents with Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [DataCamp Tutorial](https://www.datacamp.com/tutorial/how-to-use-claude-agent-sdk)
- [GitHub - TypeScript SDK](https://github.com/anthropics/claude-agent-sdk-typescript)
- [GitHub - SDK Demos](https://github.com/anthropics/claude-agent-sdk-demos)
