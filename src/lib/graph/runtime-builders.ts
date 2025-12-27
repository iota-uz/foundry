/**
 * Runtime Builders for sys/graph
 *
 * Provides helper functions for creating runtime nodes from workflow definitions.
 */

import type { BaseState, GraphNode, GraphContext, WorkflowState } from './types';
import type { WorkflowConfig, NodeDef, Transition as SchemaTransition } from './schema';
import { NodeType } from './enums';
import {
  AgentNodeRuntime,
  CommandNodeRuntime,
  SlashCommandNodeRuntime,
  EvalNodeRuntime,
  DynamicAgentNodeRuntime,
  DynamicCommandNodeRuntime,
  GitCheckoutNodeRuntime,
  type BaseNode,
  type NodeExecutionResult,
  type BaseNodeConfig,
} from './nodes';
import type {
  AgentNodeConfig as AgentRuntimeConfig,
  CommandNodeConfig as CommandRuntimeConfig,
  SlashCommandNodeConfig as SlashCommandRuntimeConfig,
  EvalNodeConfig as EvalRuntimeConfig,
  DynamicAgentNodeConfig as DynamicAgentRuntimeConfig,
  DynamicCommandNodeConfig as DynamicCommandRuntimeConfig,
  GitCheckoutNodeConfig as GitCheckoutRuntimeConfig,
} from './nodes';

/**
 * Adapter that wraps a BaseNode to conform to the GraphNode interface.
 * The GraphEngine expects GraphNode, but runtime nodes extend BaseNode.
 *
 * Note: Uses BaseNodeConfig<TContext> as the config type parameter because
 * the adapter needs to hold different node types (Agent, Command, Eval, etc.)
 * which each have different config shapes. This is a legitimate use of a
 * base type to enable polymorphism across node types.
 */
class NodeAdapter<TContext extends Record<string, unknown>>
  implements GraphNode<BaseState & { context: TContext }> {
  public readonly name: string;
  private readonly runtime: BaseNode<TContext, BaseNodeConfig<TContext>>;

  constructor(name: string, runtime: BaseNode<TContext, BaseNodeConfig<TContext>>) {
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
 * Since transitions are now always functions, this just wraps to ensure consistent return type.
 */
function toRuntimeTransition<TNodeNames extends string, TContext extends Record<string, unknown>>(
  transition: SchemaTransition<TNodeNames, TContext>
): (state: WorkflowState<TContext>) => string {
  // Transition is always a function now
  return (state: WorkflowState<TContext>) => transition(state);
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
      const config: AgentRuntimeConfig<TContext> = {
        role: nodeDef.role,
        system: nodeDef.prompt, // Schema uses 'prompt', runtime uses 'system'
        next: transition,
        ...(nodeDef.capabilities !== undefined && { tools: nodeDef.capabilities }),
        ...(nodeDef.maxTurns !== undefined && { maxTurns: nodeDef.maxTurns }),
      };

      const runtime = new AgentNodeRuntime<TContext>(config);
      return new NodeAdapter(nodeDef.name, runtime);
    }

    case NodeType.Command: {
      const config: CommandRuntimeConfig<TContext> = {
        command: nodeDef.command,
        next: transition,
        ...(nodeDef.cwd !== undefined && { cwd: nodeDef.cwd }),
        ...(nodeDef.env !== undefined && { env: nodeDef.env }),
        ...(nodeDef.timeout !== undefined && { timeout: nodeDef.timeout }),
        ...(nodeDef.throwOnError !== undefined && { throwOnError: nodeDef.throwOnError }),
      };

      const runtime = new CommandNodeRuntime<TContext>(config);
      return new NodeAdapter(nodeDef.name, runtime);
    }

    case NodeType.SlashCommand: {
      const config: SlashCommandRuntimeConfig<TContext> = {
        command: nodeDef.command,
        args: nodeDef.args,
        next: transition,
      };

      const runtime = new SlashCommandNodeRuntime<TContext>(config);
      return new NodeAdapter(nodeDef.name, runtime);
    }

    case NodeType.Eval: {
      const config: EvalRuntimeConfig<TContext> = {
        fn: nodeDef.update,
        next: transition,
      };

      const runtime = new EvalNodeRuntime<TContext>(config);
      return new NodeAdapter(nodeDef.name, runtime);
    }

    case NodeType.DynamicAgent: {
      // Map schema.capabilities -> runtime.tools
      const config: DynamicAgentRuntimeConfig<TContext> = {
        model: nodeDef.model,
        prompt: nodeDef.prompt,
        next: transition,
        ...(nodeDef.system !== undefined && { system: nodeDef.system }),
        ...(nodeDef.capabilities !== undefined && { tools: nodeDef.capabilities }),
        ...(nodeDef.maxTurns !== undefined && { maxTurns: nodeDef.maxTurns }),
        ...(nodeDef.temperature !== undefined && { temperature: nodeDef.temperature }),
      };

      const runtime = new DynamicAgentNodeRuntime<TContext>(config);
      return new NodeAdapter(nodeDef.name, runtime);
    }

    case NodeType.DynamicCommand: {
      const config: DynamicCommandRuntimeConfig<TContext> = {
        command: nodeDef.command,
        next: transition,
        ...(nodeDef.cwd !== undefined && { cwd: nodeDef.cwd }),
        ...(nodeDef.env !== undefined && { env: nodeDef.env }),
        ...(nodeDef.timeout !== undefined && { timeout: nodeDef.timeout }),
      };

      const runtime = new DynamicCommandNodeRuntime<TContext>(config);
      return new NodeAdapter(nodeDef.name, runtime);
    }

    case NodeType.GitCheckout: {
      const config: GitCheckoutRuntimeConfig<TContext> = {
        next: transition,
        ...(nodeDef.useIssueContext !== undefined && { useIssueContext: nodeDef.useIssueContext }),
        ...(nodeDef.owner !== undefined && { owner: nodeDef.owner }),
        ...(nodeDef.repo !== undefined && { repo: nodeDef.repo }),
        ...(nodeDef.ref !== undefined && { ref: nodeDef.ref }),
        ...(nodeDef.depth !== undefined && { depth: nodeDef.depth }),
        ...(nodeDef.skipIfExists !== undefined && { skipIfExists: nodeDef.skipIfExists }),
      };

      const runtime = new GitCheckoutNodeRuntime<TContext>(config);
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
