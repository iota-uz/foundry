'use client';

/**
 * Mermaid Diagram Viewer
 *
 * Renders Mermaid diagrams with syntax preview and copy functionality.
 * Features:
 * - Live Mermaid rendering via dynamic import
 * - Syntax view toggle
 * - Copy diagram code
 * - Diagram type badges
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChartBarIcon,
  DocumentDuplicateIcon,
  CodeBracketIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { MermaidDiagram } from '@/lib/planning/types';

// ============================================================================
// Types
// ============================================================================

interface MermaidDiagramViewerProps {
  diagrams: MermaidDiagram[];
  className?: string;
}

interface SingleDiagramProps {
  diagram: MermaidDiagram;
  defaultExpanded?: boolean;
}

// ============================================================================
// Diagram Type Styling
// ============================================================================

const diagramTypeConfig: Record<MermaidDiagram['type'], { label: string; color: string }> = {
  architecture: { label: 'Architecture', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  data_flow: { label: 'Data Flow', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  sequence: { label: 'Sequence', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  entity_relationship: { label: 'ER Diagram', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

// ============================================================================
// Mermaid Renderer
// ============================================================================

function MermaidRenderer({ code, id }: { code: string; id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const renderDiagram = async () => {
      try {
        // Dynamic import of mermaid
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: '#e5e7eb',
            primaryBorderColor: '#4b5563',
            lineColor: '#6b7280',
            secondaryColor: '#1f2937',
            tertiaryColor: '#111827',
            background: '#0a0a0b',
            mainBkg: '#111827',
            nodeBorder: '#4b5563',
            clusterBkg: '#1f2937',
            clusterBorder: '#374151',
            titleColor: '#f3f4f6',
            edgeLabelBackground: '#1f2937',
          },
          securityLevel: 'strict',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        });

        const { svg } = await mermaid.render(`mermaid-${id}`, code);

        if (mounted) {
          setRendered(svg);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      }
    };

    void renderDiagram();

    return () => {
      mounted = false;
    };
  }, [code, id]);

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-accent-error/10 border border-accent-error/30">
        <p className="text-sm text-accent-error font-medium">Failed to render diagram</p>
        <p className="text-xs text-accent-error/70 mt-1">{error}</p>
      </div>
    );
  }

  if (!rendered) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-text-tertiary">
          <div className="w-5 h-5 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
          <span className="text-sm">Rendering diagram...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container overflow-x-auto p-4"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

// ============================================================================
// Single Diagram Card
// ============================================================================

function SingleDiagram({ diagram, defaultExpanded = true }: SingleDiagramProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const typeConfig = diagramTypeConfig[diagram.type];

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(diagram.mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [diagram.mermaidCode]);

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-bg-tertiary border-b border-border-subtle cursor-pointer hover:bg-bg-hover transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-text-tertiary" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-text-tertiary" />
          )}

          <h3 className="text-sm font-semibold text-text-primary">{diagram.title}</h3>

          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
        </div>

        {/* Actions (prevent collapse on click) */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setViewMode('preview')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'preview'
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
            title="Preview"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'code'
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
            title="View code"
          >
            <CodeBracketIcon className="w-4 h-4" />
          </button>
          <button
            onClick={copyCode}
            className="p-1.5 rounded text-text-tertiary hover:text-text-secondary transition-colors"
            title={copied ? 'Copied!' : 'Copy code'}
          >
            <DocumentDuplicateIcon className={`w-4 h-4 ${copied ? 'text-accent-success' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div>
          {/* Description */}
          {diagram.description && (
            <p className="px-4 py-2 text-sm text-text-secondary border-b border-border-subtle">
              {diagram.description}
            </p>
          )}

          {/* Diagram or Code */}
          {viewMode === 'preview' ? (
            <div className="bg-bg-primary">
              <MermaidRenderer code={diagram.mermaidCode} id={diagram.id} />
            </div>
          ) : (
            <div className="relative">
              <pre className="p-4 bg-bg-primary text-sm font-mono text-text-secondary overflow-x-auto">
                <code>{diagram.mermaidCode}</code>
              </pre>
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

export function MermaidDiagramViewer({ diagrams, className = '' }: MermaidDiagramViewerProps) {
  if (diagrams.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center mb-4">
          <ChartBarIcon className="w-6 h-6 text-text-secondary" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">No diagrams yet</h3>
        <p className="text-xs text-text-tertiary max-w-xs">
          Diagrams will appear here as you complete the planning phases.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {diagrams.map((diagram, index) => (
        <SingleDiagram
          key={diagram.id}
          diagram={diagram}
          defaultExpanded={index === 0}
        />
      ))}
    </div>
  );
}
