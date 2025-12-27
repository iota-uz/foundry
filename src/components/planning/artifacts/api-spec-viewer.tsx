'use client';

/**
 * API Spec Viewer
 *
 * Displays REST and GraphQL API specifications with method badges,
 * request/response schemas, and copy functionality.
 */

import { useState, useCallback } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import type { APISpec } from '@/lib/planning/types';

// ============================================================================
// Types
// ============================================================================

interface APISpecViewerProps {
  specs: APISpec[];
  className?: string;
}

interface SpecCardProps {
  spec: APISpec;
  defaultExpanded?: boolean;
}

// ============================================================================
// HTTP Method Styling
// ============================================================================

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  PATCH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  DELETE: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  OPTIONS: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  HEAD: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const typeColors: Record<string, string> = {
  rest: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  graphql: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

// ============================================================================
// Schema Viewer
// ============================================================================

function SchemaViewer({ schema, title }: { schema: Record<string, unknown>; title: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [schema]);

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-primary overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary border-b border-border-subtle">
        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
          {title}
        </span>
        <button
          onClick={handleCopy}
          className="p-1 rounded text-text-tertiary hover:text-text-secondary transition-colors"
          title={copied ? 'Copied!' : 'Copy JSON'}
        >
          <DocumentDuplicateIcon className={`w-3.5 h-3.5 ${copied ? 'text-accent-success' : ''}`} />
        </button>
      </div>
      <pre className="p-3 text-xs font-mono text-text-secondary overflow-x-auto max-h-64 overflow-y-auto">
        <code>{JSON.stringify(schema, null, 2)}</code>
      </pre>
    </div>
  );
}

// ============================================================================
// Single Spec Card
// ============================================================================

function SpecCard({ spec, defaultExpanded = false }: SpecCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const methodColor = spec.method ? methodColors[spec.method.toUpperCase()] : methodColors.GET;
  const typeColor = typeColors[spec.type];

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary overflow-hidden hover:border-border-hover transition-colors">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand icon */}
        {isExpanded ? (
          <ChevronDownIcon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        )}

        {/* Type badge */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${typeColor}`}>
          {spec.type}
        </span>

        {/* Method badge (REST only) */}
        {spec.type === 'rest' && spec.method && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${methodColor}`}>
            {spec.method.toUpperCase()}
          </span>
        )}

        {/* Path or Operation */}
        {spec.type === 'rest' && spec.path && (
          <code className="text-sm font-mono text-accent-primary">{spec.path}</code>
        )}
        {spec.type === 'graphql' && spec.operation && (
          <code className="text-sm font-mono text-pink-400">{spec.operation}</code>
        )}

        {/* Description preview */}
        <span className="text-sm text-text-secondary truncate flex-1 ml-2">
          {spec.description}
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border-subtle space-y-4">
          {/* Full description */}
          <p className="text-sm text-text-secondary">{spec.description}</p>

          {/* Request/Response schemas */}
          {(spec.requestSchema || spec.responseSchema) && (
            <div className="flex gap-4">
              {/* Request */}
              {spec.requestSchema && (
                <div className="flex-1">
                  <SchemaViewer schema={spec.requestSchema} title="Request" />
                </div>
              )}

              {/* Arrow */}
              {spec.requestSchema && spec.responseSchema && (
                <div className="flex items-center">
                  <ArrowRightIcon className="w-5 h-5 text-text-tertiary" />
                </div>
              )}

              {/* Response */}
              {spec.responseSchema && (
                <div className="flex-1">
                  <SchemaViewer schema={spec.responseSchema} title="Response" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function APISpecViewer({ specs, className = '' }: APISpecViewerProps) {
  const [typeFilter, setTypeFilter] = useState<APISpec['type'] | 'all'>('all');

  const filteredSpecs = typeFilter === 'all'
    ? specs
    : specs.filter((s) => s.type === typeFilter);

  const restCount = specs.filter((s) => s.type === 'rest').length;
  const graphqlCount = specs.filter((s) => s.type === 'graphql').length;

  if (specs.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center mb-4">
          <span className="text-2xl">🔌</span>
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">No API specs yet</h3>
        <p className="text-xs text-text-tertiary max-w-xs">
          API specifications will appear here as the planning identifies endpoints and operations.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-text-secondary">
          <span className="font-bold text-text-primary">{specs.length}</span> endpoints
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 p-0.5 bg-bg-tertiary rounded-lg">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              typeFilter === 'all'
                ? 'bg-bg-secondary text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            All ({specs.length})
          </button>
          {restCount > 0 && (
            <button
              onClick={() => setTypeFilter('rest')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === 'rest'
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              REST ({restCount})
            </button>
          )}
          {graphqlCount > 0 && (
            <button
              onClick={() => setTypeFilter('graphql')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === 'graphql'
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              GraphQL ({graphqlCount})
            </button>
          )}
        </div>
      </div>

      {/* Spec list */}
      <div className="space-y-3">
        {filteredSpecs.map((spec, index) => (
          <SpecCard
            key={spec.id}
            spec={spec}
            defaultExpanded={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
