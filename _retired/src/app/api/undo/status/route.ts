/**
 * Undo status API route
 * GET /api/undo/status - Get undo/redo availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUndoService } from '@/services/core/undo.service';
import type { UndoStatus } from '@/types/api/responses';

/**
 * GET /api/undo/status - Get undo/redo availability
 */
export async function GET(request: NextRequest) {
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

    const status = await undoService.getStatus(projectPath);
    const previewUndo = await undoService.previewUndo(projectPath);
    const previewRedo = await undoService.previewRedo(projectPath);

    const response: UndoStatus = {
      canUndo: status.canUndo,
      canRedo: status.canRedo,
      ...(previewUndo.action && {
        undoDescription: `${previewUndo.action.actionType} ${previewUndo.action.targetType}`,
      }),
      ...(previewRedo.action && {
        redoDescription: `${previewRedo.action.actionType} ${previewRedo.action.targetType}`,
      }),
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get undo status: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
