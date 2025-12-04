/**
 * Diff utilities for tracking changes and undo operations
 */

/**
 * Deep clone an object
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Compare two objects and return differences
 */
export interface DiffResult {
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  modified: Record<string, { before: unknown; after: unknown }>;
}

export function diff(before: unknown, after: unknown): DiffResult {
  const result: DiffResult = {
    added: {},
    removed: {},
    modified: {},
  };

  // Handle null/undefined cases
  if (before === null || before === undefined) {
    return { added: { root: after }, removed: {}, modified: {} };
  }
  if (after === null || after === undefined) {
    return { added: {}, removed: { root: before }, modified: {} };
  }

  // Handle primitive types
  if (typeof before !== 'object' || typeof after !== 'object') {
    if (before !== after) {
      return {
        added: {},
        removed: {},
        modified: { root: { before, after } },
      };
    }
    return result;
  }

  // Handle arrays
  if (Array.isArray(before) && Array.isArray(after)) {
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      result.modified.root = { before, after };
    }
    return result;
  }

  // Handle objects
  const beforeKeys = Object.keys(before);
  const afterKeys = Object.keys(after);

  // Find added keys
  afterKeys.forEach((key) => {
    if (!beforeKeys.includes(key)) {
      result.added[key] = after[key];
    }
  });

  // Find removed keys
  beforeKeys.forEach((key) => {
    if (!afterKeys.includes(key)) {
      result.removed[key] = before[key];
    }
  });

  // Find modified keys
  beforeKeys.forEach((key) => {
    if (afterKeys.includes(key)) {
      const beforeValue = before[key];
      const afterValue = after[key];

      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        result.modified[key] = { before: beforeValue, after: afterValue };
      }
    }
  });

  return result;
}

/**
 * Apply a diff to restore previous state
 */
export function applyReverseDiff(current: unknown, diffResult: DiffResult): unknown {
  const restored = deepClone(current);

  // Remove added keys
  Object.keys(diffResult.added).forEach((key) => {
    if (key === 'root') return;
    delete restored[key];
  });

  // Restore removed keys
  Object.keys(diffResult.removed).forEach((key) => {
    if (key === 'root') return;
    restored[key] = diffResult.removed[key];
  });

  // Restore modified keys to before state
  Object.keys(diffResult.modified).forEach((key) => {
    if (key === 'root') return;
    const modified = diffResult.modified[key];
    if (modified) {
      restored[key] = modified.before;
    }
  });

  return restored;
}

/**
 * Create a snapshot of an object for undo/redo
 */
export function snapshot<T>(obj: T): string {
  return JSON.stringify(obj);
}

/**
 * Restore an object from a snapshot
 */
export function restore<T>(snapshotStr: string): T {
  return JSON.parse(snapshotStr);
}

/**
 * Check if two objects are equal
 */
export function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
