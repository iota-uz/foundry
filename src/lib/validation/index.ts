/**
 * Validation utilities for API routes
 */

import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';

export * from './workflow.schemas';

/**
 * Validation error response
 */
export interface ValidationErrorResponse {
  error: string;
  details: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Parse and validate request body with Zod schema
 * Returns parsed data on success, NextResponse on failure
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T | NextResponse<ValidationErrorResponse>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid JSON',
          details: [{ path: '', message: 'Request body must be valid JSON' }],
        },
        { status: 400 }
      );
    }

    throw error;
  }
}

/**
 * Validate a UUID parameter
 */
export function validateUuid(id: string): string | NextResponse<ValidationErrorResponse> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: [{ path: 'id', message: 'Invalid UUID format' }],
      },
      { status: 400 }
    );
  }
  return id;
}

/**
 * Type guard to check if result is a NextResponse (error)
 */
export function isValidationError<T>(
  result: T | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
