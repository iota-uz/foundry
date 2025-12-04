/**
 * @sys/graph - Tool definition and transformation
 *
 * Converts Zod schemas (developer-friendly) into the format required by
 * the Claude Agent SDK, ensuring type safety and automatic validation.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * A type-safe tool definition using Zod for schema validation.
 * This provides better DX than raw JSON schemas.
 */
export interface GraphTool<TInput = any> {
  /** Unique tool name (used by the AI to invoke it) */
  name: string;

  /** Human-readable description for the AI model */
  description: string;

  /** Zod schema for input validation */
  schema: z.ZodType<TInput>;

  /**
   * Tool execution function.
   * Input is automatically validated against the schema before execution.
   */
  execute: (args: TInput) => Promise<any>;
}

/**
 * Converts a GraphTool (with Zod schema) to the format expected by
 * the Claude Agent SDK.
 *
 * @param tool - The tool definition with Zod schema
 * @returns SDK-compatible tool definition
 */
export function toSdkTool(tool: GraphTool): any {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: zodToJsonSchema(tool.schema, {
      // Remove $schema property as SDK doesn't expect it
      $refStrategy: 'none',
    }),
    func: tool.execute,
  };
}

/**
 * Converts an array of GraphTools to SDK-compatible format.
 * Convenience function for batch conversion.
 */
export function toSdkTools(tools: GraphTool[]): any[] {
  return tools.map(toSdkTool);
}
