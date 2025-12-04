/**
 * @sys/graph - Public API
 *
 * A resilient, type-safe framework for building Stateful Agentic Workflows.
 *
 * Key Features:
 * - Resumability: Workflows can be paused and resumed at any step
 * - Context Hygiene: Programmatic control over agent memory persistence
 * - SDK Abstraction: Wraps Claude Agent SDK with automatic tool execution
 * - Type Safety: Full TypeScript generics for custom state types
 *
 * @example
 * ```typescript
 * import { GraphEngine, BaseState, GraphNode } from '@sys/graph';
 *
 * interface MyState extends BaseState {
 *   counter: number;
 * }
 *
 * const nodes: Record<string, GraphNode<MyState>> = {
 *   start: {
 *     name: 'start',
 *     async execute(state, context) {
 *       // Use the agent to perform AI operations
 *       // The result contains the response and updated conversation history
 *       const { response } = await context.agent.runStep(
 *         state,
 *         'Increment the counter',
 *         []
 *       );
 *       context.logger.info('AI response:', response);
 *       return { counter: state.counter + 1 };
 *     },
 *     next(state) {
 *       return state.counter >= 5 ? 'END' : 'start';
 *     },
 *   },
 * };
 *
 * const engine = new GraphEngine({
 *   stateDir: './.graph-state',
 *   nodes,
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 * });
 *
 * const finalState = await engine.run('my-workflow', {
 *   currentNode: 'start',
 *   status: 'pending',
 *   updatedAt: new Date().toISOString(),
 *   conversationHistory: [],
 *   counter: 0,
 * });
 *
 * console.log('Final counter:', finalState.counter);
 * ```
 */

// Core types
export type {
  BaseState,
  GraphNode,
  GraphContext,
  IAgentWrapper,
  GraphEngineConfig,
} from './types';

// Main engine
export { GraphEngine } from './engine';
export type { GraphEngineOptions } from './engine';

// State management
export { StateManager } from './state-manager';
export type { StateManagerConfig } from './state-manager';

// Agent wrapper
export { AgentWrapper } from './agent/wrapper';
export type { AgentWrapperConfig } from './agent/wrapper';

// Tool utilities
export { toSdkTool, toSdkTools } from './agent/tools';
export type { GraphTool, SdkToolDefinition } from './agent/tools';

// Utilities
export { createLogger } from './utils/logger';
export type { LogContext } from './utils/logger';
