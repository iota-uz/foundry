/**
 * Spec Differ Utility
 *
 * Generates diffs between spec versions for F15 - Live Spec Preview Panel.
 * Tracks changes at the field level for granular updates.
 */

export interface SpecDiff {
  type: 'feature' | 'module' | 'entity' | 'endpoint' | 'component';
  id: string;
  changes: FieldChange[];
  addedAt?: string;
  removedAt?: string;
}

export interface FieldChange {
  field: string;
  operation: 'add' | 'modify' | 'remove';
  oldValue?: any;
  newValue?: any;
  path?: string; // JSON path for nested fields
}

export interface SpecPreview {
  summary: {
    added: number;
    modified: number;
    removed: number;
    total: number;
  };
  diffs: SpecDiff[];
  timestamp: string;
}

/**
 * Compare two spec objects and generate diff
 */
export function generateSpecDiff(
  oldSpec: Record<string, any>,
  newSpec: Record<string, any>,
  type: SpecDiff['type'],
  id: string
): SpecDiff {
  const changes: FieldChange[] = [];

  // Find all keys from both specs
  const allKeys = new Set([...Object.keys(oldSpec), ...Object.keys(newSpec)]);

  for (const key of allKeys) {
    const oldValue = oldSpec[key];
    const newValue = newSpec[key];

    if (!(key in oldSpec)) {
      // Field was added
      changes.push({
        field: key,
        operation: 'add',
        newValue,
      });
    } else if (!(key in newSpec)) {
      // Field was removed
      changes.push({
        field: key,
        operation: 'remove',
        oldValue,
      });
    } else if (!deepEqual(oldValue, newValue)) {
      // Field was modified
      if (typeof oldValue === 'object' && typeof newValue === 'object') {
        // Nested object change
        const nestedChanges = compareNestedObjects(oldValue, newValue, key);
        changes.push(...nestedChanges);
      } else {
        changes.push({
          field: key,
          operation: 'modify',
          oldValue,
          newValue,
        });
      }
    }
  }

  return {
    type,
    id,
    changes,
  };
}

/**
 * Compare nested objects recursively
 */
function compareNestedObjects(
  oldObj: any,
  newObj: any,
  parentPath: string
): FieldChange[] {
  const changes: FieldChange[] = [];

  // Handle arrays
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    if (oldObj.length !== newObj.length || !deepEqual(oldObj, newObj)) {
      changes.push({
        field: parentPath,
        operation: 'modify',
        oldValue: oldObj,
        newValue: newObj,
        path: parentPath,
      });
    }
    return changes;
  }

  // Handle objects
  if (typeof oldObj === 'object' && typeof newObj === 'object') {
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      const path = `${parentPath}.${key}`;
      const oldValue = oldObj[key];
      const newValue = newObj[key];

      if (!(key in oldObj)) {
        changes.push({
          field: key,
          operation: 'add',
          newValue,
          path,
        });
      } else if (!(key in newObj)) {
        changes.push({
          field: key,
          operation: 'remove',
          oldValue,
          path,
        });
      } else if (!deepEqual(oldValue, newValue)) {
        if (typeof oldValue === 'object' && typeof newValue === 'object') {
          changes.push(...compareNestedObjects(oldValue, newValue, path));
        } else {
          changes.push({
            field: key,
            operation: 'modify',
            oldValue,
            newValue,
            path,
          });
        }
      }
    }
  }

  return changes;
}

/**
 * Deep equality check
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => deepEqual(val, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Generate a preview summary from multiple diffs
 */
export function generatePreviewSummary(diffs: SpecDiff[]): SpecPreview['summary'] {
  const summary = {
    added: 0,
    modified: 0,
    removed: 0,
    total: 0,
  };

  for (const diff of diffs) {
    if (diff.addedAt) {
      summary.added++;
    } else if (diff.removedAt) {
      summary.removed++;
    }

    for (const change of diff.changes) {
      if (change.operation === 'add') {
        summary.added++;
      } else if (change.operation === 'modify') {
        summary.modified++;
      } else if (change.operation === 'remove') {
        summary.removed++;
      }
    }

    summary.total = summary.added + summary.modified + summary.removed;
  }

  return summary;
}

/**
 * Format a field change for display
 */
export function formatFieldChange(change: FieldChange): string {
  const fieldName = change.path || change.field;

  switch (change.operation) {
    case 'add':
      return `+ ${fieldName}: ${formatValue(change.newValue)}`;
    case 'remove':
      return `- ${fieldName}: ${formatValue(change.oldValue)}`;
    case 'modify':
      return `~ ${fieldName}: ${formatValue(change.oldValue)} → ${formatValue(change.newValue)}`;
  }
}

/**
 * Format a value for display
 */
function formatValue(value: any): string {
  if (value == null) {
    return 'null';
  }

  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 50) {
      return `"${value.substring(0, 47)}..."`;
    }
    return `"${value}"`;
  }

  if (typeof value === 'boolean') {
    return value.toString();
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    if (value.length > 3) {
      return `[${value.slice(0, 3).map(formatValue).join(', ')}, ... (${value.length} items)]`;
    }
    return `[${value.map(formatValue).join(', ')}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return '{}';
    }
    if (keys.length > 3) {
      return `{ ${keys.slice(0, 3).join(', ')}, ... (${keys.length} fields) }`;
    }
    return `{ ${keys.join(', ')} }`;
  }

  return String(value);
}

/**
 * Generate unified diff format (for text display)
 */
export function generateUnifiedDiff(oldText: string, newText: string): string {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const diff: string[] = [];
  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      // Only new lines remain
      diff.push(`+ ${newLines[j]}`);
      j++;
    } else if (j >= newLines.length) {
      // Only old lines remain
      diff.push(`- ${oldLines[i]}`);
      i++;
    } else if (oldLines[i] === newLines[j]) {
      // Lines match
      diff.push(`  ${oldLines[i]}`);
      i++;
      j++;
    } else {
      // Lines differ
      diff.push(`- ${oldLines[i]}`);
      diff.push(`+ ${newLines[j]}`);
      i++;
      j++;
    }
  }

  return diff.join('\n');
}

/**
 * Highlight changes in text with HTML
 */
export function highlightChanges(change: FieldChange): {
  oldHtml?: string;
  newHtml?: string;
} {
  const result: { oldHtml?: string; newHtml?: string } = {};

  if (change.operation === 'add') {
    result.newHtml = `<span class="text-green-400 bg-green-900/30">${escapeHtml(
      formatValue(change.newValue)
    )}</span>`;
  } else if (change.operation === 'remove') {
    result.oldHtml = `<span class="text-red-400 bg-red-900/30 line-through">${escapeHtml(
      formatValue(change.oldValue)
    )}</span>`;
  } else if (change.operation === 'modify') {
    result.oldHtml = `<span class="text-red-400 bg-red-900/30">${escapeHtml(
      formatValue(change.oldValue)
    )}</span>`;
    result.newHtml = `<span class="text-green-400 bg-green-900/30">${escapeHtml(
      formatValue(change.newValue)
    )}</span>`;
  }

  return result;
}

/**
 * Escape HTML for safe rendering
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Group changes by type for better organization
 */
export function groupChangesByType(diffs: SpecDiff[]): Record<string, SpecDiff[]> {
  const grouped: Record<string, SpecDiff[]> = {};

  for (const diff of diffs) {
    if (!grouped[diff.type]) {
      grouped[diff.type] = [];
    }
    grouped[diff.type]!.push(diff);
  }

  return grouped;
}
