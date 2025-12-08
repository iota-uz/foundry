/**
 * CLI Utilities for sys/graph
 *
 * Provides helper functions for creating runtime nodes from workflow definitions.
 */

import type { BaseState, GraphNode, GraphContext, WorkflowState } from '../types';
import type { WorkflowConfig, NodeDef, Transition as SchemaTransition } from '../schema';
import { NodeType } from '../enums';
import {
  AgentNodeRuntime,
  CommandNodeRuntime,
  SlashCommandNodeRuntime,
  EvalNodeRuntime,
  DynamicAgentNodeRuntime,
  DynamicCommandNodeRuntime,
  type BaseNode,
  type NodeExecutionResult,
} from '../nodes';

/**
 * Adapter that wraps a BaseNode to conform to the GraphNode interface.
 * The GraphEngine expects GraphNode, but runtime nodes extend BaseNode.
 */
class NodeAdapter<TContext extends Record<string, unknown>>
  implements GraphNode<BaseState & { context: TContext }> {
  public readonly name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly runtime: BaseNode<TContext, any>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(name: string, runtime: BaseNode<TContext, any>) {
    this.name = name;
    this.runtime = runtime;
  }

  async execute(
    state: BaseState & { context: TContext },
    context: GraphContext
  ): Promise<Partial<BaseState & { context: TContext }>> {
    const result: NodeExecutionResult<TContext> = await this.runtime.execute(
      state as WorkflowState<TContext>,
      context
    );
    return result.stateUpdate as Partial<BaseState & { context: TContext }>;
  }

  next(state: BaseState & { context: TContext }): string {
    return this.runtime.resolveNext(state as WorkflowState<TContext>);
  }
}

/**
 * Creates runtime node instances from a workflow configuration.
 *
 * This function converts the declarative node definitions in a workflow
 * into executable runtime node instances that can be used by the GraphEngine.
 *
 * @param workflow - The workflow configuration
 * @returns A record mapping node names to runtime instances
 */
export function createNodeRuntimes<
  TNodeNames extends string,
  TContext extends Record<string, unknown>,
>(
  workflow: WorkflowConfig<TNodeNames, TContext>
): Record<string, GraphNode<BaseState & { context: TContext }>> {
  const nodes: Record<string, GraphNode<BaseState & { context: TContext }>> = {};

  for (const nodeDef of workflow.nodes) {
    const adapter = createNodeAdapter(nodeDef);
    nodes[nodeDef.name] = adapter;
  }

  return nodes;
}

/**
 * Converts a schema transition to a runtime transition.
 */
function toRuntimeTransition<TNodeNames extends string, TContext extends Record<string, unknown>>(
  transition: SchemaTransition<TNodeNames, TContext>
): string | ((state: WorkflowState<TContext>) => string) {
  if (typeof transition === 'function') {
    return (state: WorkflowState<TContext>) => transition(state);
  }
  return transition as string;
}

/**
 * Creates a NodeAdapter from a node definition.
 * Maps schema properties to runtime node config properties.
 */
function createNodeAdapter<
  TNodeNames extends string,
  TContext extends Record<string, unknown>,
>(
  nodeDef: NodeDef<TNodeNames, TContext>
): NodeAdapter<TContext> {
  const transition = toRuntimeTransition(nodeDef.then);

  switch (nodeDef.type) {
    case NodeType.Agent: {
      // Map schema properties to runtime properties:
      // schema.prompt -> runtime.system
      // schema.capabilities -> runtime.tools
      // Build config without undefined values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: any = {
        role: nodeDef.role,
        system: nodeDef.prompt, // Schema uses 'prompt', runtime uses 'system'
        next: transition,
      };
      if (nodeDef.capabilities !== undefined) config.tools = nodeDef.capabilities;
      if (nodeDef.maxTurns !== undefined) config.maxTurns = nodeDef.maxTurns;

      const runtime = new AgentNodeRuntime<TContext>(config);
      return new NodeAdapter(nodeDef.name, runtime);
    }

    case NodeType.Command: {
      // Build config without undefined values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: any = {
        command: nodeDef.command,
        next: transition,
      };
      if (nodeDef.cwd !== undefined) config.cwd = nodeDef.cwd;
      if (nodeDef.env !== undefined) config.env = nodeDef.env;
      if (nodeDef.timeout !== undefined) config.timeout = nodeDef.timeout;
      if (nodeDef.throwOnError !== undefined) config.throwOnError = nodeDef.throwOnError;

      const runtime = new CommandNodeRuntime<TContext>(config);
      return new NodeAdapter(nodeDef.name, runtime);
    }

    case NodeType.SlashCommand: {
      const runtime = new SlashCommandNodeRuntime<TContext>({
        command: nodeDef.command,
        args: nodeDef.args,
        next: transition,
      });
      return new NodeAdapter(nodeDef.name, runtime);
    }

    case NodeType.Eval: {
      const runtime = new EvalNodeRuntime<TContext>({
        fn: nodeDef.update,
        next: transition,
      });
      return new NodeAdapter(nodeDef.name, runtime);
    }

    case NodeType.DynamicAgent: {
      // Build config without undefined values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: any = {
        model: nodeDef.model,
        prompt: nodeDef.prompt,
        next: transition,
      };
      if (nodeDef.system !== undefined) config.system = nodeDef.system;
      if (nodeDef.capabilities !== undefined) config.tools = nodeDef.capabilities;
      if (nodeDef.maxTurns !== undefined) config.maxTurns = nodeDef.maxTurns;
      if (nodeDef.temperature !== undefined) config.temperature = nodeDef.temperature;

      const runtime = new DynamicAgentNodeRuntime<TContext>(config);
      return new NodeAdapter(nodeDef.name, runtime);
    }

    case NodeType.DynamicCommand: {
      // Build config without undefined values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: any = {
        command: nodeDef.command,
        next: transition,
      };
      if (nodeDef.cwd !== undefined) config.cwd = nodeDef.cwd;
      if (nodeDef.env !== undefined) config.env = nodeDef.env;
      if (nodeDef.timeout !== undefined) config.timeout = nodeDef.timeout;

      const runtime = new DynamicCommandNodeRuntime<TContext>(config);
      return new NodeAdapter(nodeDef.name, runtime);
    }

    default:
      throw new Error(`Unknown node type: ${(nodeDef as NodeDef<TNodeNames, TContext>).type}`);
  }
}

/**
 * Export for external use
 */
export { createNodeAdapter, NodeAdapter };
