/**
 * @sys/graph - Graph Execution Engine
 *
 * The FSM orchestrator that binds everything together.
 * Manages workflow execution, state transitions, and error handling.
 */

import type { BaseState, GraphNode, GraphContext, GraphEngineConfig, PortInputs } from './types';
import { WorkflowStatus, SpecialNode } from './enums';
import { StateManager } from './state-manager';
import { AgentWrapper } from './agent/wrapper';
import { createLogger } from './utils/logger';

// ============================================================================
// Port Data Flow Helpers
// ============================================================================

/**
 * Port mapping stored in context.__portMappings
 */
interface PortMapping {
  sourceNodeId: string;
  sourcePortId: string;
}

type PortMappings = Record<string, Record<string, PortMapping>>;
type PortData = Record<string, Record<string, unknown>>;

/**
 * Resolve port inputs for a node based on port mappings.
 *
 * @param nodeId - The node to resolve inputs for
 * @param context - The workflow context containing __portData and __portMappings
 * @returns Resolved port inputs (input port id -> value)
 */
function resolvePortInputs(
  nodeId: string,
  stateContext: Record<string, unknown>
): PortInputs {
  const portInputs: PortInputs = {};

  const portData = stateContext.__portData as PortData | undefined;
  const portMappings = stateContext.__portMappings as PortMappings | undefined;

  if (!portData || !portMappings) {
    return portInputs;
  }

  const nodeMappings = portMappings[nodeId];
  if (!nodeMappings) {
    return portInputs;
  }

  // For each input port mapping, resolve the value from source node's output
  for (const [inputPortId, mapping] of Object.entries(nodeMappings)) {
    const sourceNodeData = portData[mapping.sourceNodeId];
    if (sourceNodeData) {
      const value = sourceNodeData[mapping.sourcePortId];
      if (value !== undefined) {
        portInputs[inputPortId] = value;
      }
    }
  }

  return portInputs;
}

/**
 * Store port outputs for a node after execution.
 *
 * @param nodeId - The node that produced outputs
 * @param outputs - The port outputs to store
 * @param stateContext - The workflow context to update
 */
function storePortOutputs(
  nodeId: string,
  outputs: Record<string, unknown>,
  stateContext: Record<string, unknown>
): void {
  // Initialize port data if not present
  if (!stateContext.__portData) {
    stateContext.__portData = {};
  }

  const portData = stateContext.__portData as PortData;
  portData[nodeId] = outputs;
}

/**
 * Check if a node name is a terminal state (SpecialNode.End or SpecialNode.Error).
 */
function isTerminalNode(nodeName: string): boolean {
  return nodeName === SpecialNode.End || nodeName === SpecialNode.Error;
}

/**
 * Configuration for creating a GraphEngine instance.
 */
export interface GraphEngineOptions<TState extends BaseState> extends GraphEngineConfig {
  /** Directory where state files are stored */
  stateDir: string;

  /** Node definitions for the workflow graph */
  nodes: Record<string, GraphNode<TState>>;
}

/**
 * The Graph Execution Engine.
 *
 * This is the main orchestrator that:
 * 1. Loads/initializes workflow state
 * 2. Executes nodes in sequence according to FSM logic
 * 3. Persists state after each node (checkpoint)
 * 4. Handles errors and retries
 * 5. Terminates when reaching 'END' node
 */
export class GraphEngine<TState extends BaseState> {
  private stateManager: StateManager<TState>;
  private nodes: Record<string, GraphNode<TState>>;
  private config: GraphEngineConfig;

  constructor(options: GraphEngineOptions<TState>) {
    this.stateManager = new StateManager<TState>({
      stateDir: options.stateDir,
    });

    this.nodes = options.nodes;

    this.config = {
      apiKey: options.apiKey,
      model: options.model ?? 'claude-sonnet-4.5',
      maxRetries: options.maxRetries ?? 0,
    };
  }

  /**
   * Runs a workflow from start to finish (or resumes if state exists).
   *
   * This is the main entry point for workflow execution. It will:
   * - Resume from checkpoint if state exists
   * - Start fresh if no state exists
   * - Execute nodes in sequence
   * - Persist state after each node
   * - Handle errors and retries
   *
   * @param id - Unique workflow identifier
   * @param initialState - Initial state (used if no saved state exists)
   * @returns Final state after workflow completion
   */
  async run(id: string, initialState: TState): Promise<TState> {
    // Ensure state directory exists
    await this.stateManager.ensureStateDir();

    // 1. Load State (Resume) or Initialize
    let state = (await this.stateManager.load(id)) || initialState;

    const workflowLogger = createLogger({ workflowId: id });
    workflowLogger.info(`Starting workflow from node: ${state.currentNode}`);

    // 2. Setup Agent Wrapper
    const agentWrapper = new AgentWrapper({
      apiKey: this.config.apiKey,
      model: this.config.model,
    });

    // 3. The FSM Loop
    let retryCount = 0;

    while (!isTerminalNode(state.currentNode)) {
      const node = this.nodes[state.currentNode];

      if (!node) {
        const error = `Node '${state.currentNode}' not defined in graph`;
        workflowLogger.error(error);
        state.status = WorkflowStatus.Failed;
        await this.stateManager.save(id, state);
        throw new Error(error);
      }

      const nodeLogger = createLogger({ workflowId: id, node: node.name });
      nodeLogger.info(`Executing node: ${node.name}`);

      try {
        // Mark as running
        state.status = WorkflowStatus.Running;
        state.updatedAt = new Date().toISOString();
        await this.stateManager.save(id, state);

        // Resolve port inputs for this node
        const stateContext = (state.context ?? {}) as Record<string, unknown>;
        const portInputs = resolvePortInputs(node.name, stateContext);

        // EXECUTE
        const context: GraphContext = {
          agent: agentWrapper,
          logger: nodeLogger as Console,
          portInputs,
        };

        const updates = await node.execute(state, context);

        // Extract and store port outputs if present
        const { __portOutputs, ...restUpdates } = updates as Partial<TState> & {
          __portOutputs?: Record<string, unknown>;
        };
        if (__portOutputs) {
          storePortOutputs(node.name, __portOutputs, stateContext);
          // Update state.context with new port data
          if ('context' in state) {
            (state as unknown as { context: Record<string, unknown> }).context = stateContext;
          }
        }

        // MERGE & TRANSITION
        state = {
          ...state,
          ...restUpdates,
          updatedAt: new Date().toISOString(),
        } as TState;

        // Determine next node
        const nextNode = node.next(state);
        nodeLogger.info(`Transitioning to: ${nextNode}`);
        state.currentNode = nextNode;

        // Reset retry count on successful execution
        retryCount = 0;

        // PERSIST (Checkpoint)
        await this.stateManager.save(id, state);
      } catch (error) {
        nodeLogger.error(`Error in node ${state.currentNode}:`, error);

        // Check if we should retry
        if (this.config.maxRetries !== undefined && retryCount < this.config.maxRetries) {
          retryCount++;
          nodeLogger.warn(`Retrying node (attempt ${retryCount}/${this.config.maxRetries})`);
          continue;
        }

        // Max retries exceeded, mark as failed
        state.status = WorkflowStatus.Failed;
        state.updatedAt = new Date().toISOString();
        await this.stateManager.save(id, state);
        throw error;
      }
    }

    // Finalize based on terminal node type
    if (state.currentNode === SpecialNode.Error) {
      workflowLogger.error('Workflow terminated with error');
      state.status = WorkflowStatus.Failed;
    } else {
      workflowLogger.info('Workflow completed successfully');
      state.status = WorkflowStatus.Completed;
    }
    state.updatedAt = new Date().toISOString();
    await this.stateManager.save(id, state);

    return state;
  }

  /**
   * Gets the current state of a workflow without executing it.
   *
   * @param id - Unique workflow identifier
   * @returns Current state, or null if workflow doesn't exist
   */
  async getState(id: string): Promise<TState | null> {
    return this.stateManager.load(id);
  }

  /**
   * Deletes a workflow's state.
   *
   * @param id - Unique workflow identifier
   */
  async deleteWorkflow(id: string): Promise<void> {
    return this.stateManager.delete(id);
  }

  /**
   * Lists all workflow IDs.
   *
   * @returns Array of workflow IDs
   */
  async listWorkflows(): Promise<string[]> {
    return this.stateManager.list();
  }

  /**
   * Validates that all nodes in the graph are properly defined.
   *
   * This performs static validation to ensure each node has the required
   * execute and next functions. It should be called during engine
   * initialization to catch configuration errors early.
   *
   * LIMITATIONS:
   * - Cannot validate actual routing logic without running the workflow
   * - Cannot verify that node.next() returns valid node names since this
   *   depends on runtime state
   * - For runtime validation of node transitions, errors will be thrown
   *   during workflow execution if a node's next() returns an undefined node
   *
   * To validate routing logic, consider:
   * - Writing unit tests for your next() functions
   * - Using TypeScript string literal types to constrain node names
   * - Manually reviewing the state machine transitions
   */
  validateGraph(): void {
    const nodeNames = new Set(Object.keys(this.nodes));
    // Add special terminal nodes as valid targets
    nodeNames.add(SpecialNode.End);
    nodeNames.add(SpecialNode.Error);

    for (const [nodeName, node] of Object.entries(this.nodes)) {
      if (typeof node.execute !== 'function') {
        throw new Error(`Node '${nodeName}' does not have an execute function`);
      }

      if (typeof node.next !== 'function') {
        throw new Error(`Node '${nodeName}' does not have a next function`);
      }
    }
  }
}
