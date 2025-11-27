/**
 * Undo action API route
 * POST /api/undo/undo - Undo last action
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUndoService } from '@/services/core/undo.service';

/**
 * POST /api/undo/undo - Undo last action
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

    const canUndo = await undoService.canUndo(projectPath);
    if (!canUndo) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Nothing to undo',
          },
        },
        { status: 400 }
      );
    }

    await undoService.undo(projectPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to undo: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
