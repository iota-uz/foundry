/**
 * DSL Drawer Component
 *
 * Slide-out panel displaying live TypeScript DSL preview.
 * Features:
 * - Custom syntax highlighting for TypeScript
 * - Auto-regeneration on workflow changes
 * - Copy to clipboard with feedback
 * - Terminal-inspired code aesthetic
 */

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  XMarkIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  CodeBracketIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { useWorkflowBuilderStore } from '@/store';
import { generateDSL } from '@/lib/workflow-dsl';
import { Button } from '@/components/shared/button';

// ============================================================================
// Types
// ============================================================================

interface DSLDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Syntax Highlighter
// ============================================================================

/**
 * Custom TypeScript syntax highlighter
 * Applies color classes to different token types
 */
function highlightTypeScript(code: string): React.ReactNode[] {
  const lines = code.split('\n');

  return lines.map((line, lineIndex) => {
    const tokens: React.ReactNode[] = [];
    let remaining = line;
    let keyIndex = 0;

    // Process line with regex-based tokenization
    while (remaining.length > 0) {
      let matched = false;

      // Comments (// and /* */)
      const commentMatch = remaining.match(/^(\/\/.*|\/\*[\s\S]*?\*\/)/);
      if (commentMatch?.[1]) {
        tokens.push(
          <span key={keyIndex++} className="text-zinc-500 italic">
            {commentMatch[1]}
          </span>
        );
        remaining = remaining.slice(commentMatch[1].length);
        matched = true;
        continue;
      }

      // Template literals
      const templateMatch = remaining.match(/^`[^`]*`/);
      if (templateMatch) {
        tokens.push(
          <span key={keyIndex++} className="text-amber-400">
            {templateMatch[0]}
          </span>
        );
        remaining = remaining.slice(templateMatch[0].length);
        matched = true;
        continue;
      }

      // Strings
      const stringMatch = remaining.match(/^(['"])(?:(?!\1)[^\\]|\\.)*\1/);
      if (stringMatch) {
        tokens.push(
          <span key={keyIndex++} className="text-emerald-400">
            {stringMatch[0]}
          </span>
        );
        remaining = remaining.slice(stringMatch[0].length);
        matched = true;
        continue;
      }

      // Keywords
      const keywordMatch = remaining.match(
        /^(import|export|from|const|let|var|function|return|if|else|default|type|interface|as)\b/
      );
      if (keywordMatch?.[1]) {
        tokens.push(
          <span key={keyIndex++} className="text-purple-400 font-medium">
            {keywordMatch[1]}
          </span>
        );
        remaining = remaining.slice(keywordMatch[1].length);
        matched = true;
        continue;
      }

      // Types and special values
      const typeMatch = remaining.match(
        /^(true|false|null|undefined|Tools)\b/
      );
      if (typeMatch?.[1]) {
        tokens.push(
          <span key={keyIndex++} className="text-orange-400">
            {typeMatch[1]}
          </span>
        );
        remaining = remaining.slice(typeMatch[1].length);
        matched = true;
        continue;
      }

      // Numbers
      const numberMatch = remaining.match(/^\d+(\.\d+)?/);
      if (numberMatch) {
        tokens.push(
          <span key={keyIndex++} className="text-cyan-400">
            {numberMatch[0]}
          </span>
        );
        remaining = remaining.slice(numberMatch[0].length);
        matched = true;
        continue;
      }

      // Function calls and property access (before identifier check)
      const propMatch = remaining.match(/^(\w+)(?=\s*[:(])/);
      if (propMatch?.[1]) {
        tokens.push(
          <span key={keyIndex++} className="text-sky-400">
            {propMatch[1]}
          </span>
        );
        remaining = remaining.slice(propMatch[1].length);
        matched = true;
        continue;
      }

      // Identifiers
      const identMatch = remaining.match(/^[a-zA-Z_]\w*/);
      if (identMatch) {
        tokens.push(
          <span key={keyIndex++} className="text-zinc-200">
            {identMatch[0]}
          </span>
        );
        remaining = remaining.slice(identMatch[0].length);
        matched = true;
        continue;
      }

      // Operators and punctuation
      const opMatch = remaining.match(/^[{}[\](),:;=><+\-*/.@&|!?]+/);
      if (opMatch) {
        tokens.push(
          <span key={keyIndex++} className="text-zinc-400">
            {opMatch[0]}
          </span>
        );
        remaining = remaining.slice(opMatch[0].length);
        matched = true;
        continue;
      }

      // Whitespace
      const spaceMatch = remaining.match(/^\s+/);
      if (spaceMatch) {
        tokens.push(<span key={keyIndex++}>{spaceMatch[0]}</span>);
        remaining = remaining.slice(spaceMatch[0].length);
        matched = true;
        continue;
      }

      // Fallback: single character
      if (!matched) {
        tokens.push(<span key={keyIndex++}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
      }
    }

    return (
      <div key={lineIndex} className="table-row group">
        <span className="table-cell pr-4 text-right text-zinc-600 select-none text-xs w-10 group-hover:text-zinc-500">
          {lineIndex + 1}
        </span>
        <span className="table-cell">{tokens}</span>
      </div>
    );
  });
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function CodeSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="w-6 h-4 bg-zinc-800 rounded" />
          <div
            className="h-4 bg-zinc-800/50 rounded"
            style={{ width: `${Math.random() * 60 + 20}%` }}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DSLDrawer({ isOpen, onClose }: DSLDrawerProps) {
  const [dsl, setDsl] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get workflow data from store
  const nodes = useWorkflowBuilderStore((s) => s.nodes);
  const edges = useWorkflowBuilderStore((s) => s.edges);
  const metadata = useWorkflowBuilderStore((s) => s.metadata);

  // Generate DSL when drawer opens or workflow changes
  const regenerateDSL = useCallback(() => {
    if (!isOpen) return;

    setIsLoading(true);

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        const result = generateDSL(nodes, edges, metadata);
        setDsl(result.code);
        setWarnings(result.warnings);
      } catch (error) {
        setDsl(`// Error generating DSL\n// ${error instanceof Error ? error.message : 'Unknown error'}`);
        setWarnings([]);
      } finally {
        setIsLoading(false);
      }
    }, 50);
  }, [isOpen, nodes, edges, metadata]);

  useEffect(() => {
    regenerateDSL();
  }, [regenerateDSL]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dsl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = dsl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download as file
  const handleDownload = () => {
    const blob = new Blob([dsl], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.name?.toLowerCase().replace(/\s+/g, '-') || 'workflow'}.workflow.ts`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Memoize highlighted code
  const highlightedCode = useMemo(() => {
    if (!dsl) return null;
    return highlightTypeScript(dsl);
  }, [dsl]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/40 backdrop-blur-sm z-40
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed right-0 top-0 bottom-0 z-50
          w-[480px] max-w-[90vw]
          bg-zinc-950 border-l border-zinc-800
          shadow-2xl shadow-black/50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center">
                <CodeBracketIcon className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">TypeScript DSL</h2>
                <p className="text-xs text-zinc-500">Generated workflow code</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 px-4 pb-3">
            <Button
              size="sm"
              variant="secondary"
              icon={copied ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <DocumentDuplicateIcon className="w-4 h-4" />}
              onClick={handleCopy}
              disabled={isLoading || !dsl}
              className={copied ? 'border-emerald-500/30 bg-emerald-500/10' : ''}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              icon={<ArrowDownTrayIcon className="w-4 h-4" />}
              onClick={handleDownload}
              disabled={isLoading || !dsl}
            >
              Download
            </Button>

            {warnings.length > 0 && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Code viewer */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 min-h-full">
            {isLoading ? (
              <CodeSkeleton />
            ) : (
              <pre className="font-mono text-sm leading-relaxed table w-full">
                {highlightedCode}
              </pre>
            )}
          </div>
        </div>

        {/* Warnings panel */}
        {warnings.length > 0 && !isLoading && (
          <div className="flex-shrink-0 border-t border-zinc-800 bg-amber-500/5 px-4 py-3">
            <div className="text-xs font-medium text-amber-400 mb-2">Warnings</div>
            <ul className="space-y-1">
              {warnings.map((warning, i) => (
                <li key={i} className="text-xs text-amber-400/80 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">-</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-900/30 px-4 py-2.5">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {nodes.length} node{nodes.length !== 1 ? 's' : ''} · {edges.length} edge{edges.length !== 1 ? 's' : ''}
            </span>
            <span className="font-mono">
              {dsl.split('\n').length} lines
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
