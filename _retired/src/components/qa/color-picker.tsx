'use client';

/**
 * Color Picker Component
 *
 * Simple color picker with preset colors and hex input.
 * Used for color-related answers.
 */

import { useState, useCallback } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  showHexInput?: boolean;
  showPreview?: boolean;
  disabled?: boolean;
}

const DEFAULT_PRESETS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6b7280', // Gray
  '#000000', // Black
  '#ffffff', // White
];

function isValidHex(hex: string | undefined): boolean {
  if (!hex) return false;
  return /^#[0-9A-F]{6}$/i.test(hex);
}

export function ColorPicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  showHexInput = true,
  showPreview = true,
  disabled = false,
}: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showPresets, setShowPresets] = useState(true);

  const validHex = isValidHex(value);

  const handleColorChange = useCallback(
    (newColor: string) => {
      if (isValidHex(newColor)) {
        onChange(newColor);
        setInputValue(newColor);
      }
    },
    [onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      if (isValidHex(newValue)) {
        handleColorChange(newValue);
      }
    },
    [handleColorChange]
  );

  const handleInputBlur = useCallback(() => {
    if (!isValidHex(inputValue)) {
      setInputValue(value);
    }
  }, [inputValue, value]);

  const handlePresetClick = useCallback(
    (color: string) => {
      handleColorChange(color);
    },
    [handleColorChange]
  );

  const handleNativeColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleColorChange(e.target.value);
    },
    [handleColorChange]
  );

  return (
    <div className="w-full space-y-3">
      {/* Preview */}
      {showPreview && (
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-lg border-2 border-gray-600"
            style={{ backgroundColor: validHex ? value : '#6b7280' }}
          />
          <div>
            <p className="text-sm font-medium text-white">Selected Color</p>
            <p className="text-xs text-gray-400">
              {validHex ? value : 'Enter valid hex color'}
            </p>
          </div>
        </div>
      )}

      {/* Native color input (for fallback) */}
      <div className="hidden">
        <input
          type="color"
          value={validHex ? value : '#3b82f6'}
          onChange={handleNativeColorChange}
          disabled={disabled}
        />
      </div>

      {/* Hex input */}
      {showHexInput && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Hex Color
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="#3b82f6"
            disabled={disabled}
            className={`w-full rounded-lg border bg-gray-800 px-3 py-2 font-mono text-white placeholder-gray-500 transition-colors focus:outline-none ${
              isValidHex(inputValue)
                ? 'border-blue-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                : 'border-red-600 focus:border-red-600 focus:ring-1 focus:ring-red-600'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          />
          {!isValidHex(inputValue) && inputValue !== '' && (
            <p className="mt-1 text-xs text-red-400">
              Must be a valid hex color (e.g., #3b82f6)
            </p>
          )}
        </div>
      )}

      {/* Presets */}
      {presets.length > 0 && (
        <div>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="mb-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            disabled={disabled}
          >
            {showPresets ? '▼' : '▶'} Preset Colors
          </button>

          {showPresets && (
            <div className="grid grid-cols-5 gap-2">
              {presets.map((color) => (
                <button
                  key={color}
                  onClick={() => handlePresetClick(color)}
                  disabled={disabled}
                  className={`h-10 w-full rounded-lg border-2 transition-all ${
                    value === color
                      ? 'border-blue-500 ring-2 ring-blue-400'
                      : 'border-gray-600 hover:border-gray-500'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  style={{ backgroundColor: color }}
                  title={color}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
