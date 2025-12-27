/**
 * Workflow DSL Parse API
 *
 * POST /api/workflows/parse-dsl - Parse TypeScript DSL and validate
 *
 * This endpoint parses DSL code server-side (where ts-morph works) and returns
 * the parsed workflow with validation results. Does NOT save to database.
 *
 * Request body:
 * - dsl: string - The TypeScript DSL code
 *
 * Response:
 * - workflow: DSLWorkflow - The parsed workflow
 * - nodes: Node[] - React Flow nodes
 * - edges: Edge[] - React Flow edges
 * - metadata: WorkflowMetadata - Workflow metadata
 * - validation: ValidationResult - Validation errors/warnings
 * - warnings: string[] - Parse warnings
 */

import { NextResponse } from 'next/server';
import { parseDSL, dslToReactFlow, validateDSL } from '@/lib/workflow-dsl';

interface ParseRequest {
  dsl: string;
  projectId?: string;
}

/**
 * Parse workflow DSL without saving
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as ParseRequest;
    const { dsl, projectId = '' } = body;

    // Validate required fields
    if (!dsl || typeof dsl !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid DSL code' },
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

    // Convert to React Flow format
    const { nodes, edges, metadata } = dslToReactFlow(parsedWorkflow.workflow, projectId);

    return NextResponse.json({
      workflow: parsedWorkflow.workflow,
      nodes,
      edges,
      metadata,
      validation,
      warnings: parsedWorkflow.warnings,
    });
  } catch (error) {
    console.error('Failed to parse DSL:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse DSL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
