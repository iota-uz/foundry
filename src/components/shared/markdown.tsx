'use client';

/**
 * Markdown Renderer
 *
 * Renders GitHub-flavored Markdown content with proper styling.
 * Used for issue descriptions, comments, and other user-generated content.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Renders Markdown content with GitHub-flavored Markdown support.
 * Includes styling for headings, lists, code blocks, tables, etc.
 */
export function Markdown({ children, className = '' }: MarkdownProps) {
  return (
    <div className={`prose prose-sm prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-text-primary mt-6 mb-3 first:mt-0 border-b border-border-default pb-2">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold text-text-primary mt-5 mb-2 first:mt-0 border-b border-border-default pb-1">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold text-text-primary mt-4 mb-2 first:mt-0">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold text-text-primary mt-3 mb-1 first:mt-0">
            {children}
          </h4>
        ),

        // Paragraphs
        p: ({ children }) => (
          <p className="text-sm text-text-secondary leading-relaxed my-3 first:mt-0 last:mb-0">
            {children}
          </p>
        ),

        // Lists
        ul: ({ children }) => (
          <ul className="text-sm text-text-secondary list-disc list-outside pl-5 my-3 space-y-1">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="text-sm text-text-secondary list-decimal list-outside pl-5 my-3 space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-text-secondary">{children}</li>
        ),

        // Task lists (GFM)
        input: ({ checked }) => (
          <input
            type="checkbox"
            checked={checked}
            disabled
            className="mr-2 rounded border-border-default"
          />
        ),

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            {children}
          </a>
        ),

        // Code
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded bg-bg-tertiary text-accent-primary text-xs font-mono">
                {children}
              </code>
            );
          }
          // Block code is handled by pre
          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre className="bg-bg-tertiary rounded-lg p-4 my-3 overflow-x-auto text-xs font-mono text-text-secondary border border-border-default">
            {children}
          </pre>
        ),

        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-accent-primary/50 pl-4 my-3 text-text-tertiary italic">
            {children}
          </blockquote>
        ),

        // Tables (GFM)
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-border-default rounded-lg overflow-hidden">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-bg-tertiary">{children}</thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b border-border-default last:border-b-0">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-semibold text-text-primary border-r border-border-default last:border-r-0">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-text-secondary border-r border-border-default last:border-r-0">
            {children}
          </td>
        ),

        // Horizontal rule
        hr: () => <hr className="my-6 border-border-default" />,

        // Images
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt || ''}
            className="max-w-full h-auto rounded-lg my-3 border border-border-default"
          />
        ),

        // Strong/Bold
        strong: ({ children }) => (
          <strong className="font-semibold text-text-primary">{children}</strong>
        ),

        // Emphasis/Italic
        em: ({ children }) => (
          <em className="italic text-text-secondary">{children}</em>
        ),

        // Strikethrough (GFM)
        del: ({ children }) => (
          <del className="line-through text-text-tertiary">{children}</del>
        ),
      }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
