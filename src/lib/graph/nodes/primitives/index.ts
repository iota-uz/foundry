/**
 * @sys/graph/nodes/primitives - Primitive Workflow Nodes
 *
 * Low-level building blocks for composing complex workflows.
 * These primitives enable dynamic, data-driven workflow patterns.
 *
 * ## Primitives
 *
 * - **EvalNode**: Pure context transformation (no LLM)
 * - **DynamicAgentNode**: Agent with runtime model/prompt config
 * - **DynamicCommandNode**: Shell command with runtime config
 *
 * ## Design Philosophy
 *
 * Instead of high-level nodes that do everything, primitives provide
 * simple building blocks that compose into complex workflows:
 *
 * ```typescript
 * // Iterate over tasks with dynamic model selection
 * nodes: {
 *   NEXT_TASK: nodes.EvalNode({
 *     fn: (state) => ({
 *       currentIndex: state.context.currentIndex + 1,
 *       currentTask: state.context.tasks[state.context.currentIndex + 1],
 *     }),
 *     next: (state) => state.context.currentTask ? 'EXECUTE' : 'DONE',
 *   }),
 *
 *   EXECUTE: nodes.DynamicAgentNode({
 *     model: (state) => state.context.currentTask.model,
 *     prompt: (state) => state.context.currentTask.prompt,
 *     next: 'COLLECT',
 *   }),
 *
 *   COLLECT: nodes.EvalNode({
 *     fn: (state) => ({
 *       results: [...state.context.results, state.context.lastDynamicAgentResult],
 *     }),
 *     next: 'NEXT_TASK',
 *   }),
 * }
 * ```
 */

export {
  EvalNodeRuntime,
  type EvalNodeConfig,
  type EvalResult,
} from './eval-node';

export {
  DynamicAgentNodeRuntime,
  type DynamicAgentNodeConfig,
  type DynamicAgentResult,
} from './dynamic-agent-node';

export {
  DynamicCommandNodeRuntime,
  type DynamicCommandNodeConfig,
  type DynamicCommandResult,
} from './dynamic-command-node';
