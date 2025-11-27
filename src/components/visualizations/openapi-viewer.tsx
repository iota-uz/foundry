/**
 * OpenAPI specification viewer using Scalar
 */

'use client';

import React, { useRef } from 'react';
// @ts-expect-error - Preserved for future feature
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ApiReference } from '@scalar/api-reference'; // TODO: F4 - Add tabbed view with embedded Scalar docs

interface OpenAPIViewerProps {
  spec: Record<string, any>;
  loading?: boolean;
  error?: string | undefined;
}

export function OpenAPIViewer({ spec, error }: OpenAPIViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <p className="text-accent-error text-sm mb-2">Failed to load OpenAPI spec</p>
          <p className="text-text-secondary text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!spec || Object.keys(spec).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-primary">
        <p className="text-text-secondary">No OpenAPI specification available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="w-full h-full bg-bg-secondary text-text-primary p-6">
        <h2 className="text-2xl font-bold mb-4">API Reference</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{spec.info?.title || 'API'}</h3>
            <p className="text-text-secondary mb-4">{spec.info?.description}</p>
          </div>

          {spec.paths && (
            <div>
              <h4 className="font-semibold mb-3">Endpoints</h4>
              <div className="space-y-2">
                {Object.entries(spec.paths).map(([path, methods]) => (
                  <div key={path} className="pl-4 border-l border-border-default">
                    <p className="font-mono text-sm text-accent-primary">{path}</p>
                    {typeof methods === 'object' && methods !== null &&
                      Object.keys(methods)
                        .filter((m) => ['get', 'post', 'put', 'delete', 'patch'].includes(m))
                        .map((method) => (
                          <p key={`${path}-${method}`} className="text-xs text-text-secondary">
                            {method.toUpperCase()}
                          </p>
                        ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="text-text-secondary text-sm mt-6">
          Full API reference component requires Scalar library configuration
        </p>
      </div>
    </div>
  );
}
