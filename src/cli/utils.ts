/**
 * CLI utilities for workflow execution
 *
 * Helper functions to bridge between workflow config and graph engine.
 * Updated for v2 array-based workflow definitions.
 */

import type {
  WorkflowConfig,
  WorkflowState,
  NodeDef,
  BaseState,
  GraphContext,
  Transition,
  ToolReference,
} from '../lib/graph';
import { resolveTransition, NodeType } from '../lib/graph';
import {
  AgentNodeRuntime,
  CommandNodeRuntime,
  SlashCommandNodeRuntime,
  EvalNodeRuntime,
  DynamicAgentNodeRuntime,
  DynamicCommandNodeRuntime,
  type AgentNodeConfig,
  type CommandNodeConfig,
  type SlashCommandNodeConfig,
  type EvalNodeConfig,
  type DynamicAgentNodeConfig,
  type DynamicCommandNodeConfig,
} from '../lib/graph/nodes';

/**
 * State type that works with both BaseState and WorkflowState.
 * Combines BaseState properties with a typed context.
 */
type GraphState<TContext extends Record<string, unknown>> = BaseState & {
  context: TContext;
};

/**
 * Generic graph node interface for workflow execution.
 * Represents the runtime node that can be executed by the GraphEngine.
 */
interface WorkflowGraphNode<TContext extends Record<string, unknown>> {
  name: string;
  execute(
    state: GraphState<TContext>,
    context: GraphContext
  ): Promise<Partial<GraphState<TContext>>>;
  next(state: GraphState<TContext>): string;
}

/**
 * A node runtime instance with an execute method that returns a NodeExecutionResult.
 * This is the shape returned by the node runtime classes (AgentNodeRuntime, etc).
 */
interface NodeRuntimeInstance<TContext extends Record<string, unknown>> {
  execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<{ stateUpdate: Partial<WorkflowState<TContext>> }>;
}

/**
 * Creates a GraphNode from a v2 NodeDef.
 *
 * This bridges the config-based node definition to the runtime GraphNode
 * interface expected by the GraphEngine.
 *
 * @param node - Node definition from config
 * @param validNodeNames - Set of valid node names for transition validation
 * @returns A GraphNode instance
 */
export function createGraphNode<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
>(
  node: NodeDef<TNodeNames, TContext>,
  validNodeNames: Set<string>
): WorkflowGraphNode<TContext> {
  // Create the underlying node runtime implementation based on type
  let nodeRuntime: NodeRuntimeInstance<TContext>;

  switch (node.type) {
    case NodeType.Agent: {
      const agentNode = node;
      // Convert StdlibTool enums to tool references - they're already the right type
      const tools: ToolReference[] = agentNode.capabilities ?? [];

      const agentConfig: AgentNodeConfig<TContext> = {
        role: agentNode.role,
        system: agentNode.prompt,
        tools,
        next: agentNode.then as Transition<TContext>,
      };

      nodeRuntime = new AgentNodeRuntime<TContext>(agentConfig);
      break;
    }
    case NodeType.Command: {
      const cmdNode = node;
      const cmdConfig: CommandNodeConfig<TContext> = {
        command: cmdNode.command,
        next: cmdNode.then as Transition<TContext>,
      };
      if (cmdNode.cwd !== undefined) cmdConfig.cwd = cmdNode.cwd;
      if (cmdNode.env !== undefined) cmdConfig.env = cmdNode.env;
      if (cmdNode.timeout !== undefined) cmdConfig.timeout = cmdNode.timeout;
      if (cmdNode.throwOnError !== undefined) cmdConfig.throwOnError = cmdNode.throwOnError;

      nodeRuntime = new CommandNodeRuntime<TContext>(cmdConfig);
      break;
    }
    case NodeType.SlashCommand: {
      const slashNode = node;
      const slashConfig: SlashCommandNodeConfig<TContext> = {
        command: slashNode.command,
        args: slashNode.args,
        next: slashNode.then as Transition<TContext>,
      };

      nodeRuntime = new SlashCommandNodeRuntime<TContext>(slashConfig);
      break;
    }
    case NodeType.Eval: {
      const evalNode = node;
      const evalConfig: EvalNodeConfig<TContext> = {
        fn: evalNode.update,
        next: evalNode.then as Transition<TContext>,
      };

      nodeRuntime = new EvalNodeRuntime<TContext>(evalConfig);
      break;
    }
    case NodeType.DynamicAgent: {
      const dynAgentNode = node;
      const dynAgentConfig: DynamicAgentNodeConfig<TContext> = {
        model: dynAgentNode.model,
        prompt: dynAgentNode.prompt,
        next: dynAgentNode.then as Transition<TContext>,
      };
      if (dynAgentNode.system !== undefined) dynAgentConfig.system = dynAgentNode.system;
      if (dynAgentNode.capabilities !== undefined) dynAgentConfig.tools = dynAgentNode.capabilities;
      if (dynAgentNode.maxTurns !== undefined) dynAgentConfig.maxTurns = dynAgentNode.maxTurns;
      if (dynAgentNode.temperature !== undefined) dynAgentConfig.temperature = dynAgentNode.temperature;

      nodeRuntime = new DynamicAgentNodeRuntime<TContext>(dynAgentConfig);
      break;
    }
    case NodeType.DynamicCommand: {
      const dynCmdNode = node;
      const dynCmdConfig: DynamicCommandNodeConfig<TContext> = {
        command: dynCmdNode.command,
        next: dynCmdNode.then as Transition<TContext>,
      };
      if (dynCmdNode.cwd !== undefined) dynCmdConfig.cwd = dynCmdNode.cwd;
      if (dynCmdNode.env !== undefined) dynCmdConfig.env = dynCmdNode.env;
      if (dynCmdNode.timeout !== undefined) dynCmdConfig.timeout = dynCmdNode.timeout;

      nodeRuntime = new DynamicCommandNodeRuntime<TContext>(dynCmdConfig);
      break;
    }
    default: {
      const exhaustiveCheck: never = node;
      throw new Error(`Unknown node type: ${(exhaustiveCheck as { type: string }).type}`);
    }
  }

  const nodeName = node.name;
  const nodeTransition = node.then;

  // Wrap in GraphNode interface
  return {
    name: nodeName,
    async execute(
      state: GraphState<TContext>,
      context: GraphContext
    ): Promise<Partial<GraphState<TContext>>> {
      // Cast state to WorkflowState for node execution
      const workflowState = state as WorkflowState<TContext>;
      const result = await nodeRuntime.execute(workflowState, context);
      return result.stateUpdate as Partial<GraphState<TContext>>;
    },
    next(state: GraphState<TContext>): string {
      // Cast state to WorkflowState for transition resolution
      const workflowState = state as WorkflowState<TContext>;
      return resolveTransition(
        nodeTransition as Transition<TContext>,
        workflowState,
        validNodeNames,
        nodeName
      );
    },
  };
}

/**
 * Creates all GraphNodes from a v2 workflow configuration.
 *
 * @param config - The workflow configuration
 * @returns Record of GraphNode instances keyed by name
 */
export function createGraphNodes<
  TNodeNames extends string,
  TContext extends Record<string, unknown>
>(
  config: WorkflowConfig<TNodeNames, TContext>
): Record<string, WorkflowGraphNode<TContext>> {
  const nodeNames = config.nodes.map((n) => n.name);
  const validNodeNames = new Set([...nodeNames, 'END']);
  const nodes: Record<string, WorkflowGraphNode<TContext>> = {};

  for (const node of config.nodes) {
    nodes[node.name] = createGraphNode(node, validNodeNames);
  }

  return nodes;
}
