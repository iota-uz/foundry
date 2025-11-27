/**
 * Date formatting utilities
 */

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Parse ISO timestamp to Date
 */
export function parseISO(timestamp: string): Date {
  return new Date(timestamp);
}

/**
 * Format date for display
 */
export function formatDate(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format date relative to now (e.g., "2 hours ago")
 */
export function formatRelative(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  const nowTime = Date.now();
  const diffMs = nowTime - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  return formatDate(date);
}

/**
 * Calculate duration between two timestamps in milliseconds
 */
export function duration(start: string, end: string): number {
  return parseISO(end).getTime() - parseISO(start).getTime();
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Check if a timestamp is expired
 */
export function isExpired(expiresAt: string): boolean {
  return parseISO(expiresAt).getTime() < Date.now();
}

/**
 * Add duration to a timestamp
 */
export function addDuration(timestamp: string, ms: number): string {
  const date = parseISO(timestamp);
  date.setTime(date.getTime() + ms);
  return date.toISOString();
}
