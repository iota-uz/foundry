/**
 * Planning Execution Service
 *
 * Manages the execution of issue planning workflows with:
 * - Pause/resume support via waitingForInput flag
 * - SSE event broadcasting
 * - State persistence via IssueMetadataRepository
 */

import { GraphEngine } from '@/lib/graph/engine';
import { createNodeRuntimes } from '@/lib/graph/runtime-builders';
import { createInitialWorkflowState } from '@/lib/graph/schema';
import { WorkflowStatus, SpecialNode } from '@/lib/graph/enums';
import { issuePlanningWorkflow, type IssuePlanningContext } from '@/lib/graph/workflows/issue-planning.workflow';
import { broadcastExecutionEvent } from '@/lib/workflow-builder/execution-events';
import { AgentWrapper } from '@/lib/graph/agent/wrapper';
import * as IssueMetadataRepository from '@/lib/db/repositories/issue-metadata.repository';
import type { PlanContent, PlanningPhase, QuestionBatch, Answer, PlanArtifacts } from './types';
import type { BaseState } from '@/lib/graph/types';
import { createLogger } from '@/lib/logging';

const logger = createLogger({ module: 'planning' });

// ============================================================================
// Types
// ============================================================================

/**
 * Combined state type for planning workflow
 */
type PlanningState = BaseState & { context: IssuePlanningContext };

/**
 * Options for starting a planning session
 */
export interface StartPlanningOptions {
  /** Issue metadata ID (used for git credential resolution) */
  issueMetadataId: string;
  issueId: string;
  issueTitle: string;
  issueBody: string;
  preferences?: {
    diagramTypes?: Array<'architecture' | 'data_flow' | 'sequence' | 'entity_relationship'>;
    taskGranularity?: 'coarse' | 'medium' | 'fine';
  };
}

/**
 * Result of a planning execution step
 */
export interface PlanningExecutionResult {
  status: 'running' | 'paused' | 'completed' | 'failed';
  currentPhase: PlanningPhase;
  currentBatch?: QuestionBatch | undefined;
  waitingForInput: boolean;
  artifacts: PlanArtifacts;
  error?: string | undefined;
}

// ============================================================================
// Execution Service
// ============================================================================

/**
 * Runs the planning workflow for a single step (until pause or completion).
 *
 * This function:
 * 1. Creates runtime nodes from the workflow definition
 * 2. Executes nodes until waitingForInput is true or workflow completes
 * 3. Broadcasts SSE events for each node execution
 * 4. Persists state after each step
 */
export async function runPlanningStep(
  executionId: string,
  issueId: string,
  initialState?: PlanningState
): Promise<PlanningExecutionResult> {
  const stateDir = process.env.GRAPH_STATE_DIR || '/tmp/foundry-graph-state';
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Check for required API key
  if (!apiKey) {
    const error = 'ANTHROPIC_API_KEY is not set. Please configure it in your environment variables.';
    logger.error(error);

    // Broadcast failure immediately (use planning_failed for SSE compatibility)
    broadcastExecutionEvent(executionId, {
      type: 'planning_failed',
      error,
    });

    return {
      status: 'failed',
      currentPhase: initialState?.context?.currentPhase ?? 'requirements',
      waitingForInput: false,
      artifacts: initialState?.context?.artifacts ?? { diagrams: [], tasks: [], uiMockups: [], apiSpecs: [] },
      error,
    };
  }

  // Create runtime nodes from workflow
  const nodes = createNodeRuntimes(issuePlanningWorkflow);

  // Create engine
  const engine = new GraphEngine<PlanningState>({
    stateDir,
    apiKey,
    model: 'claude-sonnet-4-5-20250514',
    nodes: nodes as Record<string, import('@/lib/graph/types').GraphNode<PlanningState>>,
  });

  // Load or use initial state
  const state = initialState || await engine.getState(executionId);

  if (!state) {
    throw new Error('No state found for execution');
  }

  // Check if already paused (waiting for input)
  if (state.context.waitingForInput) {
    return {
      status: 'paused',
      currentPhase: state.context.currentPhase,
      currentBatch: state.context.questionBatches[state.context.currentBatchIndex],
      waitingForInput: true,
      artifacts: state.context.artifacts,
    };
  }

  // Broadcast start event
  broadcastExecutionEvent(executionId, {
    type: 'workflow_resumed',
    currentNodeId: state.currentNode,
    status: WorkflowStatus.Running,
    context: state.context as Record<string, unknown>,
  });

  try {
    // Run the engine - it will execute until completion or terminal node
    // We need to intercept and check for pause conditions
    const result = await runWithPauseDetection(engine, executionId, state, issueId);

    return result;
  } catch (error) {
    const err = error as Error;
    logger.error('Workflow execution failed', { error: err });

    // Broadcast failure (use planning_failed for SSE compatibility)
    broadcastExecutionEvent(executionId, {
      type: 'planning_failed',
      error: err.message,
    });

    return {
      status: 'failed',
      currentPhase: state.context.currentPhase,
      waitingForInput: false,
      artifacts: state.context.artifacts,
      error: err.message,
    };
  }
}

/**
 * Runs the workflow with pause detection.
 * Executes one node at a time and checks for pause conditions.
 */
async function runWithPauseDetection(
  engine: GraphEngine<PlanningState>,
  executionId: string,
  state: PlanningState,
  issueId: string
): Promise<PlanningExecutionResult> {
  const nodes = (engine as unknown as { nodes: Record<string, import('@/lib/graph/types').GraphNode<PlanningState>> }).nodes;

  // Execute nodes one at a time until pause or completion
  while (!isTerminalNode(state.currentNode)) {
    const node = nodes[state.currentNode];
    if (!node) {
      throw new Error(`Node '${state.currentNode}' not found`);
    }

    // Broadcast node start
    broadcastExecutionEvent(executionId, {
      type: 'node_started',
      nodeId: state.currentNode,
      status: WorkflowStatus.Running,
    });

    // Execute the node with executionId for activity streaming
    const context = createExecutionContext(executionId);
    const updates = await node.execute(state, context);

    // Merge updates
    state = {
      ...state,
      ...updates,
      updatedAt: new Date().toISOString(),
    } as PlanningState;

    // Determine next node
    const nextNode = node.next(state);
    state.currentNode = nextNode;

    // Broadcast node completion
    broadcastExecutionEvent(executionId, {
      type: 'node_completed',
      nodeId: node.name,
      currentNodeId: nextNode,
      context: {
        currentPhase: state.context.currentPhase,
        waitingForInput: state.context.waitingForInput,
        questionBatches: state.context.questionBatches,
      },
    });

    // Persist state
    await persistPlanningState(issueId, state);

    // Check for pause condition (waitingForInput)
    if (state.context.waitingForInput) {
      broadcastExecutionEvent(executionId, {
        type: 'workflow_paused',
        status: WorkflowStatus.Paused,
        context: {
          currentPhase: state.context.currentPhase,
          currentBatch: state.context.questionBatches[state.context.currentBatchIndex],
        },
      });

      return {
        status: 'paused',
        currentPhase: state.context.currentPhase,
        currentBatch: state.context.questionBatches[state.context.currentBatchIndex],
        waitingForInput: true,
        artifacts: state.context.artifacts,
      };
    }
  }

  // Workflow completed
  const finalStatus = state.currentNode === SpecialNode.Error ? 'failed' : 'completed';

  // Use planning-specific events for SSE compatibility
  if (finalStatus === 'completed') {
    broadcastExecutionEvent(executionId, {
      type: 'planning_completed',
      summary: state.context.artifacts,
    });
  } else {
    broadcastExecutionEvent(executionId, {
      type: 'planning_failed',
      error: 'Planning workflow failed',
    });
  }

  // Persist final state
  await persistPlanningState(issueId, state);

  return {
    status: finalStatus,
    currentPhase: state.context.currentPhase,
    waitingForInput: false,
    artifacts: state.context.artifacts,
  };
}

/**
 * Creates the initial state for a planning workflow.
 */
export function createPlanningInitialState(options: StartPlanningOptions): PlanningState {
  const baseState = createInitialWorkflowState(issuePlanningWorkflow);

  return {
    ...baseState,
    context: {
      ...baseState.context,
      issueMetadataId: options.issueMetadataId,
      issueId: options.issueId,
      issueTitle: options.issueTitle,
      issueBody: options.issueBody,
      preferences: options.preferences || {},
    },
  };
}

/**
 * Resumes a paused planning workflow with user answers.
 */
export async function resumePlanningWithAnswers(
  executionId: string,
  issueId: string,
  answers: Record<string, Answer>
): Promise<PlanningExecutionResult> {
  // Load current state from database
  const issue = await IssueMetadataRepository.getIssueMetadata(issueId);
  if (!issue?.planContent) {
    throw new Error('No planning session found');
  }

  const planContent = issue.planContent as unknown as PlanContent;

  // Create state from planContent
  const state: PlanningState = {
    currentNode: getResumeNode(planContent.currentPhase),
    status: WorkflowStatus.Running,
    updatedAt: new Date().toISOString(),
    conversationHistory: [],
    context: {
      issueMetadataId: issueId,
      issueId,
      issueTitle: '', // Will be loaded from existing state
      issueBody: '',
      preferences: {},
      currentPhase: planContent.currentPhase,
      questionBatches: planContent.questionBatches,
      currentBatchIndex: planContent.currentBatchIndex,
      answers: { ...planContent.answers, ...answers },
      waitingForInput: false, // Clear the pause flag
      phaseComplete: false,
      allPhasesComplete: false,
      artifacts: planContent.artifacts,
    },
  };

  // Run the next step
  return runPlanningStep(executionId, issueId, state);
}

/**
 * Gets the node to resume from based on current phase.
 */
function getResumeNode(phase: PlanningPhase): string {
  switch (phase) {
    case 'requirements':
      return 'PROCESS_REQ_ANSWERS';
    case 'clarify':
      return 'PROCESS_CLARIFY_ANSWERS';
    case 'technical':
      return 'PROCESS_TECH_ANSWERS';
    default:
      return 'START_REQUIREMENTS';
  }
}

/**
 * Persists planning state to the database.
 */
async function persistPlanningState(issueId: string, state: PlanningState): Promise<void> {
  const planContent: PlanContent = {
    sessionId: issueId, // Using issueId as sessionId for simplicity
    status: mapWorkflowStatus(state.status, state.context.allPhasesComplete),
    currentPhase: state.context.currentPhase,
    questionBatches: state.context.questionBatches,
    currentBatchIndex: state.context.currentBatchIndex,
    answers: state.context.answers,
    artifacts: state.context.artifacts,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    completedAt: state.context.allPhasesComplete ? new Date().toISOString() : null,
  };

  await IssueMetadataRepository.updatePlanContent(issueId, planContent as unknown as Record<string, unknown>);
}

/**
 * Maps workflow status to plan status.
 */
function mapWorkflowStatus(status: WorkflowStatus, allComplete: boolean): PlanContent['status'] {
  if (allComplete) return 'completed';
  if (status === WorkflowStatus.Failed) return 'failed';
  return 'requirements'; // Default to requirements, actual phase is tracked separately
}

/**
 * Checks if a node is terminal.
 */
function isTerminalNode(nodeName: string): boolean {
  return nodeName === SpecialNode.End || nodeName === SpecialNode.Error;
}

/**
 * Creates a minimal execution context for node execution.
 *
 * @param executionId - Optional execution ID for streaming activity events
 */
function createExecutionContext(executionId?: string): import('@/lib/graph/types').GraphContext {
  return {
    agent: new AgentWrapper({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-sonnet-4-5-20250514',
    }),
    logger: console,
    portInputs: {},
    executionId,
  };
}
