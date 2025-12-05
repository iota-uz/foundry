/**
 * CLI utilities for workflow execution
 *
 * Helper functions to bridge between workflow config and graph engine.
 */

import type {
  WorkflowConfig,
  WorkflowState,
  NodeDefinition,
  GraphNode,
  GraphContext,
} from '../lib/graph';
import { resolveTransition } from '../lib/graph';
import {
  AgentNodeRuntime,
  CommandNodeRuntime,
  ClaudeCodeNodeRuntime,
} from '../lib/graph/nodes';

/**
 * Creates a GraphNode from a NodeDefinition.
 *
 * This bridges the config-based node definition to the runtime GraphNode
 * interface expected by the GraphEngine.
 *
 * @param name - Node name
 * @param definition - Node definition from config
 * @param validNodeNames - Set of valid node names for transition validation
 * @returns A GraphNode instance
 */
export function createGraphNode<TContext extends Record<string, unknown>>(
  name: string,
  definition: NodeDefinition<TContext>,
  validNodeNames: Set<string>
): GraphNode<WorkflowState<TContext>> {
  // Create the underlying node runtime implementation
  let nodeRuntime: AgentNodeRuntime<TContext> | CommandNodeRuntime<TContext> | ClaudeCodeNodeRuntime<TContext>;

  switch (definition.type) {
    case 'agent': {
      nodeRuntime = new AgentNodeRuntime<TContext>({
        role: definition.role,
        system: definition.system,
        tools: definition.tools ?? [],
        next: definition.next,
      });
      break;
    }
    case 'command': {
      nodeRuntime = new CommandNodeRuntime<TContext>({
        command: definition.command,
        next: definition.next,
      });
      break;
    }
    case 'claude-code': {
      nodeRuntime = new ClaudeCodeNodeRuntime<TContext>({
        command: definition.command,
        args: definition.args,
        next: definition.next,
      });
      break;
    }
    default: {
      throw new Error(`Unknown node type: ${(definition as NodeDefinition).type}`);
    }
  }

  // Wrap in GraphNode interface
  return {
    name,
    async execute(
      state: WorkflowState<TContext>,
      context: GraphContext
    ): Promise<Partial<WorkflowState<TContext>>> {
      const result = await nodeRuntime.execute(state, context);
      return result.stateUpdate;
    },
    next(state: WorkflowState<TContext>): string {
      return resolveTransition(
        definition.next,
        state,
        validNodeNames,
        name
      );
    },
  };
}

/**
 * Creates all GraphNodes from a workflow configuration.
 *
 * @param config - The workflow configuration
 * @returns Record of GraphNode instances keyed by name
 */
export function createGraphNodes<TContext extends Record<string, unknown>>(
  config: WorkflowConfig<TContext>
): Record<string, GraphNode<WorkflowState<TContext>>> {
  const validNodeNames = new Set([...Object.keys(config.nodes), 'END']);
  const nodes: Record<string, GraphNode<WorkflowState<TContext>>> = {};

  for (const [name, definition] of Object.entries(config.nodes)) {
    nodes[name] = createGraphNode(name, definition, validNodeNames);
  }

  return nodes;
}
