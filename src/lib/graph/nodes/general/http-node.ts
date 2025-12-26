/**
 * @sys/graph - HttpNode Implementation
 *
 * Generic HTTP request node for JSON APIs.
 * Supports all standard HTTP methods with JSON I/O.
 */

import {
  BaseNode,
  type BaseNodeConfig,
  type NodeExecutionResult,
  NodeExecutionError,
} from '../base';
import type { WorkflowState, GraphContext, Transition } from '../../types';

/**
 * Result of an HTTP request.
 */
export interface HttpResult {
  /** Whether the request succeeded (2xx status) */
  success: boolean;

  /** HTTP status code */
  status: number;

  /** HTTP status text */
  statusText: string;

  /** Response headers */
  headers: Record<string, string>;

  /** Parsed JSON response body */
  data: unknown;

  /** Error message if request failed */
  error?: string;

  /** Request duration in milliseconds */
  duration: number;
}

/**
 * Configuration for HttpNode.
 */
export interface HttpNodeConfig<TContext extends Record<string, unknown>>
  extends BaseNodeConfig<TContext> {
  /**
   * HTTP method.
   */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /**
   * URL to request.
   * Can be a static string or a function that returns the URL based on state.
   */
  url: string | ((state: WorkflowState<TContext>) => string);

  /**
   * Request headers.
   */
  headers?: Record<string, string>;

  /**
   * Request body (for POST, PUT, PATCH).
   * Can be a static object or a function that returns the body based on state.
   */
  body?: Record<string, unknown> | ((state: WorkflowState<TContext>) => Record<string, unknown>);

  /**
   * Query parameters (appended to URL).
   */
  params?: Record<string, string | number | boolean>;

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;

  /**
   * Whether to throw on non-2xx status.
   * @default true
   */
  throwOnError?: boolean;

  /**
   * Key in context to store the result.
   * @default 'lastHttpResult'
   */
  resultKey?: string;
}

/**
 * HttpNode - Makes HTTP requests with JSON I/O.
 *
 * Features:
 * - All standard HTTP methods
 * - Dynamic URL and body from state
 * - Query parameters support
 * - Timeout handling
 * - Response stored in context
 *
 * @example
 * ```typescript
 * nodes.HttpNode({
 *   method: 'POST',
 *   url: 'https://api.example.com/deploy',
 *   headers: { 'Authorization': 'Bearer xxx' },
 *   body: { version: '1.0.0' },
 *   next: 'VERIFY',
 * })
 * ```
 */
export class HttpNodeRuntime<TContext extends Record<string, unknown>>
  extends BaseNode<TContext, HttpNodeConfig<TContext>> {

  public readonly nodeType = 'http';

  constructor(config: HttpNodeConfig<TContext>) {
    super({
      ...config,
      timeout: config.timeout ?? 30000,
      throwOnError: config.throwOnError ?? true,
      resultKey: config.resultKey ?? 'lastHttpResult',
    });
  }

  /**
   * Executes the HTTP request.
   */
  async execute(
    state: WorkflowState<TContext>,
    context: GraphContext
  ): Promise<NodeExecutionResult<TContext>> {
    const {
      method,
      url,
      headers = {},
      body,
      params,
      timeout,
      throwOnError,
      resultKey,
    } = this.config;

    const startTime = Date.now();

    try {
      // Resolve URL
      const resolvedUrl = typeof url === 'function' ? url(state) : url;
      const finalUrl = this.buildUrl(resolvedUrl, params);

      // Resolve body
      const resolvedBody = typeof body === 'function' ? body(state) : body;

      context.logger.info(`[HttpNode] ${method} ${finalUrl}`);

      // Make the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...headers,
          },
          signal: controller.signal,
        };

        if (resolvedBody) {
          fetchOptions.body = JSON.stringify(resolvedBody);
        }

        const response = await fetch(finalUrl, fetchOptions);

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;

        // Parse response
        let data: unknown;
        const contentType = response.headers.get('content-type');
        if (contentType !== null && contentType !== undefined && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // Extract headers
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        const result: HttpResult = {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          data,
          duration,
        };

        if (!response.ok) {
          result.error = `HTTP ${response.status}: ${response.statusText}`;
        }

        context.logger.info(
          `[HttpNode] ${response.status} ${response.statusText} in ${duration}ms`
        );

        // Check for errors
        if (throwOnError === true && !response.ok) {
          throw new NodeExecutionError(
            `HTTP request failed: ${result.error}`,
            finalUrl,
            this.nodeType,
            undefined,
            { status: response.status, data }
          );
        }

        // Store result in context
        const contextUpdate = {
          ...state.context,
          [resultKey!]: result,
        } as TContext;

        return {
          stateUpdate: {
            context: contextUpdate,
          },
          metadata: {
            status: response.status,
            duration,
          },
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const err = error as Error;

      if (err instanceof NodeExecutionError) {
        throw err;
      }

      const duration = Date.now() - startTime;

      if (err.name === 'AbortError') {
        throw new NodeExecutionError(
          `HTTP request timed out after ${timeout}ms`,
          typeof url === 'function' ? 'dynamic URL' : url,
          this.nodeType,
          err,
          { timeout, duration }
        );
      }

      throw new NodeExecutionError(
        `HTTP request failed: ${err.message}`,
        typeof url === 'function' ? 'dynamic URL' : url,
        this.nodeType,
        err,
        { duration }
      );
    }
  }

  /**
   * Builds URL with query parameters.
   */
  private buildUrl(
    baseUrl: string,
    params?: Record<string, string | number | boolean>
  ): string {
    if (!params || Object.keys(params).length === 0) {
      return baseUrl;
    }

    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }
}

/**
 * Factory function to create an HttpNode definition.
 */
export function createHttpNode<TContext extends Record<string, unknown>>(
  config: Omit<HttpNodeConfig<TContext>, 'next'> & {
    next: Transition<TContext>;
  }
): HttpNodeConfig<TContext> {
  return config;
}
