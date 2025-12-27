/**
 * MCP Server Presets Registry
 *
 * Defines preset MCP server configurations for common integrations.
 */

export enum McpPresetId {
  Playwright = 'playwright',
  Figma = 'figma',
  SequentialThinking = 'sequential-thinking',
}

export type McpServerConfig = McpStdioConfig | McpHttpConfig | McpSseConfig;

export interface McpStdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpHttpConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

export interface McpSseConfig {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}

export interface McpPresetDefinition {
  id: McpPresetId;
  name: string;
  description: string;
  icon: string;
  config: McpServerConfig;
}

export const MCP_PRESETS: Record<McpPresetId, McpPresetDefinition> = {
  [McpPresetId.Playwright]: {
    id: McpPresetId.Playwright,
    name: 'Playwright',
    description: 'Browser automation',
    icon: '🎭',
    config: { command: 'npx', args: ['@playwright/mcp@latest', '--headless'] },
  },
  [McpPresetId.Figma]: {
    id: McpPresetId.Figma,
    name: 'Figma',
    description: 'Design integration',
    icon: '🎨',
    config: { type: 'http', url: 'https://mcp.figma.com/mcp' },
  },
  [McpPresetId.SequentialThinking]: {
    id: McpPresetId.SequentialThinking,
    name: 'Sequential Thinking',
    description: 'Reasoning',
    icon: '🧠',
    config: { command: 'npx', args: ['@anthropic-ai/mcp-server-sequential-thinking'] },
  },
};

export function getMcpPreset(id: McpPresetId): McpPresetDefinition | undefined {
  return MCP_PRESETS[id];
}

export function resolvePresetConfig(
  presetId: McpPresetId,
  envOverrides?: Record<string, string>
): McpServerConfig {
  const preset = MCP_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown MCP preset: ${presetId}`);
  }

  const config = { ...preset.config };

  // Only stdio configs support env overrides (they lack a 'type' field)
  if (envOverrides && !('type' in config)) {
    const stdioConfig = config as McpStdioConfig;
    stdioConfig.env = { ...stdioConfig.env, ...envOverrides };
  }

  return config;
}

export type McpServerSelection = PresetMcpServer | CustomMcpServer;

export interface PresetMcpServer {
  type: 'preset';
  presetId: McpPresetId;
  env?: Record<string, string>;
}

export interface CustomMcpServer {
  type: 'custom';
  name: string;
  config: McpServerConfig;
}
