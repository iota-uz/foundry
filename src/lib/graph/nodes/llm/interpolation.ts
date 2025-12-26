/**
 * Prompt Interpolation Utility
 *
 * Provides variable interpolation for prompts using {{variable}} syntax.
 * Supports nested object access via dot notation (e.g., {{user.name}}).
 */

/**
 * Get a nested value from an object using dot notation path.
 * @param obj The object to traverse
 * @param path The dot-notation path (e.g., "user.profile.name")
 * @returns The value at the path, or undefined if not found
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Format a value for string interpolation.
 * Objects and arrays are JSON stringified.
 * @param value The value to format
 * @returns String representation of the value
 */
function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Interpolate variables in a template string.
 * Replaces {{variable}} patterns with values from the context.
 *
 * @param template The template string with {{variable}} placeholders
 * @param context The context object containing variable values
 * @returns The interpolated string
 *
 * @example
 * ```typescript
 * const result = interpolatePrompt(
 *   'Hello {{user.name}}, your order {{orderId}} is ready.',
 *   { user: { name: 'Alice' }, orderId: 123 }
 * );
 * // Result: 'Hello Alice, your order 123 is ready.'
 * ```
 */
export function interpolatePrompt(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path: string) => {
    const trimmedPath = path.trim();
    const value = getNestedValue(context, trimmedPath);

    if (value === undefined) {
      // Keep the original placeholder if value not found
      return match;
    }

    return formatValue(value);
  });
}

/**
 * Check if a template contains any interpolation placeholders.
 * @param template The template string to check
 * @returns True if the template contains {{...}} patterns
 */
export function hasInterpolation(template: string): boolean {
  return /\{\{[^}]+\}\}/.test(template);
}

/**
 * Extract all variable paths from a template.
 * @param template The template string
 * @returns Array of variable paths found in the template
 *
 * @example
 * ```typescript
 * const paths = extractVariables('Hello {{user.name}}, order {{orderId}}');
 * // Result: ['user.name', 'orderId']
 * ```
 */
export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{([^}]+)\}\}/g);
  return Array.from(matches).map((m) => m[1]?.trim() ?? '').filter(Boolean);
}
