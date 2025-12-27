/**
 * MCP Server Selector
 *
 * UI for selecting and configuring MCP servers for Agent nodes.
 * Supports both preset servers (Playwright, Figma, etc.) and custom server configurations.
 */

'use client';

import React, { useState } from 'react';
import { PlusIcon, XMarkIcon, ServerIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import {
  McpPresetId,
  MCP_PRESETS,
  type McpServerSelection,
  type McpServerConfig,
  type McpStdioConfig,
  type McpHttpConfig,
  type McpSseConfig,
  type PresetMcpServer,
  type PlaywrightPresetConfig,
  type FigmaPresetConfig,
  type SequentialThinkingPresetConfig,
  type PresetConfig,
} from '@/lib/graph/mcp-presets';
import { Button } from '@/components/shared/button';
import { Modal, ModalBody, ModalFooter } from '@/components/shared/modal';
import {
  ToggleField,
  NumberField,
  TextField,
  KeyValueEditor,
  CollapsibleSection,
  ViewportInput,
} from './config-fields';
import { EnvEditor } from './env-editor';

interface McpServerSelectorProps {
  selected: McpServerSelection[];
  onChange: (servers: McpServerSelection[]) => void;
  accentColor: string;
}

export function McpServerSelector({
  selected,
  onChange,
  accentColor,
}: McpServerSelectorProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleAddPreset = (presetId: McpPresetId) => {
    const newServer: McpServerSelection = {
      type: 'preset',
      presetId,
    };
    onChange([...selected, newServer]);
  };

  const handleRemove = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
    onChange(selected.filter((_, i) => i !== index));
  };

  const handleAddCustom = (server: McpServerSelection) => {
    onChange([...selected, server]);
    setShowCustomModal(false);
  };

  const handleConfigChange = (index: number, config: PresetConfig) => {
    const updated = [...selected];
    const server = updated[index];

    if (server && server.type === 'preset') {
      updated[index] = {
        ...server,
        presetConfig: config,
      };
      onChange(updated);
    }
  };

  const selectedPresetIds = selected
    .filter((s): s is PresetMcpServer => s.type === 'preset')
    .map((s) => s.presetId);

  return (
    <div className="space-y-3">
      {/* Preset Grid */}
      <div className="grid grid-cols-3 gap-2">
        {Object.values(MCP_PRESETS).map((preset) => {
          const isSelected = selectedPresetIds.includes(preset.id);
          return (
            <button
              key={preset.id}
              onClick={() => !isSelected && handleAddPreset(preset.id)}
              disabled={isSelected}
              className={`
                p-2 rounded-lg border text-left transition-all duration-150
                ${isSelected
                  ? 'border-border-subtle bg-bg-tertiary opacity-50 cursor-not-allowed'
                  : 'border-border-subtle hover:border-border-default bg-bg-primary cursor-pointer'
                }
              `}
              title={preset.description}
            >
              <div className="text-lg mb-1">{preset.icon}</div>
              <div className="text-xs font-medium text-text-primary truncate">
                {preset.name}
              </div>
              <div className="text-[10px] text-text-muted truncate">
                {preset.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Add Custom Button */}
      <button
        onClick={() => setShowCustomModal(true)}
        className="w-full py-2 px-3 rounded-lg border border-dashed border-border-default hover:border-border-hover text-xs font-medium text-text-secondary hover:text-text-primary flex items-center justify-center gap-2 transition-colors"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        <span>Add Custom Server</span>
      </button>

      {/* Selected Servers List */}
      {selected.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Active Servers ({selected.length})
          </div>
          {selected.map((server, index) => (
            <McpServerCard
              key={index}
              server={server}
              accentColor={accentColor}
              isExpanded={expandedIndex === index}
              onToggleExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
              onRemove={() => handleRemove(index)}
              onConfigChange={(config) => handleConfigChange(index, config)}
            />
          ))}
        </div>
      )}

      {/* Custom Server Modal */}
      <CustomServerModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onAdd={handleAddCustom}
      />
    </div>
  );
}

// ============================================================================
// Server Card Component
// ============================================================================

interface McpServerCardProps {
  server: McpServerSelection;
  accentColor: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onConfigChange: (config: PresetConfig) => void;
}

function McpServerCard({
  server,
  accentColor,
  isExpanded,
  onToggleExpand,
  onRemove,
  onConfigChange,
}: McpServerCardProps) {
  const preset = server.type === 'preset' ? MCP_PRESETS[server.presetId] : null;
  const serverName = preset ? preset.name : (server.type === 'custom' ? server.name : '');
  const description = preset ? preset.description : 'Custom server';
  const icon = preset ? preset.icon : <ServerIcon className="w-4 h-4" style={{ color: accentColor }} />;
  const isPreset = server.type === 'preset';

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-primary overflow-hidden">
      {/* Card Header */}
      <div className="flex items-start gap-2 p-2 group hover:bg-bg-secondary/50 transition-colors">
        <div
          className="w-8 h-8 rounded flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${accentColor}15` }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-text-primary truncate">
            {serverName}
          </div>
          <div className="text-[10px] text-text-muted truncate">
            {description}
          </div>
        </div>

        {/* Expand button (only for presets) */}
        {isPreset && (
          <button
            onClick={onToggleExpand}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-all"
            title={isExpanded ? 'Collapse config' : 'Configure'}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-3.5 h-3.5" />
            ) : (
              <ChevronRightIcon className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center hover:bg-accent-error/10 text-text-muted hover:text-accent-error transition-all"
          title="Remove server"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline Configuration Panel */}
      {isExpanded && isPreset && (
        <div className="border-t border-border-subtle bg-bg-secondary/30">
          <PresetConfigPanel
            server={server}
            accentColor={accentColor}
            onConfigChange={onConfigChange}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Preset Configuration Panel Router
// ============================================================================

interface PresetConfigPanelProps {
  server: PresetMcpServer;
  accentColor: string;
  onConfigChange: (config: PresetConfig) => void;
}

function PresetConfigPanel({ server, accentColor, onConfigChange }: PresetConfigPanelProps) {
  switch (server.presetId) {
    case McpPresetId.Playwright:
      return (
        <PlaywrightConfigPanel
          config={(server.presetConfig as PlaywrightPresetConfig) ?? {}}
          accentColor={accentColor}
          onChange={onConfigChange}
        />
      );
    case McpPresetId.Figma:
      return (
        <FigmaConfigPanel
          config={(server.presetConfig as FigmaPresetConfig) ?? {}}
          accentColor={accentColor}
          onChange={onConfigChange}
        />
      );
    case McpPresetId.SequentialThinking:
      return (
        <SequentialThinkingConfigPanel
          config={(server.presetConfig as SequentialThinkingPresetConfig) ?? {}}
          accentColor={accentColor}
          onChange={onConfigChange}
        />
      );
    default:
      return null;
  }
}

// ============================================================================
// Playwright Configuration Panel
// ============================================================================

interface PlaywrightConfigPanelProps {
  config: PlaywrightPresetConfig;
  accentColor: string;
  onChange: (config: PlaywrightPresetConfig) => void;
}

function PlaywrightConfigPanel({ config, accentColor, onChange }: PlaywrightConfigPanelProps) {
  const buildConfig = (
    headless?: boolean,
    viewportWidth?: number,
    viewportHeight?: number,
    timeout?: number,
    env?: Record<string, string>
  ): PlaywrightPresetConfig => {
    const newConfig: PlaywrightPresetConfig = {};
    if (headless !== undefined) newConfig.headless = headless;
    if (viewportWidth !== undefined) newConfig.viewportWidth = viewportWidth;
    if (viewportHeight !== undefined) newConfig.viewportHeight = viewportHeight;
    if (timeout !== undefined) newConfig.timeout = timeout;
    if (env && Object.keys(env).length > 0) newConfig.env = env;
    return newConfig;
  };

  return (
    <div className="p-3 space-y-3">
      <ToggleField
        label="Headless Mode"
        description="Run browser without visible window"
        value={config.headless !== false}
        onChange={(v) => onChange(buildConfig(v, config.viewportWidth, config.viewportHeight, config.timeout, config.env))}
        accentColor={accentColor}
      />

      <ViewportInput
        label="Viewport Size"
        width={config.viewportWidth}
        height={config.viewportHeight}
        onChange={(w, h) => onChange(buildConfig(config.headless, w, h, config.timeout, config.env))}
        accentColor={accentColor}
      />

      <NumberField
        label="Navigation Timeout"
        description="Max time to wait for page navigation"
        value={config.timeout}
        onChange={(v) => onChange(buildConfig(config.headless, config.viewportWidth, config.viewportHeight, v, config.env))}
        placeholder="30000"
        min={1000}
        max={300000}
        suffix="ms"
        accentColor={accentColor}
      />

      <CollapsibleSection title="Advanced">
        <EnvEditor
          mode="local"
          title="Environment Variables"
          value={config.env ?? {}}
          onChange={(v) => {
            const env = Object.keys(v).length > 0 ? v : undefined;
            onChange(buildConfig(config.headless, config.viewportWidth, config.viewportHeight, config.timeout, env));
          }}
          accentColor={accentColor}
        />
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// Figma Configuration Panel
// ============================================================================

interface FigmaConfigPanelProps {
  config: FigmaPresetConfig;
  accentColor: string;
  onChange: (config: FigmaPresetConfig) => void;
}

function FigmaConfigPanel({ config, accentColor, onChange }: FigmaConfigPanelProps) {
  const buildConfig = (
    apiToken?: string,
    headers?: Record<string, string>
  ): FigmaPresetConfig => {
    const newConfig: FigmaPresetConfig = {};
    if (apiToken) newConfig.apiToken = apiToken;
    if (headers && Object.keys(headers).length > 0) newConfig.headers = headers;
    return newConfig;
  };

  return (
    <div className="p-3 space-y-3">
      <TextField
        label="API Token"
        description="Personal access token from Figma settings"
        value={config.apiToken ?? ''}
        onChange={(v) => onChange(buildConfig(v || undefined, config.headers))}
        placeholder="figd_..."
        type="password"
        mono
        accentColor={accentColor}
      />

      <CollapsibleSection title="Advanced">
        <KeyValueEditor
          label="Custom Headers"
          description="Additional HTTP headers for requests"
          value={config.headers ?? {}}
          onChange={(v) => {
            const headers = Object.keys(v).length > 0 ? v : undefined;
            onChange(buildConfig(config.apiToken, headers));
          }}
          keyPlaceholder="Header"
          valuePlaceholder="value"
          accentColor={accentColor}
        />
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// Sequential Thinking Configuration Panel
// ============================================================================

interface SequentialThinkingConfigPanelProps {
  config: SequentialThinkingPresetConfig;
  accentColor: string;
  onChange: (config: SequentialThinkingPresetConfig) => void;
}

function SequentialThinkingConfigPanel({ config, accentColor, onChange }: SequentialThinkingConfigPanelProps) {
  const buildConfig = (env?: Record<string, string>): SequentialThinkingPresetConfig => {
    const newConfig: SequentialThinkingPresetConfig = {};
    if (env && Object.keys(env).length > 0) newConfig.env = env;
    return newConfig;
  };

  return (
    <div className="p-3 space-y-3">
      <EnvEditor
        mode="local"
        title="Environment Variables"
        value={config.env ?? {}}
        onChange={(v) => {
          const env = Object.keys(v).length > 0 ? v : undefined;
          onChange(buildConfig(env));
        }}
        accentColor={accentColor}
      />
    </div>
  );
}

// ============================================================================
// Custom Server Modal
// ============================================================================

interface CustomServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (server: McpServerSelection) => void;
}

function CustomServerModal({ isOpen, onClose, onAdd }: CustomServerModalProps) {
  const [serverType, setServerType] = useState<'stdio' | 'http' | 'sse'>('stdio');
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;

    let config: McpServerConfig;

    if (serverType === 'stdio') {
      config = {
        command: command.trim(),
        ...(args.trim() && { args: args.trim().split(/\s+/) }),
      } as McpStdioConfig;
    } else if (serverType === 'http') {
      config = {
        type: 'http',
        url: url.trim(),
      } as McpHttpConfig;
    } else {
      config = {
        type: 'sse',
        url: url.trim(),
      } as McpSseConfig;
    }

    const server: McpServerSelection = {
      type: 'custom',
      name: name.trim(),
      config,
    };

    onAdd(server);

    // Reset form
    setName('');
    setCommand('');
    setArgs('');
    setUrl('');
    setServerType('stdio');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Custom MCP Server" size="md">
      <ModalBody>
        <div className="space-y-4">
          {/* Server Name */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Server Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Server"
              className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors"
            />
          </div>

          {/* Server Type */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Connection Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['stdio', 'http', 'sse'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setServerType(type)}
                  className={`
                    py-2 px-3 rounded-lg border text-xs font-medium transition-all
                    ${serverType === type
                      ? 'border-border-hover bg-bg-tertiary text-text-primary'
                      : 'border-border-subtle bg-bg-primary text-text-secondary hover:border-border-default'
                    }
                  `}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* stdio Configuration */}
          {serverType === 'stdio' && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Command
                </label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="npx"
                  className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-lg font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Arguments (space-separated)
                </label>
                <input
                  type="text"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="@my-package/mcp-server"
                  className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-lg font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors"
                />
              </div>
            </>
          )}

          {/* HTTP/SSE Configuration */}
          {(serverType === 'http' || serverType === 'sse') && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Server URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/mcp"
                className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-lg font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors"
              />
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleAdd}
          disabled={!name.trim() || (serverType === 'stdio' ? !command.trim() : !url.trim())}
        >
          Add Server
        </Button>
      </ModalFooter>
    </Modal>
  );
}
