/**
 * Workflow DSL Import API
 *
 * POST /api/workflows/import-dsl - Parse TypeScript DSL and create/update workflow
 *
 * Request body:
 * - dsl: string - The TypeScript DSL code
 * - projectId: string - Project to import into
 * - workflowId?: string - Optional workflow ID to update (otherwise creates new)
 */

import { NextResponse } from 'next/server';
import {
  createWorkflow,
  updateWorkflow,
  getWorkflow,
} from '@/lib/db/repositories/workflow.repository';
import { validateUuid, isValidationError } from '@/lib/validation';
import { parseDSL, dslToReactFlow, validateDSL } from '@/lib/workflow-dsl';
import type { WorkflowNodeData as DbNodeData, WorkflowEdgeData as DbEdgeData } from '@/lib/db/schema';

interface ImportRequest {
  dsl: string;
  projectId: string;
  workflowId?: string;
}

/**
 * Import workflow from TypeScript DSL
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as ImportRequest;
    const { dsl, projectId, workflowId } = body;

    // Validate required fields
    if (!dsl || typeof dsl !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid DSL code' },
        { status: 400 }
      );
    }

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid project ID' },
        { status: 400 }
      );
    }

    const validProjectId = validateUuid(projectId);
    if (isValidationError(validProjectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      );
    }

    // Parse the DSL
    let parsedWorkflow;
    try {
      const { workflow, warnings } = parseDSL(dsl);
      parsedWorkflow = { workflow, warnings };
    } catch (parseError) {
      return NextResponse.json(
        {
          error: 'Failed to parse DSL',
          details: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        },
        { status: 400 }
      );
    }

    // Validate the parsed workflow
    const validation = validateDSL(parsedWorkflow.workflow);
    if (!validation.valid) {
      const errors = validation.errors.filter((e) => e.severity === 'error');
      return NextResponse.json(
        {
          error: 'Workflow validation failed',
          validationErrors: errors,
        },
        { status: 400 }
      );
    }

    // Convert to React Flow format
    const { nodes, edges, metadata } = dslToReactFlow(parsedWorkflow.workflow, validProjectId);

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
    if (workflowId) {
      // Update existing workflow
      const validWorkflowId = validateUuid(workflowId);
      if (isValidationError(validWorkflowId)) {
        return NextResponse.json(
          { error: 'Invalid workflow ID format' },
          { status: 400 }
        );
      }

      const existingWorkflow = await getWorkflow(validWorkflowId);
      if (!existingWorkflow) {
        return NextResponse.json(
          { error: 'Workflow not found' },
          { status: 404 }
        );
      }

      await updateWorkflow(validWorkflowId, {
        name: metadata.name,
        description: metadata.description ?? null,
        nodes: dbNodes,
        edges: dbEdges,
        initialContext: metadata.initialContext,
        dslCache: dsl,
        dslDirty: false,
      });

      return NextResponse.json({
        id: validWorkflowId,
        updated: true,
        warnings: parsedWorkflow.warnings,
      });
    } else {
      // Create new workflow
      const newWorkflow = await createWorkflow({
        projectId: validProjectId,
        name: metadata.name,
        description: metadata.description ?? null,
        nodes: dbNodes,
        edges: dbEdges,
        initialContext: metadata.initialContext,
        dslCache: dsl,
        dslDirty: false,
      });

      return NextResponse.json({
        id: newWorkflow.id,
        created: true,
        warnings: parsedWorkflow.warnings,
      });
    }
  } catch (error) {
    console.error('Failed to import DSL:', error);
    return NextResponse.json(
      {
        error: 'Failed to import DSL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
