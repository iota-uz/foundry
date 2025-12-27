/**
 * Config Fields
 *
 * Reusable form field components for workflow builder configuration panels.
 * Designed with an industrial, refined aesthetic matching the workflow builder style.
 */

'use client';

import React, { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// Toggle Field
// ============================================================================

interface ToggleFieldProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  accentColor?: string;
}

export function ToggleField({
  label,
  description,
  value,
  onChange,
  accentColor,
}: ToggleFieldProps) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer group py-1">
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">
          {label}
        </span>
        {description && (
          <p className="text-[10px] text-text-muted mt-0.5">{description}</p>
        )}
      </div>
      <ToggleSwitch
        checked={value}
        onChange={onChange}
        {...(accentColor && { accentColor })}
      />
    </label>
  );
}

// ============================================================================
// Toggle Switch (Standalone)
// ============================================================================

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Optional inline label (use ToggleField for label + description) */
  label?: string;
  accentColor?: string;
}

/**
 * Standalone toggle switch component.
 * Use ToggleField when you need label + description, or ToggleSwitch for just the switch.
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  accentColor,
}: ToggleSwitchProps) {
  const switchButton = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative w-8 h-5 rounded-full transition-colors duration-150 flex-shrink-0
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary
        ${checked ? '' : 'bg-bg-tertiary border border-border-default'}
      `}
      style={{
        background: checked ? (accentColor ?? 'var(--color-accent-primary)') : undefined,
        '--tw-ring-color': checked ? (accentColor ?? 'var(--color-accent-primary)') : 'var(--color-accent-primary)',
      } as React.CSSProperties}
    >
      <span
        className={`
          absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm
          transition-all duration-150
          ${checked ? 'left-auto right-0.5' : 'left-0.5 right-auto'}
        `}
      />
    </button>
  );

  // If no label, just return the switch
  if (!label) {
    return switchButton;
  }

  // With label, wrap in a flex container
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
        {label}
      </span>
      {switchButton}
    </label>
  );
}

// ============================================================================
// Number Field
// ============================================================================

interface NumberFieldProps {
  label: string;
  description?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  accentColor?: string;
}

export function NumberField({
  label,
  description,
  value,
  onChange,
  placeholder,
  min,
  max,
  step = 1,
  suffix,
  accentColor,
}: NumberFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <div
        className={`
          relative flex items-center h-8 bg-bg-primary border rounded-lg overflow-hidden
          transition-all duration-150
          ${focused ? 'border-border-hover' : 'border-border-default hover:border-border-hover'}
        `}
        style={{
          boxShadow: focused && accentColor ? `0 0 0 1px ${accentColor}30` : undefined,
        }}
      >
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v !== '' ? parseFloat(v) : undefined);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className="flex-1 h-full px-2.5 bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none font-mono"
        />
        {suffix && (
          <span className="pr-2.5 text-[10px] text-text-muted">{suffix}</span>
        )}
      </div>
      {description && (
        <p className="text-[10px] text-text-muted">{description}</p>
      )}
    </div>
  );
}

// ============================================================================
// Text Field
// ============================================================================

interface TextFieldProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  mono?: boolean;
  accentColor?: string;
}

export function TextField({
  label,
  description,
  value,
  onChange,
  placeholder,
  type = 'text',
  mono,
  accentColor,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <div
        className={`
          relative flex items-center h-8 bg-bg-primary border rounded-lg overflow-hidden
          transition-all duration-150
          ${focused ? 'border-border-hover' : 'border-border-default hover:border-border-hover'}
        `}
        style={{
          boxShadow: focused && accentColor ? `0 0 0 1px ${accentColor}30` : undefined,
        }}
      >
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={`
            flex-1 h-full px-2.5 bg-transparent text-xs text-text-primary
            placeholder:text-text-muted focus:outline-none
            ${mono ? 'font-mono' : ''}
          `}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="px-2 text-text-muted hover:text-text-secondary transition-colors"
          >
            {showPassword ? (
              <EyeSlashIcon className="w-3.5 h-3.5" />
            ) : (
              <EyeIcon className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
      {description && (
        <p className="text-[10px] text-text-muted">{description}</p>
      )}
    </div>
  );
}

// ============================================================================
// Key-Value Editor
// ============================================================================

interface KeyValueEditorProps {
  label: string;
  description?: string;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  accentColor?: string;
}

export function KeyValueEditor({
  label,
  description,
  value,
  onChange,
  keyPlaceholder = 'KEY',
  valuePlaceholder = 'value',
  accentColor,
}: KeyValueEditorProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const entries = Object.entries(value);

  const handleAdd = () => {
    if (!newKey.trim()) return;
    onChange({ ...value, [newKey.trim()]: newValue });
    setNewKey('');
    setNewValue('');
  };

  const handleRemove = (key: string) => {
    const updated = { ...value };
    delete updated[key];
    onChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-text-secondary">{label}</label>

      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map(([key, val]) => (
            <div
              key={key}
              className="flex items-center gap-1.5 group"
            >
              <div className="flex-1 flex items-center h-7 bg-bg-tertiary rounded-md overflow-hidden">
                <span className="px-2 text-[10px] font-mono font-semibold text-text-primary truncate max-w-[80px]">
                  {key}
                </span>
                <span className="text-text-muted">=</span>
                <span className="px-2 text-[10px] font-mono text-text-secondary truncate flex-1">
                  {val || <span className="italic text-text-muted">(empty)</span>}
                </span>
              </div>
              <button
                onClick={() => handleRemove(key)}
                className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center hover:bg-accent-error/10 text-text-muted hover:text-accent-error transition-all"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new entry */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder={keyPlaceholder}
          className="w-20 h-7 px-2 bg-bg-primary border border-border-default rounded-md text-[10px] font-mono font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors"
        />
        <span className="text-text-muted">=</span>
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={valuePlaceholder}
          className="flex-1 h-7 px-2 bg-bg-primary border border-border-default rounded-md text-[10px] font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!newKey.trim()}
          className={`
            w-6 h-6 rounded flex items-center justify-center transition-all
            ${newKey.trim()
              ? 'bg-bg-tertiary hover:bg-bg-primary text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-default'
              : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
            }
          `}
          style={{
            background: newKey.trim() && accentColor ? `${accentColor}15` : undefined,
            borderColor: newKey.trim() && accentColor ? `${accentColor}30` : undefined,
          }}
        >
          <PlusIcon className="w-3 h-3" />
        </button>
      </div>

      {description && (
        <p className="text-[10px] text-text-muted">{description}</p>
      )}
    </div>
  );
}

// ============================================================================
// Collapsible Section
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border-subtle">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronDownIcon className="w-3 h-3" />
        ) : (
          <ChevronRightIcon className="w-3 h-3" />
        )}
      </button>
      {isOpen && (
        <div className="pb-2 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Viewport Input (Dual Number Input)
// ============================================================================

interface ViewportInputProps {
  label: string;
  width: number | undefined;
  height: number | undefined;
  onChange: (width: number | undefined, height: number | undefined) => void;
  accentColor?: string;
}

export function ViewportInput({
  label,
  width,
  height,
  onChange,
  accentColor,
}: ViewportInputProps) {
  const [focused, setFocused] = useState<'width' | 'height' | null>(null);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <div className="flex items-center gap-2">
        <div
          className={`
            flex-1 flex items-center h-8 bg-bg-primary border rounded-lg overflow-hidden
            transition-all duration-150
            ${focused === 'width' ? 'border-border-hover' : 'border-border-default hover:border-border-hover'}
          `}
          style={{
            boxShadow: focused === 'width' && accentColor ? `0 0 0 1px ${accentColor}30` : undefined,
          }}
        >
          <span className="pl-2.5 text-[10px] text-text-muted">W</span>
          <input
            type="number"
            value={width ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v !== '' ? parseInt(v) : undefined, height);
            }}
            onFocus={() => setFocused('width')}
            onBlur={() => setFocused(null)}
            placeholder="1280"
            min={320}
            max={3840}
            className="flex-1 h-full px-1.5 bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none font-mono text-right"
          />
          <span className="pr-2.5 text-[10px] text-text-muted">px</span>
        </div>
        <span className="text-text-muted text-xs">×</span>
        <div
          className={`
            flex-1 flex items-center h-8 bg-bg-primary border rounded-lg overflow-hidden
            transition-all duration-150
            ${focused === 'height' ? 'border-border-hover' : 'border-border-default hover:border-border-hover'}
          `}
          style={{
            boxShadow: focused === 'height' && accentColor ? `0 0 0 1px ${accentColor}30` : undefined,
          }}
        >
          <span className="pl-2.5 text-[10px] text-text-muted">H</span>
          <input
            type="number"
            value={height ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange(width, v !== '' ? parseInt(v) : undefined);
            }}
            onFocus={() => setFocused('height')}
            onBlur={() => setFocused(null)}
            placeholder="720"
            min={240}
            max={2160}
            className="flex-1 h-full px-1.5 bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none font-mono text-right"
          />
          <span className="pr-2.5 text-[10px] text-text-muted">px</span>
        </div>
      </div>
    </div>
  );
}
