/**
 * @sys/graph/nodes/general - General Purpose Nodes
 *
 * General-purpose nodes for common workflow operations:
 * - CommandNode: Execute shell commands
 * - HttpNode: Make HTTP requests with JSON I/O
 * - LLMNode: Structured LLM invocations with Claude
 */

export {
  CommandNodeRuntime,
  type CommandNodeConfig,
  type CommandResult,
} from './command-node';

export {
  HttpNodeRuntime,
  type HttpNodeConfig,
  type HttpResult,
  createHttpNode,
} from './http-node';

export {
  LLMNodeRuntime,
  type LLMNodeConfig,
  type LLMResult,
  type ReasoningEffort,
  type OutputMode,
} from './llm-node';
