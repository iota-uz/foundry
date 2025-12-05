/**
 * WorkflowEngine - Core workflow execution engine
 */

import { EventEmitter } from 'events';
import type {
  WorkflowDefinition,
  WorkflowId,
  WorkflowResult,
} from '@/types/workflow/workflow';
import type { WorkflowState, WorkflowContext } from '@/types/workflow/state';
import type {
  StepDefinition,
  StepResult,
  StepExecution,
  CodeStep,
  LLMStep,
  QuestionStep,
  ConditionalStep,
  LoopStep,
  NestedWorkflowStep,
} from '@/types/workflow/step';
import { getCheckpointService } from './checkpoint.service';
import { getConstitutionService } from '@/services/support/constitution.service';
import {
  executeCodeStep,
  executeLLMStep,
  executeQuestionStep,
  executeConditionalStep,
  executeLoopStep,
  executeNestedWorkflowStep,
  submitAnswer,
  skipQuestion,
} from './handlers';
import { workflowRegistry } from './workflows';

/**
 * WorkflowEngine events for SSE streaming
 */
export interface WorkflowEngineEvents {
  'step:start': { sessionId: string; stepId: string; stepType: string };
  'step:complete': { sessionId: string; stepId: string; result: StepResult };
  'step:error': { sessionId: string; stepId: string; error: string };
  'workflow:pause': { sessionId: string };
  'workflow:resume': { sessionId: string };
  'workflow:complete': { sessionId: string; result: WorkflowResult };
  'workflow:error': { sessionId: string; error: string };
}

/**
 * WorkflowEngine - Executes workflows with checkpoint/resume support
 */
export class WorkflowEngine {
  private checkpointService = getCheckpointService();
  private constitutionService = getConstitutionService();
  private events = new EventEmitter();
  private workflows = new Map<WorkflowId, WorkflowDefinition>();
  private pausedSessions = new Set<string>();

  /**
   * Constructor - Auto-register all workflows from registry
   */
  constructor() {
    // Register all workflows from the registry
    Object.values(workflowRegistry).forEach((workflow) => {
      this.registerWorkflow(workflow);
    });
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Execute a workflow from the beginning or resume from checkpoint
   */
  async execute(
    workflowId: WorkflowId,
    sessionId: string,
    initialContext?: Partial<WorkflowContext>
  ): Promise<WorkflowResult> {
    try {
      // Load workflow definition
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Check for existing checkpoint
      let context: WorkflowContext;
      const existingCheckpoint = await this.checkpointService.load(sessionId);

      if (existingCheckpoint) {
        // Resume from checkpoint
        const constitution = await this.loadConstitution(
          existingCheckpoint.projectId
        );
        context = this.checkpointService.restoreContext(
          existingCheckpoint,
          constitution
        );
      } else {
        // Start fresh
        context = await this.initializeContext(
          workflowId,
          sessionId,
          initialContext
        );
      }

      // Execute workflow steps
      const result = await this.executeWorkflow(workflow, context);

      // Emit completion event
      this.events.emit('workflow:complete', {
        sessionId,
        result,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Workflow execution failed';

      // Emit error event
      this.events.emit('workflow:error', {
        sessionId,
        error: errorMessage,
      });

      // Update checkpoint with error
      await this.checkpointService.updateStatus(sessionId, 'failed', errorMessage);

      return {
        sessionId,
        workflowId,
        status: 'failed',
        data: {},
        error: errorMessage,
        duration: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Pause workflow execution
   */
  async pause(sessionId: string): Promise<void> {
    this.pausedSessions.add(sessionId);
    await this.checkpointService.updateStatus(sessionId, 'paused');
    this.events.emit('workflow:pause', { sessionId });
  }

  /**
   * Resume paused workflow
   */
  async resume(sessionId: string): Promise<WorkflowResult> {
    this.pausedSessions.delete(sessionId);
    this.events.emit('workflow:resume', { sessionId });

    // Load checkpoint
    const checkpoint = await this.checkpointService.load(sessionId);
    if (!checkpoint) {
      throw new Error('No checkpoint found to resume');
    }

    // Continue execution
    return this.execute(checkpoint.workflowId, sessionId);
  }

  /**
   * Cancel workflow execution
   */
  async cancel(sessionId: string): Promise<void> {
    this.pausedSessions.add(sessionId);
    await this.checkpointService.updateStatus(sessionId, 'failed', 'Cancelled by user');
    await this.checkpointService.delete(sessionId);
  }

  /**
   * Submit answer to current question
   */
  submitAnswer(sessionId: string, questionId: string, answer: string | string[] | number | boolean): void {
    submitAnswer(sessionId, questionId, answer);
  }

  /**
   * Skip current question
   */
  skipQuestion(sessionId: string, questionId: string): void {
    skipQuestion(sessionId, questionId);
  }

  /**
   * Get current workflow state
   */
  async getState(sessionId: string): Promise<WorkflowState | null> {
    return await this.checkpointService.load(sessionId);
  }

  /**
   * Retry failed step
   */
  async retryStep(sessionId: string, stepId: string): Promise<WorkflowResult> {
    const checkpoint = await this.checkpointService.load(sessionId);
    if (!checkpoint) {
      throw new Error('No checkpoint found');
    }

    // Update current step to the failed step
    checkpoint.currentStepId = stepId;
    checkpoint.retryCount = (checkpoint.retryCount || 0) + 1;
    checkpoint.lastError = null;

    await this.checkpointService.save(checkpoint);

    // Resume execution
    return this.resume(sessionId);
  }

  /**
   * Subscribe to workflow events
   */
  on<K extends keyof WorkflowEngineEvents>(
    event: K,
    listener: (data: WorkflowEngineEvents[K]) => void
  ): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from workflow events
   */
  off<K extends keyof WorkflowEngineEvents>(
    event: K,
    listener: (data: WorkflowEngineEvents[K]) => void
  ): void {
    this.events.off(event, listener);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Initialize workflow context
   */
  private async initializeContext(
    workflowId: WorkflowId,
    sessionId: string,
    initialContext?: Partial<WorkflowContext>
  ): Promise<WorkflowContext> {
    const projectId = initialContext?.projectId || sessionId;
    const constitution = await this.loadConstitution(projectId);

    const state: WorkflowState = {
      sessionId,
      projectId,
      workflowId,
      currentStepId: '',
      status: 'running',
      currentTopicIndex: 0,
      currentQuestionIndex: 0,
      topicQuestionCounts: {},
      answers: {},
      skippedQuestions: [],
      data: initialContext?.state?.data || {},
      clarifyState: null,
      stepHistory: [],
      checkpoint: '',
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      pausedAt: null,
      completedAt: null,
      lastError: null,
      retryCount: 0,
    };

    return {
      sessionId,
      projectId,
      workflowId,
      state,
      constitution,
    };
  }

  /**
   * Load project constitution
   */
  private async loadConstitution(projectId: string): Promise<Record<string, unknown> | null> {
    try {
      const constitution = await this.constitutionService.getConstitution(projectId);
      return constitution as unknown as Record<string, unknown> | null;
    } catch {
      return null;
    }
  }

  /**
   * Execute workflow steps sequentially
   */
  private async executeWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    const startTime = Date.now();

    try {
      // Find starting step
      let currentStepIndex = 0;
      if (context.state.currentStepId) {
        currentStepIndex = workflow.steps.findIndex(
          (s) => s.id === context.state.currentStepId
        );
        if (currentStepIndex === -1) {
          currentStepIndex = 0;
        }
      }

      // Execute steps
      for (let i = currentStepIndex; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        if (!step) continue;

        // Check if paused
        if (this.pausedSessions.has(context.sessionId)) {
          await this.checkpointService.save(context.state);
          break;
        }

        // Execute step
        const result = await this.executeStep(step, context);

        // Record step execution
        await this.recordStepExecution(context.sessionId, step, result);

        // Update context with step output
        if (result.output) {
          context.state.data = {
            ...context.state.data,
            ...result.output,
          };
        }

        // Update current step
        context.state.currentStepId = step.id;
        context.state.lastActivityAt = new Date().toISOString();

        // Checkpoint after each step
        await this.checkpointService.save(context.state);

        // Handle failure
        if (result.status === 'failed') {
          context.state.lastError = result.error || 'Step execution failed';
          await this.checkpointService.save(context.state);
          throw new Error(result.error || 'Step execution failed');
        }
      }

      // Mark as completed
      context.state.status = 'completed';
      context.state.completedAt = new Date().toISOString();
      await this.checkpointService.save(context.state);

      const duration = Date.now() - startTime;

      return {
        sessionId: context.sessionId,
        workflowId: context.workflowId,
        status: 'completed',
        data: context.state.data,
        duration,
        startedAt: context.state.startedAt,
        completedAt: context.state.completedAt!,
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      return {
        sessionId: context.sessionId,
        workflowId: context.workflowId,
        status: 'failed',
        data: context.state.data,
        error: error instanceof Error ? error.message : 'Workflow execution failed',
        duration,
        startedAt: context.state.startedAt,
        completedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute a single step based on type
   */
  private async executeStep(
    step: StepDefinition,
    context: WorkflowContext
  ): Promise<StepResult> {
    // Emit step start event
    this.events.emit('step:start', {
      sessionId: context.sessionId,
      stepId: step.id,
      stepType: step.type,
    });

    try {
      let result: StepResult;

      switch (step.type) {
        case 'code':
          result = await executeCodeStep(step as CodeStep, context);
          break;

        case 'llm':
          result = await executeLLMStep(step as LLMStep, context);
          break;

        case 'question':
          result = await executeQuestionStep(step as QuestionStep, context);
          break;

        case 'conditional':
          result = await executeConditionalStep(
            step as ConditionalStep,
            context,
            (s, c) => this.executeStep(s, c)
          );
          break;

        case 'loop':
          result = await executeLoopStep(
            step as LoopStep,
            context,
            (s, c) => this.executeStep(s, c)
          );
          break;

        case 'nested_workflow':
          result = await executeNestedWorkflowStep(
            step as NestedWorkflowStep,
            context,
            (wid, sid, ctx) => this.execute(wid as WorkflowId, sid, ctx)
          );
          break;

        default:
          throw new Error(`Unknown step type: ${(step as StepDefinition).type}`);
      }

      // Emit step complete event
      this.events.emit('step:complete', {
        sessionId: context.sessionId,
        stepId: step.id,
        result,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Step execution failed';
      // Emit step error event
      this.events.emit('step:error', {
        sessionId: context.sessionId,
        stepId: step.id,
        error: errorMessage,
      });

      return {
        stepId: step.id,
        status: 'failed',
        error: errorMessage,
        duration: 0,
      };
    }
  }

  /**
   * Record step execution in detail
   */
  private async recordStepExecution(
    sessionId: string,
    step: StepDefinition,
    result: StepResult
  ): Promise<void> {
    const execution: StepExecution = {
      id: `${sessionId}_${step.id}_${Date.now()}`,
      checkpointId: sessionId,
      stepId: step.id,
      stepType: step.type,
      status: result.status,
      startedAt: new Date().toISOString(),
      durationMs: result.duration,
    };

    // Add optional fields only if they have values
    if (result.output) {
      execution.outputData = result.output;
    }
    if (result.error) {
      execution.error = result.error;
    }
    if (result.tokensUsed !== undefined) {
      execution.llmTokensUsed = result.tokensUsed;
    }
    if (result.status !== 'failed') {
      execution.completedAt = new Date().toISOString();
    }

    await this.checkpointService.recordStepExecution(execution);
  }
}

/**
 * Singleton instance
 */
let workflowEngineInstance: WorkflowEngine | null = null;

/**
 * Get or create WorkflowEngine instance
 */
export function getWorkflowEngine(): WorkflowEngine {
  if (!workflowEngineInstance) {
    workflowEngineInstance = new WorkflowEngine();
  }
  return workflowEngineInstance;
}
