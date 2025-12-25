/**
 * OpenAPI parser utilities
 * Extracts endpoints from OpenAPI spec
 */

import type { Endpoint } from '@/types/domain/artifact';

/**
 * Parse OpenAPI spec to extract endpoints
 */
export function parseOpenAPIEndpoints(spec: Record<string, unknown>): Endpoint[] {
  const endpoints: Endpoint[] = [];

  if (!spec.paths || typeof spec.paths !== 'object') {
    return endpoints;
  }

  const paths = spec.paths as Record<string, unknown>;

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

    for (const method of methods) {
      const operation = (pathItem as Record<string, unknown>)[method];

      if (operation && typeof operation === 'object') {
        const op = operation as Record<string, unknown>;
        const operationId = (op.operationId as string) || `${method}_${path.replace(/\//g, '_')}`;
        const summary = (op.summary as string) || '';
        const description = (op.description as string) || summary;

        endpoints.push({
          id: operationId,
          type: 'rest',
          method: method.toUpperCase(),
          path,
          description: description || `${method.toUpperCase()} ${path}`,
          featureRefs: [],
        });
      }
    }
  }

  return endpoints;
}
