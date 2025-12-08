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
} from '../lib/graph';
import { resolveTransition, NodeType, StdlibTool } from '../lib/graph';
import {
  AgentNodeRuntime,
  CommandNodeRuntime,
  SlashCommandNodeRuntime,
  EvalNodeRuntime,
  DynamicAgentNodeRuntime,
  DynamicCommandNodeRuntime,
} from '../lib/graph/nodes';

/**
 * Generic state type that works with both BaseState and WorkflowState.
 * Uses any[] for conversationHistory for compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyState<TContext extends Record<string, unknown>> = BaseState & {
  context: TContext;
};

/**
 * Generic graph node interface for workflow execution.
 */
interface WorkflowGraphNode<TContext extends Record<string, unknown>> {
  name: string;
  execute(
    state: AnyState<TContext>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: any
  ): Promise<Partial<AnyState<TContext>>>;
  next(state: AnyState<TContext>): string;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nodeRuntime: any;

  switch (node.type) {
    case NodeType.Agent: {
      const agentNode = node;
      // Convert StdlibTool enums to string tool references
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tools = (agentNode.capabilities ?? []).map((t: any) => {
        if (typeof t === 'string') return t;
        if (Object.values(StdlibTool).includes(t)) return t;
        return t; // Inline tool
      });
      nodeRuntime = new AgentNodeRuntime<TContext>({
        role: agentNode.role,
        system: agentNode.prompt,
        tools,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        next: agentNode.then as any,
      });
      break;
    }
    case NodeType.Command: {
      const cmdNode = node;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cmdConfig: any = {
        command: cmdNode.command,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        next: cmdNode.then as any,
      };
      if (cmdNode.cwd) cmdConfig.cwd = cmdNode.cwd;
      if (cmdNode.env) cmdConfig.env = cmdNode.env;
      if (cmdNode.timeout) cmdConfig.timeout = cmdNode.timeout;
      if (cmdNode.throwOnError !== undefined) cmdConfig.throwOnError = cmdNode.throwOnError;
      nodeRuntime = new CommandNodeRuntime<TContext>(cmdConfig);
      break;
    }
    case NodeType.SlashCommand: {
      const slashNode = node;
      nodeRuntime = new SlashCommandNodeRuntime<TContext>({
        command: slashNode.command,
        args: slashNode.args,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        next: slashNode.then as any,
      });
      break;
    }
    case NodeType.Eval: {
      const evalNode = node;
      nodeRuntime = new EvalNodeRuntime<TContext>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fn: evalNode.update as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        next: evalNode.then as any,
      });
      break;
    }
    case NodeType.DynamicAgent: {
      const dynAgentNode = node;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dynAgentConfig: any = {
        model: dynAgentNode.model,
        prompt: dynAgentNode.prompt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        next: dynAgentNode.then as any,
      };
      if (dynAgentNode.system) dynAgentConfig.system = dynAgentNode.system;
      if (dynAgentNode.capabilities) dynAgentConfig.tools = dynAgentNode.capabilities;
      if (dynAgentNode.maxTurns) dynAgentConfig.maxTurns = dynAgentNode.maxTurns;
      if (dynAgentNode.temperature) dynAgentConfig.temperature = dynAgentNode.temperature;
      nodeRuntime = new DynamicAgentNodeRuntime<TContext>(dynAgentConfig);
      break;
    }
    case NodeType.DynamicCommand: {
      const dynCmdNode = node;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dynCmdConfig: any = {
        command: dynCmdNode.command,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        next: dynCmdNode.then as any,
      };
      if (dynCmdNode.cwd) dynCmdConfig.cwd = dynCmdNode.cwd;
      if (dynCmdNode.env) dynCmdConfig.env = dynCmdNode.env;
      if (dynCmdNode.timeout) dynCmdConfig.timeout = dynCmdNode.timeout;
      nodeRuntime = new DynamicCommandNodeRuntime<TContext>(dynCmdConfig);
      break;
    }
    default: {
      const exhaustiveCheck: never = node;
      throw new Error(`Unknown node type: ${(exhaustiveCheck as { type: string }).type}`);
    }
  }

  const nodeName = node.name;

  // Wrap in GraphNode interface
  return {
    name: nodeName,
    async execute(
      state: AnyState<TContext>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: any
    ): Promise<Partial<AnyState<TContext>>> {
      const result = await nodeRuntime.execute(state, context);
      return result.stateUpdate;
    },
    next(state: AnyState<TContext>): string {
      return resolveTransition(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node.then as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state as WorkflowState<TContext>,
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
