/**
 * Workflow Builder Store
 *
 * Manages the visual workflow builder state including:
 * - React Flow nodes and edges
 * - Selected node for configuration
 * - Workflow metadata
 * - Save/load operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Node, Edge, XYPosition } from '@xyflow/react';
import { NodeType, AgentModel, StdlibTool } from '@/lib/graph/enums';

// ============================================================================
// Types
// ============================================================================

/**
 * Node data stored in React Flow nodes
 */
export interface WorkflowNodeData extends Record<string, unknown> {
  /** Display label */
  label: string;

  /** Node type from GraphEngine */
  nodeType: NodeType;

  /** Node-specific configuration */
  config: NodeConfig;

  /** Connected output node IDs (for visual reference) */
  outputs?: string[];
}

/**
 * Union of all node configurations
 */
export type NodeConfig =
  | AgentNodeConfig
  | CommandNodeConfig
  | SlashCommandNodeConfig
  | EvalNodeConfig
  | HttpNodeConfig
  | LlmNodeConfig
  | DynamicAgentNodeConfig
  | DynamicCommandNodeConfig;

export interface AgentNodeConfig {
  type: 'agent';
  role: string;
  prompt: string;
  capabilities: StdlibTool[];
  model: AgentModel;
  maxTurns?: number;
  temperature?: number;
}

export interface CommandNodeConfig {
  type: 'command';
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  throwOnError?: boolean;
}

export interface SlashCommandNodeConfig {
  type: 'slash-command';
  command: string;
  args: string;
}

export interface EvalNodeConfig {
  type: 'eval';
  /** JavaScript code as string (will be parsed) */
  code: string;
}

export interface HttpNodeConfig {
  type: 'http';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface LlmNodeConfig {
  type: 'llm';
  prompt: string;
  model: AgentModel;
  temperature?: number;
  maxTokens?: number;
}

export interface DynamicAgentNodeConfig {
  type: 'dynamic-agent';
  modelExpression: string;
  promptExpression: string;
  systemExpression?: string;
}

export interface DynamicCommandNodeConfig {
  type: 'dynamic-command';
  commandExpression: string;
  cwdExpression?: string;
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  id: string | null;
  name: string;
  description: string;
  initialContext: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Store State & Actions
// ============================================================================

interface WorkflowBuilderState {
  // Canvas state
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Metadata
  metadata: WorkflowMetadata;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;

  // Node actions
  addNode: (type: NodeType, position: XYPosition) => string;
  updateNode: (id: string, data: Partial<WorkflowNodeData>) => void;
  updateNodeConfig: (id: string, config: Partial<NodeConfig>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;

  // Edge actions
  addEdge: (source: string, target: string, sourceHandle?: string) => void;
  deleteEdge: (id: string) => void;

  // React Flow sync
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;

  // Metadata actions
  updateMetadata: (metadata: Partial<WorkflowMetadata>) => void;

  // Persistence actions
  saveWorkflow: () => Promise<void>;
  loadWorkflow: (id: string) => Promise<void>;
  newWorkflow: () => void;

  // Utilities
  markDirty: () => void;
  clearError: () => void;
}

/**
 * Default node configurations by type
 */
const defaultConfigs: Record<NodeType, () => NodeConfig> = {
  [NodeType.Agent]: () => ({
    type: 'agent',
    role: 'assistant',
    prompt: 'Enter your prompt here...',
    capabilities: [StdlibTool.Read, StdlibTool.Write, StdlibTool.Bash],
    model: AgentModel.Sonnet,
  }),
  [NodeType.Command]: () => ({
    type: 'command',
    command: 'echo "Hello World"',
  }),
  [NodeType.SlashCommand]: () => ({
    type: 'slash-command',
    command: 'commit',
    args: '',
  }),
  [NodeType.Eval]: () => ({
    type: 'eval',
    code: '// Return partial context update\nreturn { result: true };',
  }),
  [NodeType.Http]: () => ({
    type: 'http',
    url: 'https://api.example.com',
    method: 'GET',
  }),
  [NodeType.Llm]: () => ({
    type: 'llm',
    prompt: 'Enter your prompt...',
    model: AgentModel.Sonnet,
  }),
  [NodeType.DynamicAgent]: () => ({
    type: 'dynamic-agent',
    modelExpression: 'state.context.model',
    promptExpression: 'state.context.prompt',
  }),
  [NodeType.DynamicCommand]: () => ({
    type: 'dynamic-command',
    commandExpression: 'state.context.command',
  }),
  [NodeType.GitHubProject]: () => ({
    type: 'command',
    command: 'gh project item-list',
  }),
};

/**
 * Node type display labels
 */
export const nodeTypeLabels: Record<NodeType, string> = {
  [NodeType.Agent]: 'Agent',
  [NodeType.Command]: 'Command',
  [NodeType.SlashCommand]: 'Slash Command',
  [NodeType.Eval]: 'Eval',
  [NodeType.Http]: 'HTTP Request',
  [NodeType.Llm]: 'LLM',
  [NodeType.DynamicAgent]: 'Dynamic Agent',
  [NodeType.DynamicCommand]: 'Dynamic Command',
  [NodeType.GitHubProject]: 'GitHub Project',
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useWorkflowBuilderStore = create<WorkflowBuilderState>()(
  devtools(
    (set, get) => ({
      // Initial state
      nodes: [],
      edges: [],
      selectedNodeId: null,
      metadata: {
        id: null,
        name: 'Untitled Workflow',
        description: '',
        initialContext: {},
      },
      isDirty: false,
      isLoading: false,
      error: null,

      // Node actions
      addNode: (type: NodeType, position: XYPosition) => {
        const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const config = defaultConfigs[type]?.() ?? defaultConfigs[NodeType.Command]();

        const newNode: Node<WorkflowNodeData> = {
          id,
          type: 'workflowNode',
          position,
          data: {
            label: nodeTypeLabels[type] ?? type,
            nodeType: type,
            config,
          },
        };

        set((state) => ({
          nodes: [...state.nodes, newNode],
          isDirty: true,
        }));

        return id;
      },

      updateNode: (id: string, data: Partial<WorkflowNodeData>) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...data } }
              : node
          ),
          isDirty: true,
        }));
      },

      updateNodeConfig: (id: string, config: Partial<NodeConfig>) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    config: { ...node.data.config, ...config } as NodeConfig,
                  },
                }
              : node
          ),
          isDirty: true,
        }));
      },

      deleteNode: (id: string) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          edges: state.edges.filter(
            (edge) => edge.source !== id && edge.target !== id
          ),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
          isDirty: true,
        }));
      },

      selectNode: (id: string | null) => {
        set({ selectedNodeId: id });
      },

      // Edge actions
      addEdge: (source: string, target: string, sourceHandle?: string) => {
        const id = `edge-${source}-${target}-${Date.now()}`;
        const newEdge: Edge = {
          id,
          source,
          target,
          ...(sourceHandle !== undefined && { sourceHandle }),
          type: 'workflowEdge',
        };

        set((state) => ({
          edges: [...state.edges, newEdge],
          isDirty: true,
        }));
      },

      deleteEdge: (id: string) => {
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== id),
          isDirty: true,
        }));
      },

      // React Flow sync
      setNodes: (nodes: Node<WorkflowNodeData>[]) => {
        set({ nodes, isDirty: true });
      },

      setEdges: (edges: Edge[]) => {
        set({ edges, isDirty: true });
      },

      // Metadata actions
      updateMetadata: (metadata: Partial<WorkflowMetadata>) => {
        set((state) => ({
          metadata: { ...state.metadata, ...metadata },
          isDirty: true,
        }));
      },

      // Persistence actions
      saveWorkflow: async () => {
        const { nodes, edges, metadata } = get();
        set({ isLoading: true, error: null });

        try {
          const method = metadata.id ? 'PUT' : 'POST';
          const url = metadata.id
            ? `/api/workflows/${metadata.id}`
            : '/api/workflows';

          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: metadata.name,
              description: metadata.description,
              nodes: nodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data,
              })),
              edges: edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
              })),
              initialContext: metadata.initialContext,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to save workflow');
          }

          const result = await response.json() as { id: string };

          set((state) => ({
            metadata: { ...state.metadata, id: result.id },
            isDirty: false,
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to save',
            isLoading: false,
          });
        }
      },

      loadWorkflow: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/workflows/${id}`);
          if (!response.ok) {
            throw new Error('Failed to load workflow');
          }

          const workflow = await response.json() as {
            id: string;
            name: string;
            description: string;
            nodes: Node<WorkflowNodeData>[];
            edges: Edge[];
            initialContext: Record<string, unknown>;
            createdAt: string;
            updatedAt: string;
          };

          set({
            nodes: workflow.nodes,
            edges: workflow.edges,
            metadata: {
              id: workflow.id,
              name: workflow.name,
              description: workflow.description ?? '',
              initialContext: workflow.initialContext ?? {},
              createdAt: workflow.createdAt,
              updatedAt: workflow.updatedAt,
            },
            isDirty: false,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load',
            isLoading: false,
          });
        }
      },

      newWorkflow: () => {
        set({
          nodes: [],
          edges: [],
          selectedNodeId: null,
          metadata: {
            id: null,
            name: 'Untitled Workflow',
            description: '',
            initialContext: {},
          },
          isDirty: false,
          error: null,
        });
      },

      // Utilities
      markDirty: () => set({ isDirty: true }),
      clearError: () => set({ error: null }),
    }),
    { name: 'workflow-builder' }
  )
);

/**
 * Get the currently selected node
 */
export function useSelectedNode() {
  const nodes = useWorkflowBuilderStore((s) => s.nodes);
  const selectedNodeId = useWorkflowBuilderStore((s) => s.selectedNodeId);
  return nodes.find((n) => n.id === selectedNodeId);
}
