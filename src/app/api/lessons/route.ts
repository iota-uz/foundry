/**
 * Lessons learned API routes
 * GET /api/lessons - Get lessons learned entries
 * POST /api/lessons - Add manual lesson
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getFileService } from '@/services/core/file.service';
import { CreateLessonRequestSchema } from '@/schemas/api';
import type { LessonsResponse, Lesson } from '@/types/api/responses';
import { generateId } from '@/lib/utils/id';
import path from 'path';

/**
 * GET /api/lessons - Get lessons learned entries
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

    const fileService = getFileService();
    const lessonsPath = path.join(projectPath, '.foundry', 'lessons.yaml');

    const exists = await fileService.exists(lessonsPath);
    if (!exists) {
      const response: LessonsResponse = { lessons: [] };
      return NextResponse.json(response);
    }

    const lessonsData = await fileService.readYaml<{ lessons: Lesson[] }>(lessonsPath);
    const response: LessonsResponse = {
      lessons: lessonsData.lessons || [],
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get lessons: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lessons - Add manual lesson
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

    const body = await request.json();
    const parsed = CreateLessonRequestSchema.parse(body);

    const fileService = getFileService();
    const lessonsPath = path.join(projectPath, '.foundry', 'lessons.yaml');

    // Load existing lessons
    let lessonsData: { lessons: Lesson[] } = { lessons: [] };
    const exists = await fileService.exists(lessonsPath);
    if (exists) {
      lessonsData = await fileService.readYaml<{ lessons: Lesson[] }>(lessonsPath);
    }

    // Create new lesson
    const newLesson: Lesson = {
      id: generateId('lesson'),
      type: parsed.type,
      context: parsed.context,
      problem: parsed.problem,
      solution: parsed.solution,
      addedBy: 'user',
      addedAt: new Date().toISOString(),
      appliedCount: 0,
    };

    lessonsData.lessons.push(newLesson);

    // Save lessons
    await fileService.writeYaml(lessonsPath, lessonsData);

    return NextResponse.json(newLesson, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to add lesson: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
