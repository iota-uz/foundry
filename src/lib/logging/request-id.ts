/**
 * @sys/logging - Request ID management for distributed tracing
 *
 * Uses Railway's X-Request-Id header in production, falls back to nanoid for local development.
 * Leverages Node.js AsyncLocalStorage for request context propagation.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { nanoid } from 'nanoid';

/**
 * AsyncLocalStorage instance for storing request context.
 */
const requestContext = new AsyncLocalStorage<{ requestId: string }>();

/**
 * Generates a new request ID.
 * Uses nanoid(16) for unique, URL-safe identifiers.
 */
export function generateRequestId(): string {
  return nanoid(16);
}

/**
 * Gets the current request ID from async context.
 * Returns undefined if not within a request context.
 */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

/**
 * Runs a function within a request context with the given request ID.
 * This makes the request ID available via getRequestId() within the callback.
 */
export function runWithRequestContext<T>(requestId: string, callback: () => T): T {
  return requestContext.run({ requestId }, callback);
}
