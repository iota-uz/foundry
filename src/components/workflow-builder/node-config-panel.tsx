/**
 * Node Configuration Panel
 *
 * Right-side panel for configuring the selected node.
 */

'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useWorkflowBuilderStore, useSelectedNode } from '@/store';
import { NodeType, AgentModel, StdlibTool } from '@/lib/graph/enums';
import type { NodeConfig } from '@/store/workflow-builder.store';

export function NodeConfigPanel() {
  const selectedNode = useSelectedNode();
  const { updateNode, updateNodeConfig, deleteNode, selectNode } = useWorkflowBuilderStore();

  if (!selectedNode) {
    return (
      <div className="h-full p-4">
        <p className="text-text-secondary text-sm">
          Select a node to configure it.
        </p>
      </div>
    );
  }

  const { data } = selectedNode;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <h3 className="font-semibold text-text-primary">Configure Node</h3>
        <button
          onClick={() => selectNode(null)}
          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {/* Node Label */}
      <div className="p-4 border-b border-border-default">
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Label
        </label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
          className="
            w-full px-3 py-2 rounded-lg
            bg-bg-tertiary border border-border-default
            text-text-primary placeholder:text-text-tertiary
            focus:outline-none focus:ring-1 focus:ring-blue-500
          "
        />
      </div>

      {/* Type-specific config */}
      <div className="p-4">
        <ConfigForm
          nodeId={selectedNode.id}
          nodeType={data.nodeType}
          config={data.config}
          onChange={(config) => updateNodeConfig(selectedNode.id, config)}
        />
      </div>

      {/* Delete button */}
      <div className="p-4 border-t border-border-default">
        <button
          onClick={() => deleteNode(selectedNode.id)}
          className="
            w-full py-2 rounded-lg
            bg-red-600/20 hover:bg-red-600/30
            text-red-400 font-medium transition-colors
          "
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Config Form
// ============================================================================

interface ConfigFormProps {
  nodeId: string;
  nodeType: NodeType;
  config: NodeConfig;
  onChange: (config: Partial<NodeConfig>) => void;
}

function ConfigForm({ nodeType, config, onChange }: ConfigFormProps) {
  switch (nodeType) {
    case NodeType.Agent:
      return <AgentConfigForm config={config} onChange={onChange} />;
    case NodeType.Command:
      return <CommandConfigForm config={config} onChange={onChange} />;
    case NodeType.SlashCommand:
      return <SlashCommandConfigForm config={config} onChange={onChange} />;
    case NodeType.Eval:
      return <EvalConfigForm config={config} onChange={onChange} />;
    case NodeType.Http:
      return <HttpConfigForm config={config} onChange={onChange} />;
    case NodeType.Llm:
      return <LlmConfigForm config={config} onChange={onChange} />;
    default:
      return (
        <p className="text-text-secondary text-sm">
          Configuration for {nodeType} not yet implemented.
        </p>
      );
  }
}

// ============================================================================
// Agent Config
// ============================================================================

function AgentConfigForm({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'agent') return null;

  const tools = Object.values(StdlibTool);
  const selectedTools = config.capabilities ?? [];

  return (
    <div className="space-y-4">
      <Field label="Role">
        <input
          type="text"
          value={config.role}
          onChange={(e) => onChange({ role: e.target.value })}
          className="input-field"
          placeholder="e.g., architect, developer"
        />
      </Field>

      <Field label="Prompt">
        <textarea
          value={config.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          className="input-field min-h-[120px] resize-y"
          placeholder="Enter the agent's instructions..."
        />
      </Field>

      <Field label="Model">
        <select
          value={config.model}
          onChange={(e) => onChange({ model: e.target.value as AgentModel })}
          className="input-field"
        >
          <option value={AgentModel.Haiku}>Haiku (fast)</option>
          <option value={AgentModel.Sonnet}>Sonnet (balanced)</option>
          <option value={AgentModel.Opus}>Opus (powerful)</option>
        </select>
      </Field>

      <Field label="Tools">
        <div className="max-h-40 overflow-y-auto space-y-1 bg-bg-tertiary rounded-lg p-2">
          {tools.map((tool) => (
            <label key={tool} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedTools.includes(tool)}
                onChange={(e) => {
                  const newTools = e.target.checked
                    ? [...selectedTools, tool]
                    : selectedTools.filter((t) => t !== tool);
                  onChange({ capabilities: newTools });
                }}
                className="rounded border-border-default"
              />
              <span className="text-text-primary">{tool}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Max Turns">
        <input
          type="number"
          value={config.maxTurns ?? ''}
          onChange={(e) => {
            const value = e.target.value ? parseInt(e.target.value) : null;
            onChange(value !== null ? { maxTurns: value } : {});
          }}
          className="input-field"
          placeholder="Default: unlimited"
          min={1}
        />
      </Field>

      <Field label="Temperature">
        <input
          type="number"
          value={config.temperature ?? ''}
          onChange={(e) => {
            const value = e.target.value ? parseFloat(e.target.value) : null;
            onChange(value !== null ? { temperature: value } : {});
          }}
          className="input-field"
          placeholder="0.0 - 1.0"
          min={0}
          max={1}
          step={0.1}
        />
      </Field>
    </div>
  );
}

// ============================================================================
// Command Config
// ============================================================================

function CommandConfigForm({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'command') return null;

  return (
    <div className="space-y-4">
      <Field label="Command">
        <textarea
          value={config.command}
          onChange={(e) => onChange({ command: e.target.value })}
          className="input-field font-mono min-h-[80px] resize-y"
          placeholder="e.g., bun test"
        />
      </Field>

      <Field label="Working Directory">
        <input
          type="text"
          value={config.cwd ?? ''}
          onChange={(e) => {
            const value = e.target.value || null;
            onChange(value !== null ? { cwd: value } : {});
          }}
          className="input-field"
          placeholder="Default: current directory"
        />
      </Field>

      <Field label="Timeout (ms)">
        <input
          type="number"
          value={config.timeout ?? ''}
          onChange={(e) => {
            const value = e.target.value ? parseInt(e.target.value) : null;
            onChange(value !== null ? { timeout: value } : {});
          }}
          className="input-field"
          placeholder="Default: 60000"
          min={1000}
        />
      </Field>

      <Field label="Error Handling">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.throwOnError ?? true}
            onChange={(e) => onChange({ throwOnError: e.target.checked })}
            className="rounded border-border-default"
          />
          <span className="text-sm text-text-primary">
            Fail workflow on non-zero exit code
          </span>
        </label>
      </Field>
    </div>
  );
}

// ============================================================================
// Slash Command Config
// ============================================================================

function SlashCommandConfigForm({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'slash-command') return null;

  return (
    <div className="space-y-4">
      <Field label="Command">
        <div className="flex items-center gap-2">
          <span className="text-text-secondary">/</span>
          <input
            type="text"
            value={config.command}
            onChange={(e) => onChange({ command: e.target.value })}
            className="input-field flex-1"
            placeholder="e.g., commit, review-pr"
          />
        </div>
      </Field>

      <Field label="Arguments">
        <textarea
          value={config.args}
          onChange={(e) => onChange({ args: e.target.value })}
          className="input-field min-h-[80px] resize-y"
          placeholder="Instructions/arguments for the command..."
        />
      </Field>
    </div>
  );
}

// ============================================================================
// Eval Config
// ============================================================================

function EvalConfigForm({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'eval') return null;

  return (
    <div className="space-y-4">
      <Field label="JavaScript Code">
        <textarea
          value={config.code}
          onChange={(e) => onChange({ code: e.target.value })}
          className="input-field font-mono min-h-[200px] resize-y text-sm"
          placeholder={`// Access state.context for workflow context
// Return an object to merge with context
return {
  result: true,
  counter: state.context.counter + 1
};`}
        />
      </Field>
      <p className="text-xs text-text-tertiary">
        The code receives <code>state</code> with <code>context</code>, <code>currentNode</code>, etc.
        Return an object to merge with the context.
      </p>
    </div>
  );
}

// ============================================================================
// HTTP Config
// ============================================================================

function HttpConfigForm({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'http') return null;

  return (
    <div className="space-y-4">
      <Field label="Method">
        <select
          value={config.method}
          onChange={(e) => onChange({ method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' })}
          className="input-field"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </Field>

      <Field label="URL">
        <input
          type="text"
          value={config.url}
          onChange={(e) => onChange({ url: e.target.value })}
          className="input-field"
          placeholder="https://api.example.com/endpoint"
        />
      </Field>

      <Field label="Request Body">
        <textarea
          value={config.body ?? ''}
          onChange={(e) => {
            const value = e.target.value || null;
            onChange(value !== null ? { body: value } : {});
          }}
          className="input-field font-mono min-h-[100px] resize-y text-sm"
          placeholder='{"key": "value"}'
        />
      </Field>

      <Field label="Timeout (ms)">
        <input
          type="number"
          value={config.timeout ?? ''}
          onChange={(e) => {
            const value = e.target.value ? parseInt(e.target.value) : null;
            onChange(value !== null ? { timeout: value } : {});
          }}
          className="input-field"
          placeholder="Default: 30000"
          min={1000}
        />
      </Field>
    </div>
  );
}

// ============================================================================
// LLM Config
// ============================================================================

function LlmConfigForm({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'llm') return null;

  return (
    <div className="space-y-4">
      <Field label="Prompt">
        <textarea
          value={config.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          className="input-field min-h-[120px] resize-y"
          placeholder="Enter the prompt for the LLM..."
        />
      </Field>

      <Field label="Model">
        <select
          value={config.model}
          onChange={(e) => onChange({ model: e.target.value as AgentModel })}
          className="input-field"
        >
          <option value={AgentModel.Haiku}>Haiku (fast)</option>
          <option value={AgentModel.Sonnet}>Sonnet (balanced)</option>
          <option value={AgentModel.Opus}>Opus (powerful)</option>
        </select>
      </Field>

      <Field label="Temperature">
        <input
          type="number"
          value={config.temperature ?? ''}
          onChange={(e) => {
            const value = e.target.value ? parseFloat(e.target.value) : null;
            onChange(value !== null ? { temperature: value } : {});
          }}
          className="input-field"
          placeholder="0.0 - 1.0"
          min={0}
          max={1}
          step={0.1}
        />
      </Field>

      <Field label="Max Tokens">
        <input
          type="number"
          value={config.maxTokens ?? ''}
          onChange={(e) => {
            const value = e.target.value ? parseInt(e.target.value) : null;
            onChange(value !== null ? { maxTokens: value } : {});
          }}
          className="input-field"
          placeholder="Default: 4096"
          min={1}
        />
      </Field>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
