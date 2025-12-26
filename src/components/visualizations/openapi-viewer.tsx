/**
 * OpenAPI specification viewer using Scalar
 */

'use client';

import React, { useRef, useState } from 'react';

// NOTE: Scalar integration notes for future implementation:
// - @scalar/api-reference has Next.js 15 compatibility issues
// - Use @scalar/nextjs-api-reference or @scalar/api-reference-react when implementing
// - Tabs should show: Overview, Endpoints, Schemas, Security
// Example integration:
// import { ApiReferenceReact } from '@scalar/api-reference-react';
// <ApiReferenceReact configuration={{ spec: { content: spec } }} />

interface OpenAPIViewerProps {
  spec: Record<string, unknown>;
  error?: string | undefined;
}

// HTTP method colors for consistent styling
const METHOD_COLORS = {
  get: 'bg-blue-600 text-white',
  post: 'bg-green-600 text-white',
  put: 'bg-amber-600 text-white',
  delete: 'bg-red-600 text-white',
  patch: 'bg-purple-600 text-white',
} as const;

export function OpenAPIViewer({ spec, error }: OpenAPIViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'schemas'>(
    'overview'
  );

  if (error !== undefined && error !== null && error !== '') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <p className="text-accent-error text-sm mb-2">Failed to load OpenAPI spec</p>
          <p className="text-text-secondary text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (spec === undefined || spec === null || Object.keys(spec).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-primary">
        <p className="text-text-secondary">No OpenAPI specification available</p>
      </div>
    );
  }

  const info = spec.info as Record<string, unknown> | undefined;
  const paths = spec.paths as Record<string, unknown> | undefined;
  const components = spec.components as Record<string, unknown> | undefined;
  const schemas =
    (components?.schemas as Record<string, unknown>) ??
    {};

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'endpoints' as const, label: 'Endpoints' },
    { id: 'schemas' as const, label: 'Schemas' },
  ];

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col"
    >
      {/* Tabs */}
      <div className="border-b border-border-default bg-bg-secondary" role="tablist" aria-label="API documentation sections">
        <div className="flex gap-1 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => {
                const currentIndex = tabs.findIndex(t => t.id === tab.id);
                if (e.key === 'ArrowRight') {
                  const nextIndex = (currentIndex + 1) % tabs.length;
                  const nextTab = tabs[nextIndex];
                  if (nextTab) setActiveTab(nextTab.id);
                  e.preventDefault();
                } else if (e.key === 'ArrowLeft') {
                  const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                  const prevTab = tabs[prevIndex];
                  if (prevTab) setActiveTab(prevTab.id);
                  e.preventDefault();
                } else if (e.key === 'Home') {
                  const firstTab = tabs[0];
                  if (firstTab) setActiveTab(firstTab.id);
                  e.preventDefault();
                } else if (e.key === 'End') {
                  const lastTab = tabs[tabs.length - 1];
                  if (lastTab) setActiveTab(lastTab.id);
                  e.preventDefault();
                }
              }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="flex-1 overflow-auto bg-bg-secondary text-text-primary p-6"
      >
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {(info?.title as string) || 'API'}
              </h2>
              <p className="text-text-secondary mb-4">
                {(info?.description as string) || 'No description available'}
              </p>
              {info?.version !== undefined && info?.version !== null && info?.version !== '' ? (
                <div className="inline-block px-3 py-1 rounded bg-bg-tertiary text-text-secondary text-sm">
                  Version: {String(info.version)}
                </div>
              ) : null}
            </div>
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mt-6">
              <p className="text-sm text-blue-300">
                Full interactive API documentation with Scalar will be available when
                @scalar/nextjs-api-reference is configured.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'endpoints' && paths && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">API Endpoints</h3>
            <div className="space-y-3">
              {Object.entries(paths).map(([path, methods]) => (
                <div
                  key={path}
                  className="border border-border-default rounded-lg p-4 bg-bg-tertiary"
                >
                  <p className="font-mono text-sm text-accent-primary mb-2">{path}</p>
                  <div className="flex flex-wrap gap-2">
                    {typeof methods === 'object' &&
                      methods !== null &&
                      Object.keys(methods)
                        .filter((m) =>
                          ['get', 'post', 'put', 'delete', 'patch'].includes(m)
                        )
                        .map((method) => (
                          <span
                            key={`${path}-${method}`}
                            className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                              METHOD_COLORS[method as keyof typeof METHOD_COLORS]
                            }`}
                          >
                            {method}
                          </span>
                        ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'schemas' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Data Schemas</h3>
            {Object.keys(schemas).length === 0 ? (
              <p className="text-text-secondary">No schemas defined</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(schemas).map(([name, schema]) => {
                  let schemaText: string;
                  try {
                    schemaText = JSON.stringify(schema, null, 2);
                  } catch (error) {
                    schemaText = `Error serializing schema: ${error instanceof Error ? error.message : 'Unknown error'}`;
                  }

                  return (
                    <div
                      key={name}
                      className="border border-border-default rounded-lg p-4 bg-bg-tertiary"
                    >
                      <h4 className="font-mono text-sm text-accent-primary mb-2">{name}</h4>
                      <pre className="text-xs text-text-secondary overflow-auto">
                        {schemaText}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
