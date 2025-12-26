/**
 * Node Configuration Panel
 *
 * Production-grade right-side panel for configuring the selected node.
 * Features:
 * - Header with node type badge and icon
 * - Section dividers between config sections
 * - Fixed-height textareas (no resize)
 * - Character counters for long text fields
 * - Danger zone section with confirmation
 * - All node type config forms implemented
 */

'use client';

import React, { useState } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useWorkflowBuilderStore, useSelectedNode } from '@/store';
import { NodeType, AgentModel, StdlibTool } from '@/lib/graph/enums';
import { getNodeColor } from '@/lib/design-system';
import type { NodeConfig } from '@/store/workflow-builder.store';
import { Modal, ModalBody, ModalFooter } from '@/components/shared/modal';
import { Button } from '@/components/shared/button';

// ============================================================================
// Main Component
// ============================================================================

export function NodeConfigPanel() {
  const selectedNode = useSelectedNode();
  const { updateNode, updateNodeConfig, deleteNode, selectNode } =
    useWorkflowBuilderStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border-subtle flex items-center justify-center mx-auto mb-3">
            <InformationCircleIcon className="w-5 h-5 text-text-tertiary" />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">
            No node selected
          </p>
          <p className="text-xs text-text-tertiary">
            Click a node on the canvas to configure it
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
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-border-default flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Node type badge */}
          <div
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded-md
              ${nodeColor.bgColor} ${nodeColor.borderColor} border
            `}
          >
            <IconComponent className={`w-3.5 h-3.5 ${nodeColor.textColor}`} />
            <span className={`text-xs font-medium ${nodeColor.textColor}`}>
              {nodeColor.label}
            </span>
          </div>
        </div>

        <button
          onClick={() => selectNode(null)}
          className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
          aria-label="Close panel"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Node Label Section */}
        <Section title="Display">
          <Field label="Label">
            <input
              type="text"
              value={data.label}
              onChange={(e) =>
                updateNode(selectedNode.id, { label: e.target.value })
              }
              className="input-field"
              placeholder="Node label"
            />
          </Field>
        </Section>

        {/* Type-specific config */}
        <Section title="Configuration">
          <ConfigForm
            nodeType={data.nodeType}
            config={data.config}
            onChange={(config) => updateNodeConfig(selectedNode.id, config)}
          />
        </Section>

        {/* Danger Zone */}
        <div className="p-4 border-t border-border-subtle">
          <h4 className="text-xs font-medium text-accent-error uppercase tracking-wider mb-3">
            Danger Zone
          </h4>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className={`
              w-full py-2.5 px-4 rounded-lg
              border border-accent-error/30
              bg-accent-error/10 hover:bg-accent-error/20
              text-accent-error text-sm font-medium
              transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-error focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary
            `}
          >
            Delete Node
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
                Are you sure you want to delete{' '}
                <span className="font-medium">&ldquo;{data.label}&rdquo;</span>?
              </p>
              <p className="text-xs text-text-tertiary">
                This will also remove all connections to this node. This action
                cannot be undone.
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
    case NodeType.DynamicAgent:
      return <DynamicAgentConfigForm config={config} onChange={onChange} />;
    case NodeType.DynamicCommand:
      return <DynamicCommandConfigForm config={config} onChange={onChange} />;
    case NodeType.GitHubProject:
      return <GitHubProjectConfigForm config={config} onChange={onChange} />;
    default:
      return (
        <div className="flex items-center gap-2 text-text-tertiary text-sm">
          <InformationCircleIcon className="w-4 h-4" />
          <span>Configuration for {nodeType} not yet implemented.</span>
        </div>
      );
  }
}

// ============================================================================
// Agent Config Form
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
  const promptLength = config.prompt.length;

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

      <Field
        label="Prompt"
        hint={`${promptLength} characters`}
        {...(promptLength > 2000 && { hintColor: 'text-accent-warning' })}
      >
        <textarea
          value={config.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          className="input-field h-[120px] resize-none font-mono text-sm"
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
        <div className="max-h-36 overflow-y-auto space-y-0.5 bg-bg-tertiary rounded-lg p-2 border border-border-subtle">
          {tools.map((tool) => (
            <label
              key={tool}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded
                hover:bg-bg-hover cursor-pointer transition-colors
              `}
            >
              <input
                type="checkbox"
                checked={selectedTools.includes(tool)}
                onChange={(e) => {
                  const newTools = e.target.checked
                    ? [...selectedTools, tool]
                    : selectedTools.filter((t) => t !== tool);
                  onChange({ capabilities: newTools });
                }}
                className="rounded border-border-default text-accent-primary focus:ring-accent-primary focus:ring-offset-0"
              />
              <span className="text-sm text-text-primary">{tool}</span>
            </label>
          ))}
        </div>
      </Field>

      <Divider />

      <Field label="Max Turns" optional>
        <input
          type="number"
          value={config.maxTurns ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ maxTurns: parseInt(e.target.value) });
            }
          }}
          className="input-field"
          placeholder="Default: unlimited"
          min={1}
        />
      </Field>

      <Field label="Temperature" optional>
        <input
          type="number"
          value={config.temperature ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ temperature: parseFloat(e.target.value) });
            }
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
// Command Config Form
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
          className="input-field font-mono text-sm h-[80px] resize-none"
          placeholder="e.g., bun test"
        />
      </Field>

      <Field label="Working Directory" optional>
        <input
          type="text"
          value={config.cwd ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ cwd: e.target.value });
            }
          }}
          className="input-field font-mono text-sm"
          placeholder="Default: current directory"
        />
      </Field>

      <Divider />

      <Field label="Timeout (ms)" optional>
        <input
          type="number"
          value={config.timeout ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ timeout: parseInt(e.target.value) });
            }
          }}
          className="input-field"
          placeholder="Default: 60000"
          min={1000}
        />
      </Field>

      <Field label="Error Handling">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.throwOnError ?? true}
            onChange={(e) => onChange({ throwOnError: e.target.checked })}
            className="rounded border-border-default text-accent-primary focus:ring-accent-primary focus:ring-offset-0"
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
// Slash Command Config Form
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
        <div className="flex items-center gap-0">
          <span className="h-9 px-3 flex items-center bg-bg-tertiary border border-r-0 border-border-default rounded-l-lg text-text-tertiary text-sm">
            /
          </span>
          <input
            type="text"
            value={config.command}
            onChange={(e) => onChange({ command: e.target.value })}
            className="input-field flex-1 rounded-l-none"
            placeholder="e.g., commit, review-pr"
          />
        </div>
      </Field>

      <Field label="Arguments" hint={`${config.args.length} characters`}>
        <textarea
          value={config.args}
          onChange={(e) => onChange({ args: e.target.value })}
          className="input-field h-[80px] resize-none"
          placeholder="Instructions/arguments for the command..."
        />
      </Field>
    </div>
  );
}

// ============================================================================
// Eval Config Form
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
      <Field label="JavaScript Code" hint={`${config.code.length} characters`}>
        <textarea
          value={config.code}
          onChange={(e) => onChange({ code: e.target.value })}
          className="input-field font-mono text-xs h-[180px] resize-none leading-relaxed"
          placeholder={`// Access state.context for workflow context
// Return an object to merge with context
return {
  result: true,
  counter: state.context.counter + 1
};`}
        />
      </Field>
      <p className="text-xs text-text-tertiary leading-relaxed">
        The code receives <code className="px-1 py-0.5 rounded bg-bg-tertiary text-text-secondary">state</code> with{' '}
        <code className="px-1 py-0.5 rounded bg-bg-tertiary text-text-secondary">context</code>,{' '}
        <code className="px-1 py-0.5 rounded bg-bg-tertiary text-text-secondary">currentNode</code>, etc.
        Return an object to merge with the context.
      </p>
    </div>
  );
}

// ============================================================================
// HTTP Config Form
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
      <div className="grid grid-cols-[100px_1fr] gap-2">
        <Field label="Method">
          <select
            value={config.method}
            onChange={(e) =>
              onChange({
                method: e.target.value as
                  | 'GET'
                  | 'POST'
                  | 'PUT'
                  | 'DELETE'
                  | 'PATCH',
              })
            }
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
            className="input-field font-mono text-sm"
            placeholder="https://api.example.com/endpoint"
          />
        </Field>
      </div>

      <Field label="Request Body" optional>
        <textarea
          value={config.body ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ body: e.target.value });
            }
          }}
          className="input-field font-mono text-xs h-[100px] resize-none"
          placeholder='{"key": "value"}'
        />
      </Field>

      <Divider />

      <Field label="Timeout (ms)" optional>
        <input
          type="number"
          value={config.timeout ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ timeout: parseInt(e.target.value) });
            }
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
// LLM Config Form
// ============================================================================

function LlmConfigForm({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'llm') return null;

  const promptLength = config.prompt.length;

  return (
    <div className="space-y-4">
      <Field
        label="Prompt"
        hint={`${promptLength} characters`}
        {...(promptLength > 2000 && { hintColor: 'text-accent-warning' })}
      >
        <textarea
          value={config.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          className="input-field h-[120px] resize-none font-mono text-sm"
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

      <Divider />

      <Field label="Temperature" optional>
        <input
          type="number"
          value={config.temperature ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ temperature: parseFloat(e.target.value) });
            }
          }}
          className="input-field"
          placeholder="0.0 - 1.0"
          min={0}
          max={1}
          step={0.1}
        />
      </Field>

      <Field label="Max Tokens" optional>
        <input
          type="number"
          value={config.maxTokens ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ maxTokens: parseInt(e.target.value) });
            }
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
// Dynamic Agent Config Form
// ============================================================================

function DynamicAgentConfigForm({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'dynamic-agent') return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-primary/5 border border-accent-primary/20">
        <InformationCircleIcon className="w-4 h-4 text-accent-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary leading-relaxed">
          Dynamic Agent allows runtime configuration via expressions that
          reference the workflow context.
        </p>
      </div>

      <Field label="Model Expression">
        <input
          type="text"
          value={config.modelExpression}
          onChange={(e) => onChange({ modelExpression: e.target.value })}
          className="input-field font-mono text-sm"
          placeholder="state.context.model"
        />
        <p className="text-xs text-text-tertiary mt-1">
          Expression that resolves to a model name (haiku, sonnet, opus)
        </p>
      </Field>

      <Field label="Prompt Expression">
        <textarea
          value={config.promptExpression}
          onChange={(e) => onChange({ promptExpression: e.target.value })}
          className="input-field font-mono text-sm h-[80px] resize-none"
          placeholder="state.context.prompt"
        />
        <p className="text-xs text-text-tertiary mt-1">
          Expression that resolves to the prompt string
        </p>
      </Field>

      <Field label="System Expression" optional>
        <textarea
          value={config.systemExpression ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ systemExpression: e.target.value });
            }
          }}
          className="input-field font-mono text-sm h-[80px] resize-none"
          placeholder="state.context.system"
        />
        <p className="text-xs text-text-tertiary mt-1">
          Optional expression for system prompt
        </p>
      </Field>
    </div>
  );
}

// ============================================================================
// Dynamic Command Config Form
// ============================================================================

function DynamicCommandConfigForm({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  if (config.type !== 'dynamic-command') return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-primary/5 border border-accent-primary/20">
        <InformationCircleIcon className="w-4 h-4 text-accent-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary leading-relaxed">
          Dynamic Command allows runtime configuration via expressions that
          reference the workflow context.
        </p>
      </div>

      <Field label="Command Expression">
        <textarea
          value={config.commandExpression}
          onChange={(e) => onChange({ commandExpression: e.target.value })}
          className="input-field font-mono text-sm h-[80px] resize-none"
          placeholder="state.context.command"
        />
        <p className="text-xs text-text-tertiary mt-1">
          Expression that resolves to the shell command
        </p>
      </Field>

      <Field label="Working Directory Expression" optional>
        <input
          type="text"
          value={config.cwdExpression ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ cwdExpression: e.target.value });
            }
          }}
          className="input-field font-mono text-sm"
          placeholder="state.context.cwd"
        />
        <p className="text-xs text-text-tertiary mt-1">
          Optional expression for working directory
        </p>
      </Field>
    </div>
  );
}

// ============================================================================
// GitHub Project Config Form
// ============================================================================

function GitHubProjectConfigForm({
  config,
  onChange,
}: {
  config: NodeConfig;
  onChange: (config: Partial<NodeConfig>) => void;
}) {
  // GitHub Project uses command config under the hood
  if (config.type !== 'command') return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
        <InformationCircleIcon className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary leading-relaxed">
          GitHub Project node updates project item status via the GitHub CLI.
          Ensure you have the <code className="px-1 py-0.5 rounded bg-bg-tertiary text-text-secondary">gh</code> CLI installed and authenticated.
        </p>
      </div>

      <Field label="Project Command">
        <textarea
          value={config.command}
          onChange={(e) => onChange({ command: e.target.value })}
          className="input-field font-mono text-sm h-[80px] resize-none"
          placeholder="gh project item-list 123 --owner @me"
        />
      </Field>

      <Divider />

      <Field label="Working Directory" optional>
        <input
          type="text"
          value={config.cwd ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange({ cwd: e.target.value });
            }
          }}
          className="input-field font-mono text-sm"
          placeholder="Default: current directory"
        />
      </Field>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 border-b border-border-subtle">
      <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  optional,
  hint,
  hintColor,
}: {
  label: string;
  children: React.ReactNode;
  optional?: boolean;
  hint?: string;
  hintColor?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-text-secondary">
          {label}
          {optional === true && (
            <span className="ml-1 text-xs text-text-tertiary font-normal">
              (optional)
            </span>
          )}
        </label>
        {hint !== undefined && hint !== null && hint !== '' && (
          <span className={`text-xs ${hintColor ?? 'text-text-tertiary'}`}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border-subtle my-4" />;
}
