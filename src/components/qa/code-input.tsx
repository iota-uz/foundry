'use client';

/**
 * Code Input Component
 *
 * Code editor with syntax highlighting for code answers.
 * Used for code-related questions.
 */

import { useState, useCallback } from 'react';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  disabled?: boolean;
}

export function CodeInput({
  value,
  onChange,
  language = 'javascript',
  placeholder = 'Enter code...',
  maxLength,
  rows = 8,
  readOnly = false,
  showLineNumbers = true,
  disabled = false,
}: CodeInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (!maxLength || newValue.length <= maxLength) {
        onChange(newValue);
      }
    },
    [onChange, maxLength]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle tab key for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + '\t' + value.substring(end);
        onChange(newValue);

        // Move cursor after inserted tab
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }
    },
    [value, onChange]
  );

  const lineCount = value.split('\n').length;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span className="font-semibold">{language.toUpperCase()}</span>
        {maxLength && (
          <span>
            {value.length} / {maxLength}
          </span>
        )}
      </div>

      <div className={`rounded-lg border ${
        focused
          ? 'border-blue-600 ring-1 ring-blue-600'
          : 'border-gray-700'
      } overflow-hidden bg-gray-900`}>
        <div className="flex">
          {/* Line numbers */}
          {showLineNumbers && (
            <div className="flex flex-col bg-gray-950 px-3 py-2 text-right text-gray-600 font-mono text-sm leading-relaxed select-none">
              {Array.from({ length: lineCount }, (_, i) => (
                <span key={i + 1}>{i + 1}</span>
              ))}
            </div>
          )}

          {/* Code textarea */}
          <textarea
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            disabled={disabled || readOnly}
            readOnly={readOnly}
            rows={rows}
            spellCheck="false"
            className="flex-1 bg-gray-900 px-4 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Courier, monospace',
              tabSize: 2,
            }}
          />
        </div>
      </div>

      {/* Language note */}
      <p className="mt-2 text-xs text-gray-500">
        Language: <span className="font-semibold text-gray-400">{language}</span>
        {!readOnly && <span> • Tab to indent</span>}
      </p>
    </div>
  );
}
