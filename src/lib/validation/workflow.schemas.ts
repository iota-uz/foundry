/**
 * Zod validation schemas for workflow API routes
 */

import { z } from 'zod';

/**
 * Position schema for React Flow nodes
 */
const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/**
 * Workflow node schema (React Flow format)
 */
export const workflowNodeSchema = z.object({
  id: z.string().min(1, 'Node ID is required'),
  type: z.string().min(1, 'Node type is required'),
  position: positionSchema,
  data: z.record(z.unknown()),
});

/**
 * Workflow edge schema (React Flow format)
 */
export const workflowEdgeSchema = z.object({
  id: z.string().min(1, 'Edge ID is required'),
  source: z.string().min(1, 'Source node ID is required'),
  target: z.string().min(1, 'Target node ID is required'),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

/**
 * Docker image validation regex
 * Matches: registry/image:tag, image:tag, image@sha256:...
 */
const dockerImageRegex = /^[a-z0-9]([a-z0-9._/-]*[a-z0-9])?(:[\w][\w.-]*)?(@sha256:[a-f0-9]{64})?$/i;

/**
 * Create workflow request schema
 */
export const createWorkflowSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  name: z.string().min(1, 'Workflow name is required').max(255, 'Name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  nodes: z.array(workflowNodeSchema).default([]),
  edges: z.array(workflowEdgeSchema).default([]),
  initialContext: z.record(z.unknown()).optional(),
  dockerImage: z.string().regex(dockerImageRegex, 'Invalid Docker image format').max(500).optional(),
});

/**
 * Update workflow request schema (all fields optional)
 */
export const updateWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name cannot be empty').max(255, 'Name too long').optional(),
  description: z.string().max(2000, 'Description too long').nullable().optional(),
  nodes: z.array(workflowNodeSchema).optional(),
  edges: z.array(workflowEdgeSchema).optional(),
  initialContext: z.record(z.unknown()).nullable().optional(),
  dockerImage: z.string().regex(dockerImageRegex, 'Invalid Docker image format').max(500).nullable().optional(),
});

/**
 * UUID parameter schema
 */
export const uuidParamSchema = z.string().uuid('Invalid workflow ID format');

/**
 * Type exports
 */
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
