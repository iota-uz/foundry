/**
 * @sys/graph - Graph Execution Engine
 *
 * The FSM orchestrator that binds everything together.
 * Manages workflow execution, state transitions, and error handling.
 */

import type { BaseState, GraphNode, GraphContext, GraphEngineConfig } from './types';
import { StateManager } from './state-manager';
import { AgentWrapper } from './agent/wrapper';
import { createLogger } from './utils/logger';

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
      model: options.model || 'claude-3-5-sonnet-20241022',
      maxRetries: options.maxRetries || 0,
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

    while (state.currentNode !== 'END') {
      const node = this.nodes[state.currentNode];

      if (!node) {
        const error = `Node '${state.currentNode}' not defined in graph`;
        workflowLogger.error(error);
        state.status = 'failed';
        await this.stateManager.save(id, state);
        throw new Error(error);
      }

      const nodeLogger = createLogger({ workflowId: id, node: node.name });
      nodeLogger.info(`Executing node: ${node.name}`);

      try {
        // Mark as running
        state.status = 'running';
        state.updatedAt = new Date().toISOString();
        await this.stateManager.save(id, state);

        // EXECUTE
        const context: GraphContext = {
          agent: agentWrapper,
          logger: nodeLogger as Console,
        };

        const updates = await node.execute(state, context);

        // MERGE & TRANSITION
        state = {
          ...state,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

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
        state.status = 'failed';
        state.updatedAt = new Date().toISOString();
        await this.stateManager.save(id, state);
        throw error;
      }
    }

    // Finalize
    workflowLogger.info('Workflow completed successfully');
    state.status = 'completed';
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
    nodeNames.add('END'); // END is a special terminal node

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
