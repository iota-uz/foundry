/**
 * Node Configuration Panel
 *
 * A refined, industrial-aesthetic configuration panel for workflow nodes.
 * Features:
 * - Node-type-specific accent colors
 * - Custom input components with focus animations
 * - Terminal-style command inputs
 * - Code editor feel for eval nodes
 * - Modern toggle switches
 * - Tool capability grid with chips
 * - Slider + input hybrid for ranges
 * - Collapsible advanced sections
 */

'use client';

import React, { useState, useRef } from 'react';
import {
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  SparklesIcon,
  CpuChipIcon,
  BoltIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useWorkflowBuilderStore, useSelectedNode } from '@/store';
import { NodeType, AgentModel, StdlibTool, LLM_MODELS, LLMProvider, getModelMetadata } from '@/lib/graph/enums';
import type { LLMModelId } from '@/lib/graph/enums';
import { getNodeColor } from '@/lib/design-system';
import type { NodeConfig } from '@/store/workflow-builder.store';
import { Modal, ModalBody, ModalFooter } from '@/components/shared/modal';
import { Button } from '@/components/shared/button';
import { McpServerSelector } from './mcp-server-selector';
import { ToggleSwitch } from './config-fields';

// ============================================================================
// Main Component
// ============================================================================

export function NodeConfigPanel() {
  const selectedNode = useSelectedNode();
  const { updateNode, updateNodeConfig, deleteNode } =
    useWorkflowBuilderStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center opacity-60">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-border-subtle flex items-center justify-center mx-auto mb-4">
            <CpuChipIcon className="w-6 h-6 text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-tertiary mb-1">
            No node selected
          </p>
          <p className="text-xs text-text-muted">
            Click a node to configure
          </p>
        </div>
      </div>
    );
  }

  const { data } = selectedNode;
  const nodeColor = getNodeColor(data.nodeType);
  const IconComponent = nodeColor.icon;

  const handleDelete = () => {
    deleteNode(selectedNode.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="h-full flex flex-col bg-bg-secondary">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Node Identity Section */}
        <div className="p-4 border-b border-border-subtle">
          <div className="flex items-center gap-3 mb-4">
            {/* Node icon with glow */}
            <div
              className="relative w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${nodeColor.hex}15, ${nodeColor.hex}05)`,
                boxShadow: `0 0 20px ${nodeColor.hex}10`,
              }}
            >
              <div
                className="absolute inset-0 rounded-lg border opacity-50"
                style={{ borderColor: nodeColor.hex }}
              />
              <IconComponent
                className="w-5 h-5"
                style={{ color: nodeColor.hex }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
                style={{ color: nodeColor.hex }}
              >
                {nodeColor.label}
              </div>
              <input
                type="text"
                value={data.label}
                onChange={(e) =>
                  updateNode(selectedNode.id, { label: e.target.value })
                }
                className="w-full bg-transparent text-sm font-medium text-text-primary border-none outline-none placeholder:text-text-muted"
                placeholder="Node name"
              />
            </div>
          </div>
        </div>

        {/* Type-specific config */}
        <ConfigForm
          nodeType={data.nodeType}
          config={data.config}
          nodeColor={nodeColor.hex}
          onChange={(config) => updateNodeConfig(selectedNode.id, config)}
        />

        {/* Danger Zone */}
        <div className="p-4 mt-auto">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium text-text-muted hover:text-accent-error border border-transparent hover:border-accent-error/20 hover:bg-accent-error/5 transition-all duration-150"
          >
            Delete this node
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Node"
        size="sm"
      >
        <ModalBody>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-error/10 flex items-center justify-center flex-shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-accent-error" />
            </div>
            <div>
              <p className="text-sm text-text-primary mb-1">
                Delete <span className="font-semibold">{data.label}</span>?
              </p>
              <p className="text-xs text-text-tertiary">
                All connections will be removed. This cannot be undone.
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

// ============================================================================
// Config Form Router
// ============================================================================

interface ConfigFormProps {
  nodeType: NodeType;
  config: NodeConfig;
  nodeColor: string;
  onChange: (config: Partial<NodeConfig>) => void;
}

function ConfigForm({ nodeType, config, nodeColor, onChange }: ConfigFormProps) {
  switch (nodeType) {
    case NodeType.Agent:
      return <AgentConfigForm config={config} nodeColor={nodeColor} onChange={onChange} />;
    case NodeType.Command:
      return <CommandConfigForm config={config} nodeColor={nodeColor} onChange={onChange} />;
    case NodeType.SlashCommand:
      return <SlashCommandConfigForm config={config} nodeColor={nodeColor} onChange={onChange} />;
    case NodeType.Eval:
      return <EvalConfigForm config={config} nodeColor={nodeColor} onChange={onChange} />;
    case NodeType.Http:
      return <HttpConfigForm config={config} nodeColor={nodeColor} onChange={onChange} />;
    case NodeType.Llm:
      return <LlmConfigForm config={config} nodeColor={nodeColor} onChange={onChange} />;
    case NodeType.DynamicAgent:
      return <DynamicAgentConfigForm config={config} nodeColor={nodeColor} onChange={onChange} />;
    case NodeType.DynamicCommand:
      return <DynamicCommandConfigForm config={config} nodeColor={nodeColor} onChange={onChange} />;
    case NodeType.GitHubProject:
      return <GitHubProjectConfigForm config={config} nodeColor={nodeColor} onChange={onChange} />;
    case NodeType.GitCheckout:
      return <GitCheckoutConfigForm config={config} nodeColor={nodeColor} onChange={onChange} />;
    default:
      return (
        <div className="p-4 text-center text-text-muted text-sm">
          Configuration not available
        </div>
      );
  }
}

// ============================================================================
// Agent Config Form
// ============================================================================

function AgentConfigForm({
  config,
  nodeColor,
  onChange,
}: {
  config: NodeConfig;
  nodeColor: string;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (config.type !== 'agent') return null;

  const tools = Object.values(StdlibTool);
  const selectedTools = config.capabilities ?? [];

  return (
    <div className="divide-y divide-border-subtle">
      {/* Role */}
      <FieldGroup>
        <FieldLabel>Role</FieldLabel>
        <TextInput
          value={config.role}
          onChange={(v) => onChange({ role: v })}
          placeholder="architect, developer, reviewer..."
          icon={<SparklesIcon className="w-3.5 h-3.5" />}
          accentColor={nodeColor}
        />
      </FieldGroup>

      {/* Prompt */}
      <FieldGroup>
        <FieldLabel hint={`${config.prompt.length} chars`}>
          System Prompt
        </FieldLabel>
        <PromptTextarea
          value={config.prompt}
          onChange={(v) => onChange({ prompt: v })}
          placeholder="Describe the agent's behavior and capabilities..."
          accentColor={nodeColor}
        />
      </FieldGroup>

      {/* Model */}
      <FieldGroup>
        <FieldLabel>Model</FieldLabel>
        <ModelSelect
          value={config.model}
          onChange={(v) => onChange({ model: v })}
          accentColor={nodeColor}
        />
      </FieldGroup>

      {/* Tools */}
      <FieldGroup>
        <FieldLabel hint={`${selectedTools.length} selected`}>
          Capabilities
        </FieldLabel>
        <ToolGrid
          tools={tools}
          selected={selectedTools}
          onChange={(v) => onChange({ capabilities: v })}
          accentColor={nodeColor}
        />
      </FieldGroup>

      {/* MCP Servers */}
      <FieldGroup>
        <FieldLabel {...(config.mcpServers?.length && { hint: `${config.mcpServers.length} active` })}>
          MCP Servers
        </FieldLabel>
        <McpServerSelector
          selected={config.mcpServers ?? []}
          onChange={(v) => onChange({ mcpServers: v })}
          accentColor={nodeColor}
        />
        <p className="text-[10px] text-text-muted mt-1.5">
          Model Context Protocol servers provide additional tools and capabilities
        </p>
      </FieldGroup>

      {/* Advanced Section */}
      <CollapsibleSection
        title="Advanced"
        isOpen={showAdvanced}
        onToggle={() => setShowAdvanced(!showAdvanced)}
      >
        <FieldGroup>
          <FieldLabel size="sm">Max Turns</FieldLabel>
          <NumberInput
            value={config.maxTurns ?? null}
            onChange={(v) => onChange({ ...(v != null && { maxTurns: v }) })}
            placeholder="∞"
            min={1}
            max={100}
          />
          <p className="text-[10px] text-text-muted mt-1">
            Maximum conversation turns before stopping
          </p>
        </FieldGroup>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// Command Config Form
// ============================================================================

function CommandConfigForm({
  config,
  nodeColor,
  onChange,
}: {
  config: NodeConfig;
  nodeColor: string;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (config.type !== 'command') return null;

  return (
    <div className="divide-y divide-border-subtle">
      {/* Command */}
      <FieldGroup>
        <FieldLabel>Command</FieldLabel>
        <TerminalInput
          value={config.command}
          onChange={(v) => onChange({ command: v })}
          placeholder="bun test --watch"
          accentColor={nodeColor}
        />
      </FieldGroup>

      {/* Working Directory */}
      <FieldGroup>
        <FieldLabel optional>Working Directory</FieldLabel>
        <TextInput
          value={config.cwd ?? ''}
          onChange={(v) => onChange({ ...(v && { cwd: v }) })}
          placeholder="./"
          mono
          icon={<span className="text-[10px] font-bold">CD</span>}
        />
      </FieldGroup>

      {/* Advanced Section */}
      <CollapsibleSection
        title="Advanced"
        isOpen={showAdvanced}
        onToggle={() => setShowAdvanced(!showAdvanced)}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel size="sm">Timeout</FieldLabel>
            <div className="flex items-center gap-2">
              <NumberInput
                value={config.timeout ?? null}
                onChange={(v) => onChange({ ...(v != null && { timeout: v }) })}
                placeholder="60000"
                min={1000}
                className="flex-1"
              />
              <span className="text-xs text-text-muted">ms</span>
            </div>
          </div>
          <div>
            <ToggleSwitch
              label="Fail on non-zero exit"
              checked={config.throwOnError ?? true}
              onChange={(v) => onChange({ throwOnError: v })}
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// Slash Command Config Form
// ============================================================================

function SlashCommandConfigForm({
  config,
  nodeColor,
  onChange,
}: {
  config: NodeConfig;
  nodeColor: string;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'slash-command') return null;

  return (
    <div className="divide-y divide-border-subtle">
      {/* Command */}
      <FieldGroup>
        <FieldLabel>Slash Command</FieldLabel>
        <div className="flex">
          <div className="h-9 px-3 flex items-center bg-bg-tertiary border border-r-0 border-border-default rounded-l-lg">
            <span className="text-sm font-semibold" style={{ color: nodeColor }}>/</span>
          </div>
          <input
            type="text"
            value={config.command}
            onChange={(e) => onChange({ command: e.target.value })}
            className="flex-1 h-9 px-3 bg-bg-primary border border-border-default rounded-r-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors"
            placeholder="commit"
          />
        </div>
      </FieldGroup>

      {/* Arguments */}
      <FieldGroup>
        <FieldLabel hint={`${config.args.length} chars`}>
          Arguments
        </FieldLabel>
        <PromptTextarea
          value={config.args}
          onChange={(v) => onChange({ args: v })}
          placeholder="Additional instructions or arguments..."
          accentColor={nodeColor}
          rows={3}
        />
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// Eval Config Form
// ============================================================================

function EvalConfigForm({
  config,
  nodeColor,
  onChange,
}: {
  config: NodeConfig;
  nodeColor: string;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'eval') return null;

  return (
    <div className="divide-y divide-border-subtle">
      {/* Code Editor */}
      <FieldGroup>
        <FieldLabel hint={`${config.code.length} chars`}>
          JavaScript
        </FieldLabel>
        <CodeEditor
          value={config.code}
          onChange={(v) => onChange({ code: v })}
          accentColor={nodeColor}
        />
      </FieldGroup>

      {/* Help */}
      <div className="p-4">
        <div className="text-[11px] text-text-muted leading-relaxed space-y-1">
          <p>
            <code className="px-1 py-0.5 rounded bg-bg-tertiary text-text-tertiary">state.context</code> — workflow context object
          </p>
          <p>
            <code className="px-1 py-0.5 rounded bg-bg-tertiary text-text-tertiary">return {'{}'}</code> — merge into context
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HTTP Config Form
// ============================================================================

function HttpConfigForm({
  config,
  nodeColor,
  onChange,
}: {
  config: NodeConfig;
  nodeColor: string;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (config.type !== 'http') return null;

  const methodColors: Record<string, string> = {
    GET: '#22c55e',
    POST: '#3b82f6',
    PUT: '#f59e0b',
    DELETE: '#ef4444',
    PATCH: '#a855f7',
  };

  return (
    <div className="divide-y divide-border-subtle">
      {/* Method + URL */}
      <FieldGroup>
        <FieldLabel>Endpoint</FieldLabel>
        <div className="flex gap-2">
          <select
            value={config.method}
            onChange={(e) =>
              onChange({
                method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
              })
            }
            className="h-9 px-2 bg-bg-tertiary border border-border-default rounded-lg text-xs font-bold cursor-pointer focus:outline-none focus:border-border-hover transition-colors"
            style={{ color: methodColors[config.method] }}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
          <input
            type="text"
            value={config.url}
            onChange={(e) => onChange({ url: e.target.value })}
            className="flex-1 h-9 px-3 bg-bg-primary border border-border-default rounded-lg font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors"
            placeholder="https://api.example.com/v1/..."
          />
        </div>
      </FieldGroup>

      {/* Body */}
      {(config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') && (
        <FieldGroup>
          <FieldLabel optional>Request Body</FieldLabel>
          <CodeEditor
            value={config.body ?? ''}
            onChange={(v) => onChange({ ...(v && { body: v }) })}
            accentColor={nodeColor}
            language="json"
            placeholder='{ "key": "value" }'
          />
        </FieldGroup>
      )}

      {/* Advanced Section */}
      <CollapsibleSection
        title="Advanced"
        isOpen={showAdvanced}
        onToggle={() => setShowAdvanced(!showAdvanced)}
      >
        <div>
          <FieldLabel size="sm">Timeout</FieldLabel>
          <div className="flex items-center gap-2">
            <NumberInput
              value={config.timeout ?? null}
              onChange={(v) => onChange({ ...(v != null && { timeout: v }) })}
              placeholder="30000"
              min={1000}
              className="flex-1"
            />
            <span className="text-xs text-text-muted">ms</span>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// LLM Config Form - Multi-Provider with Full Feature Support
// ============================================================================

/**
 * Provider colors for visual distinction in model selector
 */
const PROVIDER_COLORS: Record<LLMProvider, { bg: string; text: string; border: string }> = {
  [LLMProvider.Anthropic]: { bg: '#cc785c', text: '#fff', border: '#cc785c' },
  [LLMProvider.OpenAI]: { bg: '#10a37f', text: '#fff', border: '#10a37f' },
  [LLMProvider.Gemini]: { bg: '#4285f4', text: '#fff', border: '#4285f4' },
};

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  [LLMProvider.Anthropic]: 'Anthropic',
  [LLMProvider.OpenAI]: 'OpenAI',
  [LLMProvider.Gemini]: 'Google',
};

const PROVIDER_ABBREV: Record<LLMProvider, string> = {
  [LLMProvider.Anthropic]: 'ANT',
  [LLMProvider.OpenAI]: 'OAI',
  [LLMProvider.Gemini]: 'GEM',
};

function LlmConfigForm({
  config,
  nodeColor,
  onChange,
}: {
  config: NodeConfig;
  nodeColor: string;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  const [showSystemPrompt, setShowSystemPrompt] = useState(
    Boolean(config.type === 'llm' && config.systemPrompt)
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown - must be before early return
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (config.type !== 'llm') return null;

  // Get current model metadata
  const currentModelId = config.llmModel ?? 'claude-sonnet-4-5';
  const currentModel = getModelMetadata(currentModelId);
  const currentProvider = currentModel?.provider ?? LLMProvider.Anthropic;

  // Group models by provider
  const modelsByProvider = LLM_MODELS.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<LLMProvider, typeof LLM_MODELS>);

  const handleModelChange = (modelId: LLMModelId) => {
    onChange({ llmModel: modelId });
    setModelDropdownOpen(false);
  };

  return (
    <div className="divide-y divide-border-subtle">
      {/* Model Selection - Grouped by Provider */}
      <FieldGroup>
        <FieldLabel>Model</FieldLabel>
        <div className="relative" ref={dropdownRef}>
          {/* Selected Model Display */}
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className={`
              w-full h-10 px-3 flex items-center justify-between gap-2
              bg-bg-primary border rounded-lg text-left
              transition-all duration-150 cursor-pointer
              ${modelDropdownOpen ? 'border-border-hover ring-1' : 'border-border-default hover:border-border-hover'}
            `}
            style={{
              boxShadow: modelDropdownOpen ? `0 0 0 1px ${nodeColor}30` : undefined,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Provider Badge */}
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide shrink-0"
                style={{
                  background: PROVIDER_COLORS[currentProvider].bg,
                  color: PROVIDER_COLORS[currentProvider].text,
                }}
              >
                {PROVIDER_ABBREV[currentProvider]}
              </span>
              <span className="text-sm font-medium text-text-primary truncate">
                {currentModel?.displayName ?? currentModelId}
              </span>
              {/* Capability badges */}
              <div className="flex items-center gap-1 shrink-0">
                {currentModel?.supportsReasoning && (
                  <span className="px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[9px] font-medium">
                    ✦ Think
                  </span>
                )}
                {currentModel?.supportsWebSearch && (
                  <span className="px-1 py-0.5 rounded bg-blue-500/15 text-blue-400 text-[9px] font-medium">
                    🌐 Web
                  </span>
                )}
              </div>
            </div>
            <ChevronDownIcon
              className={`w-4 h-4 text-text-muted transition-transform duration-150 shrink-0 ${modelDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {modelDropdownOpen && (
            <div
              className="absolute z-50 w-full mt-1.5 py-1 bg-bg-secondary border border-border-default rounded-lg shadow-xl overflow-hidden"
              style={{ maxHeight: '320px', overflowY: 'auto' }}
            >
              {Object.entries(modelsByProvider).map(([provider, models]) => (
                <div key={provider}>
                  {/* Provider Header */}
                  <div
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-bg-secondary/95 backdrop-blur-sm border-b border-border-subtle"
                    style={{ color: PROVIDER_COLORS[provider as LLMProvider].bg }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: PROVIDER_COLORS[provider as LLMProvider].bg }}
                    />
                    {PROVIDER_LABELS[provider as LLMProvider]}
                  </div>
                  {/* Models */}
                  {models.map((model) => {
                    const isSelected = model.id === currentModelId;
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={`
                          w-full px-3 py-2 flex items-center justify-between gap-2 text-left
                          transition-colors duration-100
                          ${isSelected
                            ? 'bg-bg-tertiary'
                            : 'hover:bg-bg-tertiary/50'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${isSelected ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                            {model.displayName}
                          </span>
                          <div className="flex items-center gap-1">
                            {model.supportsReasoning && (
                              <span className="text-[9px] text-amber-400">✦</span>
                            )}
                            {model.supportsWebSearch && (
                              <span className="text-[9px] text-blue-400">🌐</span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckIcon className="w-3.5 h-3.5" style={{ color: nodeColor }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </FieldGroup>

      {/* System Prompt - Collapsible */}
      <div className="border-t border-border-subtle">
        <button
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span className="font-medium">System Prompt</span>
            {config.systemPrompt && (
              <span className="text-[10px] text-text-muted font-mono">
                {config.systemPrompt.length} chars
              </span>
            )}
          </div>
          {showSystemPrompt ? (
            <ChevronDownIcon className="w-3.5 h-3.5" />
          ) : (
            <ChevronRightIcon className="w-3.5 h-3.5" />
          )}
        </button>
        {showSystemPrompt && (
          <div className="px-4 pb-4">
            <PromptTextarea
              value={config.systemPrompt ?? ''}
              onChange={(v) => onChange({ systemPrompt: v })}
              placeholder="You are a helpful assistant..."
              accentColor={nodeColor}
              rows={3}
            />
          </div>
        )}
      </div>

      {/* User Prompt */}
      <FieldGroup>
        <FieldLabel hint={`${(config.userPrompt ?? config.prompt).length} chars`}>
          User Prompt
        </FieldLabel>
        <PromptTextarea
          value={config.userPrompt ?? config.prompt}
          onChange={(v) => onChange({ userPrompt: v, prompt: v })}
          placeholder="Enter your prompt... Use {{context.key}} for variables"
          accentColor={nodeColor}
          rows={4}
        />
        <p className="text-[10px] text-text-muted mt-1.5 flex items-center gap-1">
          <CodeBracketIcon className="w-3 h-3" />
          <span>Use <code className="px-1 py-0.5 rounded bg-bg-tertiary font-mono">{`{{context.key}}`}</code> for variable interpolation</span>
        </p>
      </FieldGroup>

      {/* Output Mode */}
      <FieldGroup>
        <FieldLabel>Output Mode</FieldLabel>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ outputMode: 'text' })}
            className={`
              flex-1 h-9 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5
              border transition-all duration-150
              ${(config.outputMode ?? 'text') === 'text'
                ? 'border-transparent text-white'
                : 'border-border-default text-text-secondary hover:border-border-hover hover:text-text-primary bg-bg-primary'
              }
            `}
            style={{
              background: (config.outputMode ?? 'text') === 'text' ? nodeColor : undefined,
            }}
          >
            <span>Plain Text</span>
          </button>
          <button
            onClick={() => onChange({ outputMode: 'json' })}
            className={`
              flex-1 h-9 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5
              border transition-all duration-150
              ${config.outputMode === 'json'
                ? 'border-transparent text-white'
                : 'border-border-default text-text-secondary hover:border-border-hover hover:text-text-primary bg-bg-primary'
              }
            `}
            style={{
              background: config.outputMode === 'json' ? nodeColor : undefined,
            }}
          >
            <CodeBracketIcon className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </FieldGroup>

      {/* JSON Schema Editor - Only shown when JSON mode is selected */}
      {config.outputMode === 'json' && (
        <FieldGroup>
          <FieldLabel optional hint="JSON Schema">
            Output Schema
          </FieldLabel>
          <CodeEditor
            value={config.outputSchema ?? '{\n  "type": "object",\n  "properties": {}\n}'}
            onChange={(v) => onChange({ outputSchema: v })}
            accentColor={nodeColor}
            language="json"
            placeholder='{ "type": "object", "properties": { ... } }'
          />
          <p className="text-[10px] text-text-muted mt-1.5">
            Define the expected JSON structure for validation
          </p>
        </FieldGroup>
      )}

      {/* Advanced Settings */}
      <CollapsibleSection
        title="Advanced"
        isOpen={showAdvanced}
        onToggle={() => setShowAdvanced(!showAdvanced)}
      >
        <div className="space-y-4">
          {/* Temperature & Max Tokens */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel size="sm">Temperature</FieldLabel>
              <SliderInput
                value={config.temperature ?? 0.7}
                onChange={(v) => onChange({ temperature: v })}
                min={0}
                max={2}
                step={0.1}
                accentColor={nodeColor}
              />
            </div>
            <div>
              <FieldLabel size="sm">Max Tokens</FieldLabel>
              <NumberInput
                value={config.maxTokens ?? null}
                onChange={(v) => onChange({ ...(v != null && { maxTokens: v }) })}
                placeholder={String(currentModel?.maxOutputTokens ?? 4096)}
                min={1}
              />
            </div>
          </div>

          {/* Web Search Toggle - Only for models that support it */}
          {currentModel?.supportsWebSearch && (
            <div className="pt-2 border-t border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs font-medium text-text-secondary">Web Search</p>
                    <p className="text-[10px] text-text-muted">Allow model to search the web</p>
                  </div>
                </div>
                <ToggleSwitch
                  label=""
                  checked={config.enableWebSearch ?? false}
                  onChange={(v) => onChange({ enableWebSearch: v })}
                />
              </div>
            </div>
          )}

          {/* Reasoning Effort - Only for models that support reasoning */}
          {currentModel?.supportsReasoning && (
            <div className="pt-2 border-t border-border-subtle">
              <FieldLabel size="sm">
                <span className="flex items-center gap-1.5">
                  <span className="text-amber-400">✦</span>
                  Reasoning Effort
                </span>
              </FieldLabel>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(['low', 'medium', 'high'] as const).map((level) => {
                  const isSelected = (config.reasoningEffort ?? 'medium') === level;
                  const labels = { low: 'Light', medium: 'Balanced', high: 'Deep' };
                  const descs = { low: 'Fast', medium: 'Default', high: 'Thorough' };
                  return (
                    <button
                      key={level}
                      onClick={() => onChange({ reasoningEffort: level })}
                      className={`
                        p-2 rounded-lg border text-left transition-all duration-150
                        ${isSelected
                          ? 'border-transparent bg-amber-500/10'
                          : 'border-border-subtle hover:border-border-default bg-bg-primary'
                        }
                      `}
                      style={{
                        boxShadow: isSelected ? '0 0 0 1px rgba(245, 158, 11, 0.3)' : undefined,
                      }}
                    >
                      <div className={`text-xs font-medium ${isSelected ? 'text-amber-400' : 'text-text-primary'}`}>
                        {labels[level]}
                      </div>
                      <div className="text-[10px] text-text-muted">{descs[level]}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Credentials Section */}
      <CollapsibleSection
        title="Credentials"
        isOpen={showCredentials}
        onToggle={() => setShowCredentials(!showCredentials)}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel size="sm" optional>API Key</FieldLabel>
            <input
              type="password"
              value={config.apiKey ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  onChange({ apiKey: value });
                }
                // Note: Cannot set to undefined due to exactOptionalPropertyTypes
              }}
              placeholder="Uses environment variable if empty"
              className="w-full h-8 px-3 bg-bg-primary border border-border-default rounded-lg text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors"
            />
            <p className="text-[10px] text-text-muted mt-1">
              {currentProvider === LLMProvider.Anthropic && 'Falls back to ANTHROPIC_API_KEY'}
              {currentProvider === LLMProvider.OpenAI && 'Falls back to OPENAI_API_KEY'}
              {currentProvider === LLMProvider.Gemini && 'Falls back to GEMINI_API_KEY'}
            </p>
          </div>
          <div>
            <FieldLabel size="sm" optional>Result Key</FieldLabel>
            <TextInput
              value={config.resultKey ?? 'lastLLMResult'}
              onChange={(v) => onChange({ resultKey: v })}
              placeholder="lastLLMResult"
              mono
            />
            <p className="text-[10px] text-text-muted mt-1">
              Context key to store the response
            </p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// Dynamic Agent Config Form
// ============================================================================

function DynamicAgentConfigForm({
  config,
  nodeColor,
  onChange,
}: {
  config: NodeConfig;
  nodeColor: string;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'dynamic-agent') return null;

  return (
    <div className="divide-y divide-border-subtle">
      {/* Info */}
      <div className="p-4">
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-xs leading-relaxed"
          style={{
            background: `${nodeColor}08`,
            borderLeft: `2px solid ${nodeColor}`,
          }}
        >
          <BoltIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: nodeColor }} />
          <span className="text-text-secondary">
            Configure via expressions that reference <code className="px-1 py-0.5 rounded bg-bg-tertiary">state.context</code>
          </span>
        </div>
      </div>

      {/* Model Expression */}
      <FieldGroup>
        <FieldLabel>Model Expression</FieldLabel>
        <ExpressionInput
          value={config.modelExpression}
          onChange={(v) => onChange({ modelExpression: v })}
          placeholder="state.context.model"
          accentColor={nodeColor}
        />
      </FieldGroup>

      {/* Prompt Expression */}
      <FieldGroup>
        <FieldLabel>Prompt Expression</FieldLabel>
        <ExpressionInput
          value={config.promptExpression}
          onChange={(v) => onChange({ promptExpression: v })}
          placeholder="state.context.prompt"
          accentColor={nodeColor}
          multiline
        />
      </FieldGroup>

      {/* System Expression */}
      <FieldGroup>
        <FieldLabel optional>System Expression</FieldLabel>
        <ExpressionInput
          value={config.systemExpression ?? ''}
          onChange={(v) => onChange({ ...(v && { systemExpression: v }) })}
          placeholder="state.context.system"
          accentColor={nodeColor}
          multiline
        />
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// Dynamic Command Config Form
// ============================================================================

function DynamicCommandConfigForm({
  config,
  nodeColor,
  onChange,
}: {
  config: NodeConfig;
  nodeColor: string;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'dynamic-command') return null;

  return (
    <div className="divide-y divide-border-subtle">
      {/* Info */}
      <div className="p-4">
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-xs leading-relaxed"
          style={{
            background: `${nodeColor}08`,
            borderLeft: `2px solid ${nodeColor}`,
          }}
        >
          <BoltIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: nodeColor }} />
          <span className="text-text-secondary">
            Configure via expressions that reference <code className="px-1 py-0.5 rounded bg-bg-tertiary">state.context</code>
          </span>
        </div>
      </div>

      {/* Command Expression */}
      <FieldGroup>
        <FieldLabel>Command Expression</FieldLabel>
        <ExpressionInput
          value={config.commandExpression}
          onChange={(v) => onChange({ commandExpression: v })}
          placeholder="state.context.command"
          accentColor={nodeColor}
          multiline
        />
      </FieldGroup>

      {/* CWD Expression */}
      <FieldGroup>
        <FieldLabel optional>Directory Expression</FieldLabel>
        <ExpressionInput
          value={config.cwdExpression ?? ''}
          onChange={(v) => onChange({ ...(v && { cwdExpression: v }) })}
          placeholder="state.context.cwd"
          accentColor={nodeColor}
        />
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// GitHub Project Config Form
// ============================================================================

function GitHubProjectConfigForm({
  config,
  nodeColor,
  onChange,
}: {
  config: NodeConfig;
  nodeColor: string;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'github-project') return null;

  return (
    <div className="divide-y divide-border-subtle">
      {/* Info */}
      <div className="p-4">
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-xs leading-relaxed"
          style={{
            background: `${nodeColor}08`,
            borderLeft: `2px solid ${nodeColor}`,
          }}
        >
          <GlobeAltIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: nodeColor }} />
          <span className="text-text-secondary">
            Update GitHub Project fields and issue metadata (status, labels, assignees, etc.)
          </span>
        </div>
      </div>

      {/* GitHub Token */}
      <FieldGroup>
        <FieldLabel>GitHub Token</FieldLabel>
        <TextInput
          value={config.token}
          onChange={(v) => onChange({ token: v })}
          placeholder="ghp_..."
          mono
        />
        <p className="text-xs text-text-tertiary mt-1">Personal access token with repo and project permissions</p>
      </FieldGroup>

      {/* Project Configuration */}
      <FieldGroup>
        <FieldLabel>Project Owner</FieldLabel>
        <TextInput
          value={config.projectOwner}
          onChange={(v) => onChange({ projectOwner: v })}
          placeholder="octocat or org-name"
          mono
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Project Number</FieldLabel>
        <TextInput
          value={String(config.projectNumber)}
          onChange={(v) => onChange({ projectNumber: parseInt(v, 10) || 1 })}
          placeholder="1"
          mono
        />
      </FieldGroup>

      {/* Repository Configuration */}
      <FieldGroup>
        <FieldLabel>Repository Owner</FieldLabel>
        <TextInput
          value={config.owner}
          onChange={(v) => onChange({ owner: v })}
          placeholder="octocat"
          mono
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Repository Name</FieldLabel>
        <TextInput
          value={config.repo}
          onChange={(v) => onChange({ repo: v })}
          placeholder="hello-world"
          mono
        />
      </FieldGroup>

      {/* Issue Number Source */}
      <FieldGroup>
        <FieldLabel optional>Issue Number (static)</FieldLabel>
        <TextInput
          value={String(config.issueNumber ?? '')}
          onChange={(v) => {
            if (v) {
              onChange({ issueNumber: parseInt(v, 10) });
            }
            // Note: Cannot set issueNumber to undefined due to exactOptionalPropertyTypes
            // The field will retain its previous value if cleared
          }}
          placeholder="Leave empty to use context"
          mono
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel optional>Issue Number Key (from context)</FieldLabel>
        <TextInput
          value={config.issueNumberKey ?? 'issueNumber'}
          onChange={(v) => onChange({ issueNumberKey: v })}
          placeholder="issueNumber"
          mono
        />
        <p className="text-xs text-text-tertiary mt-1">
          Context key to read issue number from (used if static number not set)
        </p>
      </FieldGroup>

      {/* Updates Configuration */}
      <FieldGroup>
        <FieldLabel>Field Updates (JSON)</FieldLabel>
        <CodeEditor
          value={JSON.stringify(config.updates, null, 2)}
          onChange={(v) => {
            try {
              const parsed = JSON.parse(v);
              onChange({ updates: Array.isArray(parsed) ? parsed : [] });
            } catch {
              // Invalid JSON, don't update
            }
          }}
          placeholder={`[\n  { "type": "single_select", "field": "Status", "value": "In Progress" },\n  { "type": "add_labels", "labels": ["bug"] }\n]`}
          language="json"
          accentColor={nodeColor}
        />
        <p className="text-xs text-text-tertiary mt-2">
          <strong>Supported operations:</strong> single_select, text, number, date, clear, add_labels, remove_labels, add_assignees, remove_assignees
        </p>
      </FieldGroup>

      {/* Options */}
      <FieldGroup>
        <FieldLabel optional>Result Key</FieldLabel>
        <TextInput
          value={config.resultKey ?? 'lastProjectResult'}
          onChange={(v) => onChange({ resultKey: v })}
          placeholder="lastProjectResult"
          mono
        />
      </FieldGroup>

      <FieldGroup>
        <div className="flex items-center justify-between">
          <div>
            <FieldLabel>Throw on Error</FieldLabel>
            <p className="text-xs text-text-tertiary mt-1">Fail workflow if update fails</p>
          </div>
          <ToggleSwitch
            label=""
            checked={config.throwOnError ?? true}
            onChange={(v) => onChange({ throwOnError: v })}
          />
        </div>
      </FieldGroup>
    </div>
  );
}

// ============================================================================
// Git Checkout Config Form
// ============================================================================

function GitCheckoutConfigForm({
  config,
  nodeColor,
  onChange,
}: {
  config: NodeConfig;
  nodeColor: string;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (config.type !== 'git-checkout') return null;

  return (
    <div className="divide-y divide-border-subtle">
      {/* Info */}
      <div className="p-4">
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-xs leading-relaxed"
          style={{
            background: `${nodeColor}08`,
            borderLeft: `2px solid ${nodeColor}`,
          }}
        >
          <SparklesIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: nodeColor }} />
          <span className="text-text-secondary">
            Clone a GitHub repository for workflow execution. Credentials are resolved from the automation context.
          </span>
        </div>
      </div>

      {/* Use Issue Context Toggle */}
      <FieldGroup>
        <div className="flex items-center justify-between">
          <div>
            <FieldLabel>Use Issue Context</FieldLabel>
            <p className="text-xs text-text-tertiary mt-1">
              Auto-detect repository from the issue that triggered the workflow
            </p>
          </div>
          <ToggleSwitch
            label=""
            checked={config.useIssueContext}
            onChange={(v) => onChange({ useIssueContext: v })}
          />
        </div>
      </FieldGroup>

      {/* Manual Override (shown when not using issue context) */}
      {!config.useIssueContext && (
        <>
          <FieldGroup>
            <FieldLabel>Repository Owner</FieldLabel>
            <TextInput
              value={config.owner ?? ''}
              onChange={(v) => {
                if (v) {
                  onChange({ owner: v });
                }
              }}
              placeholder="octocat"
              mono
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>Repository Name</FieldLabel>
            <TextInput
              value={config.repo ?? ''}
              onChange={(v) => {
                if (v) {
                  onChange({ repo: v });
                }
              }}
              placeholder="hello-world"
              mono
            />
          </FieldGroup>
        </>
      )}

      {/* Git Ref */}
      <FieldGroup>
        <FieldLabel>Branch / Tag / Commit</FieldLabel>
        <TextInput
          value={config.ref}
          onChange={(v) => onChange({ ref: v || 'main' })}
          placeholder="main"
          mono
        />
      </FieldGroup>

      {/* Advanced Section */}
      <CollapsibleSection
        title="Advanced"
        isOpen={showAdvanced}
        onToggle={() => setShowAdvanced(!showAdvanced)}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel size="sm">Clone Depth</FieldLabel>
            <div className="flex items-center gap-2">
              <NumberInput
                value={config.depth}
                onChange={(v) => onChange({ depth: v ?? 1 })}
                placeholder="1"
                min={0}
                className="flex-1"
              />
              <span className="text-xs text-text-muted">0 = full clone</span>
            </div>
          </div>
          <div>
            <ToggleSwitch
              label="Skip if directory exists"
              checked={config.skipIfExists ?? true}
              onChange={(v) => onChange({ skipIfExists: v })}
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// Reusable Input Components
// ============================================================================

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="p-4 space-y-2">{children}</div>;
}

function FieldLabel({
  children,
  hint,
  optional,
  size = 'md',
}: {
  children: React.ReactNode;
  hint?: string;
  optional?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex items-center justify-between">
      <label className={`font-medium text-text-secondary ${size === 'sm' ? 'text-[11px]' : 'text-xs'}`}>
        {children}
        {optional === true && (
          <span className="ml-1 text-text-muted font-normal">·opt</span>
        )}
      </label>
      {hint !== undefined && (
        <span className="text-[10px] text-text-muted font-mono">{hint}</span>
      )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  mono,
  icon,
  accentColor,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
  icon?: React.ReactNode;
  accentColor?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={`
        relative flex items-center h-9 bg-bg-primary border rounded-lg overflow-hidden
        transition-all duration-150
        ${focused ? 'border-border-hover' : 'border-border-default hover:border-border-hover'}
      `}
      style={{
        boxShadow: focused && accentColor != null && accentColor !== '' ? `0 0 0 1px ${accentColor}30` : undefined,
      }}
    >
      {icon !== undefined && (
        <div className="pl-3 text-text-muted">{icon}</div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{ outline: 'none' }}
        className={`
          flex-1 h-full px-3 bg-transparent text-sm text-text-primary
          placeholder:text-text-muted
          ${mono === true ? 'font-mono text-xs' : ''}
        `}
      />
    </div>
  );
}

function PromptTextarea({
  value,
  onChange,
  placeholder,
  accentColor,
  rows = 5,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  accentColor: string;
  rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div
      className={`
        relative bg-bg-primary border rounded-lg overflow-hidden
        transition-all duration-150
        ${focused ? 'border-border-hover' : 'border-border-default hover:border-border-hover'}
      `}
      style={{
        boxShadow: focused ? `0 0 0 1px ${accentColor}30` : undefined,
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        rows={rows}
        style={{ outline: 'none' }}
        className="w-full p-3 bg-transparent text-sm text-text-primary placeholder:text-text-muted resize-none leading-relaxed"
      />
      {/* Character count bar */}
      <div className="h-1 bg-bg-tertiary">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min((value.length / 2000) * 100, 100)}%`,
            background: value.length > 2000
              ? 'var(--color-accent-warning)'
              : accentColor,
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  );
}

function TerminalInput({
  value,
  onChange,
  placeholder,
  accentColor,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  accentColor: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={`
        relative bg-[#0a0a0c] border rounded-lg overflow-hidden
        transition-all duration-150
        ${focused ? 'border-border-hover' : 'border-border-default hover:border-border-hover'}
      `}
      style={{
        boxShadow: focused ? `0 0 0 1px ${accentColor}30` : undefined,
      }}
    >
      {/* Terminal header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary/50 border-b border-border-subtle">
        <div className="w-2 h-2 rounded-full bg-accent-error/60" />
        <div className="w-2 h-2 rounded-full bg-accent-warning/60" />
        <div className="w-2 h-2 rounded-full bg-accent-success/60" />
        <span className="ml-2 text-[10px] text-text-muted font-mono">terminal</span>
      </div>
      <div className="flex items-start p-3">
        <span className="text-accent-success font-mono text-xs mr-2">$</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={2}
          className="flex-1 bg-transparent font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}

function CodeEditor({
  value,
  onChange,
  accentColor,
  language = 'javascript',
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  accentColor: string;
  language?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lines = value.split('\n');

  return (
    <div
      className={`
        relative bg-[#0a0a0c] border rounded-lg overflow-hidden
        transition-all duration-150
        ${focused ? 'border-border-hover' : 'border-border-default hover:border-border-hover'}
      `}
      style={{
        boxShadow: focused ? `0 0 0 1px ${accentColor}30` : undefined,
      }}
    >
      {/* Editor header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-tertiary/50 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <CodeBracketIcon className="w-3 h-3 text-text-muted" />
          <span className="text-[10px] text-text-muted font-mono">{language}</span>
        </div>
        <span className="text-[10px] text-text-muted font-mono">{lines.length} lines</span>
      </div>
      <div className="flex">
        {/* Line numbers */}
        <div className="py-3 px-2 text-right select-none border-r border-border-subtle bg-bg-tertiary/30">
          {lines.map((_, i) => (
            <div key={i} className="text-[10px] font-mono text-text-muted leading-relaxed h-[18px]">
              {i + 1}
            </div>
          ))}
        </div>
        {/* Code area */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 p-3 bg-transparent font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none resize-none leading-relaxed min-h-[120px]"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function ExpressionInput({
  value,
  onChange,
  placeholder,
  accentColor,
  multiline,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  accentColor: string;
  multiline?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  const inputClass = `
    flex-1 bg-transparent font-mono text-xs text-text-primary
    placeholder:text-text-muted focus:outline-none
    ${multiline === true ? 'resize-none leading-relaxed' : ''}
  `;

  return (
    <div
      className={`
        relative flex items-start bg-bg-primary border rounded-lg overflow-hidden
        transition-all duration-150
        ${focused ? 'border-border-hover' : 'border-border-default hover:border-border-hover'}
      `}
      style={{
        boxShadow: focused ? `0 0 0 1px ${accentColor}30` : undefined,
      }}
    >
      <div className="px-2 py-2 border-r border-border-subtle bg-bg-tertiary/50">
        <span className="text-[10px] font-bold" style={{ color: accentColor }}>ƒx</span>
      </div>
      {multiline === true ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={2}
          className={`${inputClass} p-2`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={`${inputClass} h-8 px-2`}
        />
      )}
    </div>
  );
}

function ModelSelect({
  value,
  onChange,
  accentColor,
}: {
  value: AgentModel;
  onChange: (value: AgentModel) => void;
  accentColor: string;
}) {
  const models = [
    { value: AgentModel.Haiku, label: 'Haiku', desc: 'Fast', icon: '⚡' },
    { value: AgentModel.Sonnet, label: 'Sonnet', desc: 'Balanced', icon: '⚖️' },
    { value: AgentModel.Opus, label: 'Opus', desc: 'Powerful', icon: '🎯' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {models.map((model) => (
        <button
          key={model.value}
          onClick={() => onChange(model.value)}
          className={`
            relative p-2 rounded-lg border text-left transition-all duration-150
            ${value === model.value
              ? 'border-transparent bg-bg-tertiary'
              : 'border-border-subtle hover:border-border-default bg-bg-primary'
            }
          `}
          style={{
            boxShadow: value === model.value ? `0 0 0 1px ${accentColor}40` : undefined,
          }}
        >
          <div className="text-sm mb-0.5">{model.icon}</div>
          <div className="text-xs font-medium text-text-primary">{model.label}</div>
          <div className="text-[10px] text-text-muted">{model.desc}</div>
          {value === model.value && (
            <div
              className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: accentColor }}
            >
              <CheckIcon className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function ToolGrid({
  tools,
  selected,
  onChange,
  accentColor,
}: {
  tools: StdlibTool[];
  selected: StdlibTool[];
  onChange: (value: StdlibTool[]) => void;
  accentColor: string;
}) {
  const toggleTool = (tool: StdlibTool) => {
    if (selected.includes(tool)) {
      onChange(selected.filter((t) => t !== tool));
    } else {
      onChange([...selected, tool]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {tools.map((tool) => {
        const isSelected = selected.includes(tool);
        return (
          <button
            key={tool}
            onClick={() => toggleTool(tool)}
            className={`
              px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-150
              ${isSelected
                ? 'text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-default'
              }
            `}
            style={{
              background: isSelected ? accentColor : undefined,
              boxShadow: isSelected ? `0 2px 8px ${accentColor}40` : undefined,
            }}
          >
            {tool}
          </button>
        );
      })}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  className,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v !== '' ? parseInt(v) : null);
      }}
      placeholder={placeholder}
      min={min}
      max={max}
      className={`
        h-8 px-2 bg-bg-primary border border-border-default rounded-lg
        text-xs text-text-primary placeholder:text-text-muted
        focus:outline-none focus:border-border-hover transition-colors
        ${className ?? ''}
      `}
    />
  );
}

function SliderInput({
  value,
  onChange,
  min,
  max,
  step,
  accentColor,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  accentColor: string;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 relative h-8 flex items-center">
        <div className="absolute inset-x-0 h-1 bg-bg-tertiary rounded-full">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${percentage}%`,
              background: accentColor,
            }}
          />
        </div>
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md pointer-events-none transition-all"
          style={{
            left: `calc(${percentage}% - 6px)`,
            background: accentColor,
          }}
        />
      </div>
      <span className="text-xs font-mono text-text-secondary w-8 text-right">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border-subtle">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronDownIcon className="w-3.5 h-3.5" />
        ) : (
          <ChevronRightIcon className="w-3.5 h-3.5" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
