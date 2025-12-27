/**
 * Foundry Workflow Executor
 *
 * Runs inside the container to execute workflows.
 * Communicates progress back to Foundry via webhooks.
 */

import { readFileSync } from 'fs';
import { query, type Options } from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// Agent Model Mapping
// ============================================================================

const AGENT_MODEL_MAP: Record<string, string> = {
  haiku: 'claude-haiku-4-20250514',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514',
};

// ============================================================================
// Types
// ============================================================================

interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  initialContext: Record<string, unknown>;
}

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string;
    config: Record<string, unknown>;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

// ============================================================================
// Environment
// ============================================================================

const FOUNDRY_API_URL = process.env.FOUNDRY_API_URL!;
const FOUNDRY_EXECUTION_ID = process.env.FOUNDRY_EXECUTION_ID!;
const FOUNDRY_API_TOKEN = process.env.FOUNDRY_API_TOKEN!;

// ============================================================================
// Webhook Helpers
// ============================================================================

async function postWebhook(
  endpoint: string,
  body: Record<string, unknown>
): Promise<void> {
  try {
    const response = await fetch(
      `${FOUNDRY_API_URL}/api/webhooks/execution/${FOUNDRY_EXECUTION_ID}/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FOUNDRY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      console.error(`[webhook:${endpoint}] Failed: ${response.status}`);
    }
  } catch (error) {
    console.error(`[webhook:${endpoint}] Error:`, error);
  }
}

async function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  nodeId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  console.log(`[${level}] ${message}`);

  await postWebhook('log', {
    level,
    message,
    ...(nodeId && { nodeId }),
    ...(metadata && { metadata }),
  });
}

async function nodeStarted(nodeId: string): Promise<void> {
  await postWebhook('node-started', { nodeId });
}

async function nodeCompleted(
  nodeId: string,
  output?: Record<string, unknown>
): Promise<void> {
  await postWebhook('node-completed', {
    nodeId,
    ...(output && { output }),
  });
}

async function workflowCompleted(
  finalContext: Record<string, unknown>
): Promise<void> {
  await postWebhook('completed', { context: finalContext });
}

async function workflowFailed(
  error: string,
  nodeId?: string
): Promise<void> {
  await postWebhook('failed', {
    error,
    ...(nodeId && { nodeId }),
  });
}

// ============================================================================
// Node Executors
// ============================================================================

type NodeExecutor = (
  node: WorkflowNode,
  context: Record<string, unknown>
) => Promise<Record<string, unknown>>;

const nodeExecutors: Record<string, NodeExecutor> = {
  command: async (node, _context) => {
    const config = node.data.config as {
      command: string;
      cwd?: string;
      env?: Record<string, string>;
      timeout?: number;
    };

    await log('info', `Executing command: ${config.command}`, node.id);

    const proc = Bun.spawn(['sh', '-c', config.command], {
      cwd: config.cwd ?? process.cwd(),
      env: { ...process.env, ...config.env },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`Command failed with exit code ${exitCode}: ${stderr}`);
    }

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
    };
  },

  eval: async (node, ctx) => {
    const config = node.data.config as { code: string };

    await log('info', 'Executing eval node', node.id);

    // Create a function from the code string
    const fn = new Function('context', `
      const state = { context };
      ${config.code}
    `);

    const result = fn(ctx);
    return typeof result === 'object' && result !== null ? result : { result };
  },

  http: async (node, _context) => {
    const config = node.data.config as {
      url: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    };

    await log('info', `Making HTTP ${config.method} request to ${config.url}`, node.id);

    const response = await fetch(config.url, {
      method: config.method,
      ...(config.headers && { headers: config.headers }),
      ...(config.body && { body: config.body }),
    });

    const contentType = response.headers.get('content-type') ?? '';
    let data: unknown;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      data,
    };
  },

  // LLM and Agent nodes require the Anthropic API
  llm: async (node, context) => {
    const config = node.data.config as {
      prompt: string;
      model?: string;
      systemPrompt?: string;
    };

    await log('info', 'Executing LLM node', node.id);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for LLM nodes');
    }

    // Interpolate variables in prompt
    let prompt = config.prompt;
    for (const [key, value] of Object.entries(context)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model ?? 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: config.systemPrompt ?? 'You are a helpful assistant.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${error}`);
    }

    const result = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const textContent = result.content.find(c => c.type === 'text');
    return {
      response: textContent?.text ?? '',
    };
  },

  // Agent node - uses Claude Agent SDK with tools
  agent: async (node, context) => {
    const config = node.data.config as {
      prompt: string;
      model?: string;
      maxTurns?: number;
      capabilities?: string[];
    };

    await log('info', 'Executing agent node', node.id);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for agent nodes');
    }

    // Interpolate variables in prompt
    let prompt = config.prompt;
    for (const [key, value] of Object.entries(context)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }

    // Map model name to full model ID
    const modelKey = config.model ?? 'sonnet';
    const model = AGENT_MODEL_MAP[modelKey] ?? AGENT_MODEL_MAP.sonnet;

    // Configure SDK options
    const sdkOptions: Options = {
      maxTurns: config.maxTurns ?? 10,
      systemPrompt: prompt,
      allowedTools: config.capabilities ?? [],
    };

    // Only set model if we have one
    if (model) {
      sdkOptions.model = model;
    }

    // Log MCP warning if configured
    if ((node.data.config as { mcpServers?: unknown[] }).mcpServers?.length) {
      await log('warn', 'MCP servers not supported in container execution (v2 feature)', node.id);
    }

    try {
      // SDK returns an async iterator, collect results
      const queryResult = query({
        prompt,
        options: sdkOptions,
      });

      const toolsUsed: string[] = [];
      let response = '';

      for await (const message of queryResult) {
        if (message.type === 'result') {
          response = (message as { result?: string }).result ?? '';
        }
        if (message.type === 'tool_progress') {
          const name = (message as { tool?: string }).tool;
          if (name && !toolsUsed.includes(name)) {
            toolsUsed.push(name);
          }
        }
      }

      return {
        response,
        toolsUsed,
      };
    } catch (error) {
      throw new Error(`Agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Slash command - Claude Code operations
  'slash-command': async (node, context) => {
    const config = node.data.config as {
      command: string;
      args?: string;
      model?: string;
    };

    await log('info', `Executing slash command: /${config.command}`, node.id);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for slash command nodes');
    }

    // Interpolate variables in args
    let args = config.args ?? '';
    for (const [key, value] of Object.entries(context)) {
      args = args.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }

    const fullCommand = `/${config.command} ${args}`.trim();

    // Map model name to full model ID
    const modelKey = config.model ?? 'sonnet';
    const model = AGENT_MODEL_MAP[modelKey] ?? AGENT_MODEL_MAP.sonnet;

    const sdkOptions: Options = {
      maxTurns: 30, // Slash commands may need more turns
    };

    if (model) {
      sdkOptions.model = model;
    }

    try {
      const queryResult = query({
        prompt: fullCommand,
        options: sdkOptions,
      });

      let response = '';
      for await (const message of queryResult) {
        if (message.type === 'result') {
          response = (message as { result?: string }).result ?? '';
        }
      }

      return {
        response,
        command: config.command,
        args: args,
      };
    } catch (error) {
      throw new Error(`Slash command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Dynamic agent - runtime AI configuration (raw API, no tools)
  'dynamic-agent': async (node, ctx) => {
    const config = node.data.config as {
      modelExpression?: string;
      promptExpression?: string;
      systemPromptExpression?: string;
    };

    await log('info', 'Executing dynamic agent node', node.id);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for dynamic agent nodes');
    }

    // Evaluate expressions to get runtime values
    const evalExpression = (expr: string | undefined, fallback: string): string => {
      if (!expr) return fallback;
      try {
        const fn = new Function('context', `return ${expr}`);
        const result = fn(ctx);
        return String(result);
      } catch {
        return fallback;
      }
    };

    const modelKey = evalExpression(config.modelExpression, 'sonnet');
    const model = AGENT_MODEL_MAP[modelKey] ?? AGENT_MODEL_MAP.sonnet;
    const prompt = evalExpression(config.promptExpression, '');
    const systemPrompt = evalExpression(config.systemPromptExpression, 'You are a helpful assistant.');

    if (!prompt) {
      throw new Error('Dynamic agent requires a prompt expression that evaluates to a non-empty string');
    }

    // Direct API call (no tools)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Dynamic agent API error: ${error}`);
    }

    const result = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const textContent = result.content.find(c => c.type === 'text');
    return {
      response: textContent?.text ?? '',
      model,
      prompt,
    };
  },

  // Git checkout - clone a GitHub repository
  'git-checkout': async (node, context) => {
    const config = node.data.config as {
      useIssueContext?: boolean;
      owner?: string;
      repo?: string;
      ref?: string;
      depth?: number;
      skipIfExists?: boolean;
    };

    await log('info', 'Executing git checkout node', node.id);

    // Resolve owner/repo from context or config
    let owner: string | undefined;
    let repo: string | undefined;

    if (config.useIssueContext !== false) {
      // Try to get from issue context (injected by Foundry)
      const issueInfo = context.issueInfo as { owner?: string; repo?: string } | undefined;
      owner = issueInfo?.owner;
      repo = issueInfo?.repo;
    }

    // Config overrides take precedence
    if (config.owner) owner = config.owner;
    if (config.repo) repo = config.repo;

    if (!owner || !repo) {
      throw new Error(
        'Git checkout requires owner and repo. Enable useIssueContext with automation trigger, or set owner/repo in config.'
      );
    }

    const ref = config.ref ?? 'main';
    const depth = config.depth ?? 1;
    const skipIfExists = config.skipIfExists ?? true;

    // Get GitHub token from environment (injected by Foundry from project credentials)
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN is required for git checkout. Configure GitHub credentials in the project settings.');
    }

    // Target directory
    const workDir = `/workspace/${owner}-${repo}`;

    await log('info', `Cloning ${owner}/${repo}@${ref} to ${workDir}`, node.id);

    // Check if directory exists
    const existsProc = Bun.spawn(['test', '-d', workDir], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const dirExists = (await existsProc.exited) === 0;

    if (dirExists && skipIfExists) {
      await log('info', `Directory ${workDir} already exists, skipping clone`, node.id);

      // Get current SHA
      const shaProc = Bun.spawn(['git', 'rev-parse', 'HEAD'], {
        cwd: workDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const sha = (await new Response(shaProc.stdout).text()).trim();

      return {
        workDir,
        owner,
        repo,
        ref,
        sha,
        skipped: true,
      };
    }

    // Create parent directory if needed
    const mkdirProc = Bun.spawn(['mkdir', '-p', '/workspace'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await mkdirProc.exited;

    // Clone the repository
    const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
    const cloneArgs = ['git', 'clone', '--depth', String(depth), '--branch', ref, cloneUrl, workDir];

    const cloneProc = Bun.spawn(cloneArgs, {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0', // Disable interactive prompts
      },
    });

    const cloneStderr = await new Response(cloneProc.stderr).text();
    const cloneExitCode = await cloneProc.exited;

    if (cloneExitCode !== 0) {
      // Sanitize error message to not leak token
      const sanitizedError = cloneStderr.replace(token, '***');
      throw new Error(`Git clone failed: ${sanitizedError}`);
    }

    // Get the SHA of HEAD
    const shaProc = Bun.spawn(['git', 'rev-parse', 'HEAD'], {
      cwd: workDir,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const sha = (await new Response(shaProc.stdout).text()).trim();

    await log('info', `Cloned ${owner}/${repo}@${ref} (${sha.substring(0, 7)})`, node.id);

    return {
      workDir,
      owner,
      repo,
      ref,
      sha,
      skipped: false,
    };
  },
};

// ============================================================================
// Workflow Engine
// ============================================================================

function buildTransitionMap(
  _nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Map<string, string> {
  const map = new Map<string, string>();

  for (const edge of edges) {
    // Simple edge: source -> target
    // For conditional edges, we'd need more complex logic
    map.set(edge.source, edge.target);
  }

  return map;
}

async function executeWorkflow(workflow: WorkflowDefinition): Promise<void> {
  const { nodes, edges, initialContext } = workflow;

  if (nodes.length === 0) {
    throw new Error('Workflow has no nodes');
  }

  // Build transition map
  const transitions = buildTransitionMap(nodes, edges);

  // Create node lookup
  const nodeMap = new Map<string, WorkflowNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Start with first node
  let currentNodeId: string | undefined = nodes[0]?.id;
  let context: Record<string, unknown> = { ...initialContext };

  await log('info', `Starting workflow: ${workflow.name}`);

  while (currentNodeId) {
    const node = nodeMap.get(currentNodeId);
    if (!node) {
      throw new Error(`Node not found: ${currentNodeId}`);
    }

    await nodeStarted(currentNodeId);
    await log('info', `Executing node: ${node.data.label}`, currentNodeId);

    try {
      // Get executor for this node type
      const executor = nodeExecutors[node.data.nodeType];

      if (!executor) {
        await log('warn', `No executor for node type: ${node.data.nodeType}`, currentNodeId);
        // Skip unsupported nodes
      } else {
        // Execute the node
        const output = await executor(node, context);

        // Merge output into context
        context = { ...context, ...output };
      }

      await nodeCompleted(currentNodeId, context);
      await log('info', `Node completed: ${node.data.label}`, currentNodeId);

      // Get next node
      currentNodeId = transitions.get(currentNodeId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await log('error', `Node failed: ${errorMessage}`, currentNodeId);
      await workflowFailed(errorMessage, currentNodeId);
      throw error;
    }
  }

  await log('info', 'Workflow completed successfully');
  await workflowCompleted(context);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    // Load workflow definition
    const workflowJson = readFileSync('/tmp/workflow/workflow.json', 'utf-8');
    const workflow = JSON.parse(workflowJson) as WorkflowDefinition;

    console.log(`[execute] Loaded workflow: ${workflow.name}`);
    console.log(`[execute] Nodes: ${workflow.nodes.length}, Edges: ${workflow.edges.length}`);

    // Execute the workflow
    await executeWorkflow(workflow);

    console.log('[execute] Workflow execution completed');
    process.exit(0);

  } catch (error) {
    console.error('[execute] Fatal error:', error);

    // Try to notify Foundry of the failure
    try {
      await workflowFailed(
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch {
      console.error('[execute] Failed to notify Foundry of error');
    }

    process.exit(1);
  }
}

main();
