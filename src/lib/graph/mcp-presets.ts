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

/**
 * Resolves a preset configuration with user overrides merged in.
 *
 * @param selection - The preset server selection with optional presetConfig
 * @returns The fully resolved MCP server config ready for SDK consumption
 */
export function resolvePresetConfig(selection: PresetMcpServer): McpServerConfig {
  const preset = MCP_PRESETS[selection.presetId];
  if (!preset) {
    throw new Error(`Unknown MCP preset: ${selection.presetId}`);
  }

  const baseConfig = { ...preset.config };

  // Handle Playwright preset
  if (selection.presetId === McpPresetId.Playwright) {
    return resolvePlaywrightConfig(
      baseConfig as McpStdioConfig,
      selection.presetConfig as PlaywrightPresetConfig | undefined,
      selection.env
    );
  }

  // Handle Figma preset
  if (selection.presetId === McpPresetId.Figma) {
    return resolveFigmaConfig(
      baseConfig as McpHttpConfig,
      selection.presetConfig as FigmaPresetConfig | undefined
    );
  }

  // Handle Sequential Thinking preset
  if (selection.presetId === McpPresetId.SequentialThinking) {
    return resolveSequentialThinkingConfig(
      baseConfig as McpStdioConfig,
      selection.presetConfig as SequentialThinkingPresetConfig | undefined,
      selection.env
    );
  }

  // Fallback: apply legacy env overrides for unknown presets
  if (selection.env && !('type' in baseConfig)) {
    const stdioConfig = baseConfig as McpStdioConfig;
    stdioConfig.env = { ...stdioConfig.env, ...selection.env };
  }

  return baseConfig;
}

/**
 * Resolves Playwright preset configuration
 */
function resolvePlaywrightConfig(
  base: McpStdioConfig,
  config?: PlaywrightPresetConfig,
  legacyEnv?: Record<string, string>
): McpStdioConfig {
  const args = ['@playwright/mcp@latest'];

  // Apply headless mode (default: true)
  if (config?.headless !== false) {
    args.push('--headless');
  }

  // Apply viewport if specified
  if (config?.viewportWidth && config?.viewportHeight) {
    args.push('--viewport-size', `${config.viewportWidth}x${config.viewportHeight}`);
  }

  // Apply timeout if specified
  if (config?.timeout) {
    args.push('--timeout', config.timeout.toString());
  }

  // Merge environment variables (presetConfig.env takes precedence over legacy env)
  const env = { ...legacyEnv, ...config?.env };

  return {
    command: base.command,
    args,
    ...(Object.keys(env).length > 0 && { env }),
  };
}

/**
 * Resolves Figma preset configuration
 */
function resolveFigmaConfig(
  base: McpHttpConfig,
  config?: FigmaPresetConfig
): McpHttpConfig {
  const headers: Record<string, string> = {};

  // Add authorization header if API token is provided
  if (config?.apiToken) {
    headers['Authorization'] = `Bearer ${config.apiToken}`;
  }

  // Merge custom headers
  if (config?.headers) {
    Object.assign(headers, config.headers);
  }

  return {
    type: 'http',
    url: base.url,
    ...(Object.keys(headers).length > 0 && { headers }),
  };
}

/**
 * Resolves Sequential Thinking preset configuration
 */
function resolveSequentialThinkingConfig(
  base: McpStdioConfig,
  config?: SequentialThinkingPresetConfig,
  legacyEnv?: Record<string, string>
): McpStdioConfig {
  // Merge environment variables
  const env = { ...legacyEnv, ...config?.env };

  return {
    command: base.command,
    ...(base.args && { args: base.args }),
    ...(Object.keys(env).length > 0 && { env }),
  };
}

export type McpServerSelection = PresetMcpServer | CustomMcpServer;

// ============================================================================
// Preset-Specific Configuration Types
// ============================================================================

/**
 * Playwright MCP server configuration options
 */
export interface PlaywrightPresetConfig {
  /** Run browser in headless mode (default: true) */
  headless?: boolean;
  /** Viewport width in pixels (default: 1280) */
  viewportWidth?: number;
  /** Viewport height in pixels (default: 720) */
  viewportHeight?: number;
  /** Navigation timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Additional environment variables */
  env?: Record<string, string>;
}

/**
 * Figma MCP server configuration options
 */
export interface FigmaPresetConfig {
  /** Figma personal access token for authentication */
  apiToken?: string;
  /** Custom HTTP headers */
  headers?: Record<string, string>;
}

/**
 * Sequential Thinking MCP server configuration options
 */
export interface SequentialThinkingPresetConfig {
  /** Additional environment variables */
  env?: Record<string, string>;
}

/** Union of all preset-specific configurations */
export type PresetConfig =
  | PlaywrightPresetConfig
  | FigmaPresetConfig
  | SequentialThinkingPresetConfig;

// ============================================================================
// MCP Server Selection Types
// ============================================================================

export interface PresetMcpServer {
  type: 'preset';
  presetId: McpPresetId;
  /** @deprecated Use presetConfig.env instead */
  env?: Record<string, string>;
  /** Preset-specific configuration */
  presetConfig?: PresetConfig;
}

export interface CustomMcpServer {
  type: 'custom';
  name: string;
  config: McpServerConfig;
}
