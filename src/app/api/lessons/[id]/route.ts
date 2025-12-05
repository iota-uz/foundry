/**
 * Lesson detail API routes
 * DELETE /api/lessons/:id - Remove lesson
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFileService } from '@/services/core/file.service';
import type { Lesson } from '@/types/api/responses';
import path from 'path';

/**
 * DELETE /api/lessons/:id - Remove lesson
 */
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    const fileService = getFileService();
    const lessonsPath = path.join(projectPath, '.foundry', 'lessons.yaml');

    const exists = await fileService.exists(lessonsPath);
    if (!exists) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Lessons file not found',
          },
        },
        { status: 404 }
      );
    }

    const lessonsData = await fileService.readYaml<{ lessons: Lesson[] }>(lessonsPath);

    // Find and remove lesson
    const lessonIndex = lessonsData.lessons.findIndex((l) => l.id === params.id);
    if (lessonIndex === -1) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Lesson not found',
          },
        },
        { status: 404 }
      );
    }

    lessonsData.lessons.splice(lessonIndex, 1);

    // Save updated lessons
    await fileService.writeYaml(lessonsPath, lessonsData);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to delete lesson: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
