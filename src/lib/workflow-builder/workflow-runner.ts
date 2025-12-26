/**
 * Workflow Runner
 *
 * Executes workflows from the visual builder using the GraphEngine.
 * Integrates with database state and SSE broadcasting.
 */

import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData } from '@/store/workflow-builder.store';
import type { NodeExecutionState } from '@/lib/db/schema/workflow-executions';
import type { StoredMessage } from '@/lib/graph/types';
import { toWorkflowConfig } from './schema-converter';
import { broadcastExecutionEvent } from './execution-events';
import { updateExecution, addLog } from '@/lib/db/repositories/workflow.repository';
import { createNodeRuntimes } from '@/lib/graph/cli/utils';
import { createInitialWorkflowState, WorkflowStatus, SpecialNode } from '@/lib/graph';
import type { BaseState, GraphContext, GraphNode } from '@/lib/graph/types';
import { AgentWrapper } from '@/lib/graph/agent/wrapper';

interface RunWorkflowOptions {
  executionId: string;
  workflowId: string;
  workflowName: string;
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  initialContext: Record<string, unknown>;
}

interface ExecutionLogger {
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
  debug: (message: string, metadata?: Record<string, unknown>) => void;
}

/**
 * Creates a logger that saves to database and broadcasts via SSE
 */
function createExecutionLogger(
  executionId: string,
  currentNodeId?: string
): ExecutionLogger {
  const log = (
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: Record<string, unknown>
  ) => {
    const timestamp = new Date().toISOString();

    // Save to database (fire and forget to avoid blocking)
    addLog({
      executionId,
      nodeId: currentNodeId ?? null,
      level,
      message,
      metadata: metadata ?? null,
    }).catch(err => console.error('Failed to save log:', err));

    // Broadcast via SSE
    broadcastExecutionEvent(executionId, {
      type: 'log',
      log: {
        timestamp,
        level,
        message,
        ...((currentNodeId !== undefined && currentNodeId !== null && currentNodeId !== '') && { nodeId: currentNodeId }),
        ...((metadata !== undefined && metadata !== null) && { metadata }),
      },
    });
  };

  return {
    info: (message, metadata) => log('info', message, metadata),
    warn: (message, metadata) => log('warn', message, metadata),
    error: (message, metadata) => log('error', message, metadata),
    debug: (message, metadata) => log('debug', message, metadata),
  };
}

/**
 * Check if a node name is a terminal state
 */
function isTerminalNode(nodeName: string): boolean {
  return nodeName === SpecialNode.End || nodeName === SpecialNode.Error;
}

/**
 * Run a workflow from the visual builder
 *
 * This function:
 * 1. Converts React Flow to GraphEngine config
 * 2. Creates executable node runtimes
 * 3. Runs nodes in sequence, updating database and broadcasting SSE
 * 4. Returns final state
 */
export async function runWorkflow(options: RunWorkflowOptions): Promise<void> {
  const { executionId, workflowId, workflowName, nodes, edges, initialContext } = options;
  const logger = createExecutionLogger(executionId);

  logger.info(`Starting workflow: ${workflowName}`);

  try {
    // 1. Convert React Flow to GraphEngine config
    const conversionResult = toWorkflowConfig(nodes, edges, {
      id: workflowId,
      name: workflowName,
      initialContext,
    });

    if (!conversionResult.success || !conversionResult.workflow) {
      const errorMessage = conversionResult.errors.map(e => e.message).join(', ');
      logger.error(`Conversion failed: ${errorMessage}`);

      await updateExecution(executionId, {
        status: WorkflowStatus.Failed,
        lastError: errorMessage,
        completedAt: new Date(),
      });

      broadcastExecutionEvent(executionId, {
        type: 'workflow_failed',
        status: WorkflowStatus.Failed,
      });

      return;
    }

    const workflowConfig = conversionResult.workflow.config;

    // 2. Create node runtimes
    const graphNodes = createNodeRuntimes(workflowConfig);

    // 3. Setup agent wrapper
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey === undefined || apiKey === null || apiKey === '') {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    const agentWrapper = new AgentWrapper({
      apiKey,
      model: 'claude-sonnet-4-20250514',
    });

    // 4. Create initial state
    const baseState = createInitialWorkflowState(workflowConfig);
    let currentState: BaseState & { context: Record<string, unknown> } = {
      currentNode: baseState.currentNode,
      status: baseState.status,
      updatedAt: baseState.updatedAt,
      conversationHistory: baseState.conversationHistory as StoredMessage[],
      context: {
        ...baseState.context,
        ...initialContext,
      },
    };

    const nodeStates: Record<string, NodeExecutionState> = {};

    // 5. Execute nodes in sequence
    while (!isTerminalNode(currentState.currentNode)) {
      const nodeName = currentState.currentNode;
      const node = graphNodes[nodeName] as GraphNode<BaseState & { context: Record<string, unknown> }> | undefined;

      if (!node) {
        const error = `Node '${nodeName}' not found in graph`;
        logger.error(error);

        await updateExecution(executionId, {
          status: WorkflowStatus.Failed,
          lastError: error,
          completedAt: new Date(),
        });

        broadcastExecutionEvent(executionId, {
          type: 'workflow_failed',
          status: WorkflowStatus.Failed,
        });

        return;
      }

      // Mark node as running
      const startedAt = new Date().toISOString();
      nodeStates[nodeName] = {
        nodeId: nodeName,
        status: 'running',
        startedAt,
      };

      broadcastExecutionEvent(executionId, {
        type: 'node_started',
        nodeId: nodeName,
        currentNodeId: nodeName,
        nodeState: { status: 'running' },
      });

      await updateExecution(executionId, {
        currentNode: nodeName,
        nodeStates,
      });

      const nodeLogger = createExecutionLogger(executionId, nodeName);
      nodeLogger.info(`Executing node: ${nodeName}`);

      try {
        // Execute the node
        const context: GraphContext = {
          agent: agentWrapper,
          logger: nodeLogger as unknown as Console,
        };

        const updates = await node.execute(currentState, context);

        // Merge updates
        currentState = {
          ...currentState,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        // Determine next node
        const nextNode = node.next(currentState);

        // Mark node as completed
        const completedAt = new Date().toISOString();
        nodeStates[nodeName] = {
          nodeId: nodeName,
          status: 'completed',
          startedAt,
          completedAt,
          result: updates.context,
        };

        broadcastExecutionEvent(executionId, {
          type: 'node_completed',
          nodeId: nodeName,
          nodeState: { status: 'completed', output: updates.context },
          context: currentState.context,
        });

        nodeLogger.info(`Node completed, transitioning to: ${nextNode}`);

        currentState.currentNode = nextNode;

        // Update database
        await updateExecution(executionId, {
          currentNode: nextNode,
          context: currentState.context,
          nodeStates,
          conversationHistory: currentState.conversationHistory,
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        nodeLogger.error(`Node failed: ${errorMessage}`);

        const completedAt = new Date().toISOString();
        nodeStates[nodeName] = {
          nodeId: nodeName,
          status: 'failed',
          startedAt,
          completedAt,
          error: errorMessage,
        };

        broadcastExecutionEvent(executionId, {
          type: 'node_failed',
          nodeId: nodeName,
          nodeState: { status: 'failed', error: errorMessage },
        });

        await updateExecution(executionId, {
          status: WorkflowStatus.Failed,
          lastError: errorMessage,
          nodeStates,
          completedAt: new Date(),
        });

        broadcastExecutionEvent(executionId, {
          type: 'workflow_failed',
          status: WorkflowStatus.Failed,
        });

        return;
      }
    }

    // 6. Finalize
    const finalStatus = currentState.currentNode === SpecialNode.Error
      ? WorkflowStatus.Failed
      : WorkflowStatus.Completed;

    logger.info(`Workflow ${finalStatus === WorkflowStatus.Completed ? 'completed' : 'failed'}`);

    await updateExecution(executionId, {
      status: finalStatus,
      currentNode: currentState.currentNode,
      context: currentState.context,
      nodeStates,
      completedAt: new Date(),
    });

    broadcastExecutionEvent(executionId, {
      type: finalStatus === WorkflowStatus.Completed ? 'workflow_completed' : 'workflow_failed',
      status: finalStatus,
      context: currentState.context,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Workflow execution failed: ${errorMessage}`);

    await updateExecution(executionId, {
      status: WorkflowStatus.Failed,
      lastError: errorMessage,
      completedAt: new Date(),
    });

    broadcastExecutionEvent(executionId, {
      type: 'workflow_failed',
      status: WorkflowStatus.Failed,
    });
  }
}
