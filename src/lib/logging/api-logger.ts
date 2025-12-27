/**
 * @sys/logging - API route logging middleware
 *
 * Provides structured logging for Next.js API routes with:
 * - Automatic request ID propagation
 * - Selective logging (errors, slow requests, 4xx/5xx)
 * - Request/response metadata
 */

import type { NextRequest, NextResponse } from 'next/server';
import { createLogger } from './logger';
import { runWithRequestContext, generateRequestId } from './request-id';

/**
 * Higher-order function that wraps an API route handler with logging.
 *
 * Logs:
 * - All errors (500)
 * - Slow requests (>1s)
 * - Client errors (4xx)
 * - Server errors (5xx)
 *
 * Adds x-request-id header to all responses.
 *
 * Usage:
 * ```typescript
 * export const GET = withLogging(async (request) => {
 *   const logger = createLogger({ requestId: getRequestId() });
 *   logger.info('Processing request');
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 */
export function withLogging(
  handler: (request: NextRequest) => Promise<NextResponse | Response> | NextResponse | Response,
  options?: {
    route?: string;
  }
): (request: NextRequest) => Promise<NextResponse | Response> {
  return async (request: NextRequest) => {
    const requestId = request.headers.get('x-request-id') ?? generateRequestId();
    const route = options?.route ?? request.nextUrl.pathname;
    const startTime = Date.now();

    return runWithRequestContext(requestId, async () => {
      const logger = createLogger({ requestId, route });

      try {
        const response = await handler(request);
        const duration = Date.now() - startTime;
        const status = response.status;

        // Add request ID header to response
        const headers = new Headers(response.headers);
        headers.set('x-request-id', requestId);

        // Create new response with updated headers
        const responseWithHeaders = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });

        // Log based on status and duration
        if (status >= 500) {
          logger.error(`${request.method} ${route} - ${status}`, {
            method: request.method,
            status,
            duration,
          });
        } else if (status >= 400) {
          logger.warn(`${request.method} ${route} - ${status}`, {
            method: request.method,
            status,
            duration,
          });
        } else if (duration > 1000) {
          logger.warn(`Slow request: ${request.method} ${route}`, {
            method: request.method,
            status,
            duration,
          });
        }

        return responseWithHeaders;
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error(`${request.method} ${route} - Unhandled error`, {
          error,
          method: request.method,
          duration,
        });

        // Re-throw to let Next.js handle it
        throw error;
      }
    });
  };
}
