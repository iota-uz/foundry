/**
 * Redo action API route
 * POST /api/undo/redo - Redo last undone action
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUndoService } from '@/services/core/undo.service';

/**
 * POST /api/undo/redo - Redo last undone action
 */
export async function POST(request: NextRequest) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    if (!projectPath) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath query parameter',
          },
        },
        { status: 400 }
      );
    }

    const undoService = getUndoService();

    const canRedo = await undoService.canRedo(projectPath);
    if (!canRedo) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Nothing to redo',
          },
        },
        { status: 400 }
      );
    }

    await undoService.redo(projectPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to redo: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
