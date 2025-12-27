/**
 * Workflow Router
 *
 * tRPC procedures for workflow management.
 * Replaces: /api/projects/:id/workflows/*, /api/workflows/parse-dsl, /api/workflows/import-dsl
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../init';
import {
  getWorkflow,
  getWorkflowByProject,
  listWorkflows,
  createWorkflow,
  updateWorkflow,
} from '@/lib/db/repositories/workflow.repository';
import { getProject } from '@/lib/db/repositories/project.repository';
import { parseDSL, dslToReactFlow, validateDSL } from '@/lib/workflow-dsl';
import type {
  WorkflowNodeData as DbNodeData,
  WorkflowEdgeData as DbEdgeData,
} from '@/lib/db/schema';

export const workflowRouter = router({
  /**
   * List all workflows for a project
   * Replaces: GET /api/projects/:id/workflows
   */
  listByProject: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      const project = await getProject(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const workflows = await listWorkflows(input.projectId);
      return workflows;
    }),

  /**
   * Get a workflow by ID
   * Replaces: GET /api/projects/:projectId/workflows/:id
   */
  byId: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        projectId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const project = await getProject(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const workflow = await getWorkflowByProject(input.id, input.projectId);
      if (!workflow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow not found',
        });
      }

      return workflow;
    }),

  /**
   * Get a workflow by ID (without project scope)
   * Used internally when we don't need project validation
   */
  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const workflow = await getWorkflow(input.id);
      if (!workflow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow not found',
        });
      }

      return workflow;
    }),

  /**
   * Parse workflow DSL without saving
   * Replaces: POST /api/workflows/parse-dsl
   *
   * Note: This is a mutation because it processes input data,
   * even though it doesn't modify any state
   */
  parseDsl: publicProcedure
    .input(
      z.object({
        dsl: z.string().min(1, 'DSL code is required'),
        projectId: z.string().optional().default(''),
      })
    )
    .mutation(async ({ input }) => {
      // Parse the DSL
      let parsedWorkflow;
      try {
        const { workflow, warnings } = parseDSL(input.dsl);
        parsedWorkflow = { workflow, warnings };
      } catch (parseError) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to parse DSL',
          cause: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        });
      }

      // Validate the parsed workflow
      const validation = validateDSL(parsedWorkflow.workflow);

      // Convert to React Flow format
      const { nodes, edges, metadata } = dslToReactFlow(
        parsedWorkflow.workflow,
        input.projectId
      );

      return {
        workflow: parsedWorkflow.workflow,
        nodes,
        edges,
        metadata,
        validation,
        warnings: parsedWorkflow.warnings,
      };
    }),

  /**
   * Import workflow from TypeScript DSL
   * Creates or updates a workflow from DSL code
   * Replaces: POST /api/workflows/import-dsl
   */
  importDsl: publicProcedure
    .input(
      z.object({
        dsl: z.string().min(1, 'DSL code is required'),
        projectId: z.string().uuid(),
        workflowId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify project exists
      const project = await getProject(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Parse the DSL
      let parsedWorkflow;
      try {
        const { workflow, warnings } = parseDSL(input.dsl);
        parsedWorkflow = { workflow, warnings };
      } catch (parseError) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to parse DSL',
          cause: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        });
      }

      // Validate the parsed workflow
      const validation = validateDSL(parsedWorkflow.workflow);
      if (!validation.valid) {
        const errors = validation.errors.filter((e) => e.severity === 'error');
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Workflow validation failed',
          cause: errors,
        });
      }

      // Convert to React Flow format
      const { nodes, edges, metadata } = dslToReactFlow(
        parsedWorkflow.workflow,
        input.projectId
      );

      // Convert to database format
      const dbNodes: DbNodeData[] = nodes.map((node) => ({
        id: node.id,
        type: node.type ?? 'default',
        position: node.position,
        data: node.data as unknown as Record<string, unknown>,
      }));

      const dbEdges: DbEdgeData[] = edges.map((edge) => {
        const dbEdge: DbEdgeData = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
        };
        if (edge.sourceHandle !== undefined && edge.sourceHandle !== null) {
          dbEdge.sourceHandle = edge.sourceHandle;
        }
        if (edge.targetHandle !== undefined && edge.targetHandle !== null) {
          dbEdge.targetHandle = edge.targetHandle;
        }
        if (edge.data !== undefined) {
          dbEdge.data = edge.data as Record<string, unknown>;
        }
        return dbEdge;
      });

      // Create or update workflow
      if (input.workflowId) {
        // Update existing workflow
        const existingWorkflow = await getWorkflow(input.workflowId);
        if (!existingWorkflow) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          });
        }

        await updateWorkflow(input.workflowId, {
          name: metadata.name,
          description: metadata.description ?? null,
          nodes: dbNodes,
          edges: dbEdges,
          initialContext: metadata.initialContext,
          dslCache: input.dsl,
          dslDirty: false,
        });

        return {
          id: input.workflowId,
          updated: true as const,
          created: false as const,
          warnings: parsedWorkflow.warnings,
        };
      } else {
        // Create new workflow
        const newWorkflow = await createWorkflow({
          projectId: input.projectId,
          name: metadata.name,
          description: metadata.description ?? null,
          nodes: dbNodes,
          edges: dbEdges,
          initialContext: metadata.initialContext,
          dslCache: input.dsl,
          dslDirty: false,
        });

        return {
          id: newWorkflow.id,
          created: true as const,
          updated: false as const,
          warnings: parsedWorkflow.warnings,
        };
      }
    }),
});
