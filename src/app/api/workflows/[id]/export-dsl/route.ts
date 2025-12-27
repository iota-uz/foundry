/**
 * Workflow DSL Export API
 *
 * GET /api/workflows/:id/export-dsl - Generate TypeScript DSL from workflow
 *
 * Returns cached DSL if available and not dirty, otherwise regenerates.
 */

import { NextResponse } from 'next/server';
import { getWorkflow, updateWorkflow } from '@/lib/db/repositories/workflow.repository';
import { validateUuid, isValidationError } from '@/lib/validation';
import { generateDSL } from '@/lib/workflow-dsl';
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData } from '@/store/workflow-builder.store';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Export workflow as TypeScript DSL
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validId = validateUuid(id);
    if (isValidationError(validId)) {
      return validId;
    }

    // Get workflow
    const workflow = await getWorkflow(validId);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check if we have a valid cached DSL
    if (workflow.dslCache && workflow.dslDirty === false) {
      return new Response(workflow.dslCache, {
        headers: {
          'Content-Type': 'text/typescript',
          'Content-Disposition': `inline; filename="${workflow.name.toLowerCase().replace(/\s+/g, '-')}.workflow.ts"`,
        },
      });
    }

    // Regenerate DSL
    const nodes = workflow.nodes as unknown as Node<WorkflowNodeData>[];
    const edges = workflow.edges as unknown as Edge[];
    const metadata = {
      id: workflow.id,
      projectId: workflow.projectId,
      name: workflow.name,
      description: workflow.description ?? '',
      initialContext: workflow.initialContext ?? {},
    };

    const result = generateDSL(nodes, edges, metadata);

    // Cache the generated DSL
    await updateWorkflow(validId, {
      dslCache: result.code,
      dslDirty: false,
    });

    return new Response(result.code, {
      headers: {
        'Content-Type': 'text/typescript',
        'Content-Disposition': `inline; filename="${workflow.name.toLowerCase().replace(/\s+/g, '-')}.workflow.ts"`,
      },
    });
  } catch (error) {
    console.error('Failed to export DSL:', error);
    return NextResponse.json(
      { error: 'Failed to export DSL' },
      { status: 500 }
    );
  }
}
