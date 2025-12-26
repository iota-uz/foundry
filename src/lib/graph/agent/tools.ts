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
export interface GraphTool<TInput = unknown> {
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
  execute: (args: TInput) => Promise<unknown>;
}

/**
 * SDK tool definition format expected by the Claude Agent SDK.
 * This interface documents the expected structure for SDK compatibility.
 */
export interface SdkToolDefinition {
  /** Unique tool name */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for input validation */
  input_schema: Record<string, unknown>;
  /** Tool execution function */
  func: (args: unknown) => Promise<unknown>;
}

/**
 * Sanitizes a JSON schema for SDK compatibility.
 * Removes properties that the SDK doesn't expect while preserving
 * the core schema structure.
 *
 * @param schema - Raw JSON schema from zod-to-json-schema
 * @returns Sanitized schema compatible with SDK expectations
 */
function sanitizeJsonSchemaForSdk(schema: Record<string, unknown>): Record<string, unknown> {
  if (schema === null || schema === undefined || typeof schema !== 'object') return {};

  // These are the properties the SDK expects at the top level
  const allowedKeys = ['type', 'properties', 'required', 'description', 'title', 'default', 'items', 'enum'];
  const sanitized: Record<string, unknown> = {};

  for (const key of allowedKeys) {
    if (key in schema && schema[key] !== undefined) {
      sanitized[key] = schema[key];
    }
  }

  return sanitized;
}

/**
 * Converts a GraphTool (with Zod schema) to the format expected by
 * the Claude Agent SDK.
 *
 * @param tool - The tool definition with Zod schema
 * @returns SDK-compatible tool definition
 */
export function toSdkTool(tool: GraphTool): SdkToolDefinition {
  const rawSchema = zodToJsonSchema(tool.schema, {
    // Remove $schema property as SDK doesn't expect it
    $refStrategy: 'none',
  }) as Record<string, unknown>;

  return {
    name: tool.name,
    description: tool.description,
    input_schema: sanitizeJsonSchemaForSdk(rawSchema),
    func: tool.execute as (args: unknown) => Promise<unknown>,
  };
}

/**
 * Converts an array of GraphTools to SDK-compatible format.
 * Convenience function for batch conversion.
 */
export function toSdkTools(tools: GraphTool[]): SdkToolDefinition[] {
  return tools.map(toSdkTool);
}
