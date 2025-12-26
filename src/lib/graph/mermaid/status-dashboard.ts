/**
 * @sys/graph/mermaid - Status Dashboard Generator
 *
 * Generates a complete markdown dashboard with workflow diagram
 * and status summary, wrapped in HTML markers for idempotent updates.
 */

import { generateWorkflowDiagram, wrapInCodeFence, type WorkflowDiagramConfig } from './workflow-diagram';

/**
 * Configuration for the status dashboard.
 */
export interface DashboardConfig {
  /** Unique identifier for the dashboard marker */
  markerId: string;

  /** Current task description */
  currentTask: string;

  /** Current retry attempt (1-based) */
  retryAttempt?: number;

  /** Maximum retry attempts */
  maxRetries?: number;

  /** URL to GitHub Actions run logs */
  actionsRunUrl?: string;

  /** When the workflow started */
  startedAt?: string;

  /** Custom title for the dashboard */
  title?: string;
}

/**
 * Generates the status summary table as markdown.
 *
 * @param config - Dashboard configuration
 * @returns Markdown table string
 */
function generateStatusTable(config: DashboardConfig): string {
  const rows: Array<[string, string]> = [];

  // Current task
  rows.push(['**Current Task**', config.currentTask || '_No task_']);

  // Retry info
  if (config.retryAttempt !== undefined) {
    const max = config.maxRetries ?? 3;
    rows.push(['**Attempt**', `${config.retryAttempt} / ${max}`]);
  }

  // Actions link
  if (config.actionsRunUrl !== undefined && config.actionsRunUrl !== null && config.actionsRunUrl !== '') {
    rows.push(['**Actions**', `[View Logs →](${config.actionsRunUrl})`]);
  }

  // Build table
  const lines = ['| Field | Value |', '|-------|-------|'];
  for (const [field, value] of rows) {
    lines.push(`| ${field} | ${value} |`);
  }

  return lines.join('\n');
}

/**
 * Formats a timestamp for display.
 *
 * @param isoString - ISO 8601 timestamp string
 * @returns Formatted timestamp string
 */
function formatTimestamp(isoString?: string): string {
  if (isoString === undefined || isoString === null || isoString === '') {
    return new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  }

  try {
    const date = new Date(isoString);
    return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  } catch {
    return isoString;
  }
}

/**
 * Generates a complete status dashboard with diagram and summary.
 *
 * The dashboard is wrapped in HTML comment markers for idempotent updates:
 * <!-- foundry-workflow-dashboard:${markerId} -->
 * ...content...
 * <!-- /foundry-workflow-dashboard:${markerId} -->
 *
 * @param diagramConfig - Configuration for the workflow diagram
 * @param dashboardConfig - Configuration for the status summary
 * @returns Complete markdown dashboard with markers
 *
 * @example
 * ```typescript
 * const dashboard = generateStatusDashboard(
 *   {
 *     nodes: [
 *       { id: 'PLAN', status: 'completed' },
 *       { id: 'BUILD', status: 'active' },
 *     ],
 *     edges: [{ from: 'PLAN', to: 'BUILD' }],
 *     activeNode: 'BUILD',
 *   },
 *   {
 *     markerId: 'feature-123',
 *     currentTask: 'Implementing error handling',
 *     retryAttempt: 1,
 *     maxRetries: 3,
 *     actionsRunUrl: 'https://github.com/org/repo/actions/runs/12345',
 *   }
 * );
 * ```
 */
export function generateStatusDashboard(
  diagramConfig: WorkflowDiagramConfig,
  dashboardConfig: DashboardConfig
): string {
  const { markerId, title = 'Workflow Status' } = dashboardConfig;

  // Generate components
  const diagram = generateWorkflowDiagram(diagramConfig);
  const mermaidBlock = wrapInCodeFence(diagram);
  const statusTable = generateStatusTable(dashboardConfig);
  const timestamp = formatTimestamp();

  // Build dashboard
  const startMarker = `<!-- foundry-workflow-dashboard:${markerId} -->`;
  const endMarker = `<!-- /foundry-workflow-dashboard:${markerId} -->`;

  const content = [
    startMarker,
    `## ${title}`,
    '',
    mermaidBlock,
    '',
    statusTable,
    '',
    `<sub>Updated: ${timestamp}</sub>`,
    endMarker,
  ];

  return content.join('\n');
}

/**
 * Extracts the marker ID from a dashboard marker comment.
 *
 * @param marker - The full marker string
 * @returns The marker ID or null if not a valid marker
 */
export function extractMarkerId(marker: string): string | null {
  const match = marker.match(/<!-- foundry-workflow-dashboard:([^>]+) -->/);
  return match ? match[1]!.trim() : null;
}

/**
 * Creates start and end marker strings for a given ID.
 *
 * @param markerId - The unique marker identifier
 * @returns Object with start and end marker strings
 */
export function createMarkers(markerId: string): { start: string; end: string } {
  return {
    start: `<!-- foundry-workflow-dashboard:${markerId} -->`,
    end: `<!-- /foundry-workflow-dashboard:${markerId} -->`,
  };
}

/**
 * Escapes special regex characters in a string.
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in RegExp
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Updates or appends a dashboard section in existing content.
 *
 * @param existingContent - The current PR body or content
 * @param dashboard - The new dashboard content (with markers)
 * @param markerId - The marker ID to find/replace
 * @param position - Where to append if marker not found
 * @returns Updated content with dashboard
 */
export function updateDashboardInContent(
  existingContent: string,
  dashboard: string,
  markerId: string,
  position: 'top' | 'bottom' = 'bottom'
): string {
  const { start, end } = createMarkers(markerId);

  // Check if marker exists
  if (existingContent.includes(start)) {
    // Replace existing section
    const startEscaped = escapeRegex(start);
    const endEscaped = escapeRegex(end);
    const regex = new RegExp(`${startEscaped}[\\s\\S]*?${endEscaped}`, 'g');
    return existingContent.replace(regex, dashboard);
  }

  // Append at specified position
  if (position === 'top') {
    return `${dashboard}\n\n${existingContent}`;
  }

  return `${existingContent}\n\n${dashboard}`;
}

/**
 * Checks if content contains a dashboard section.
 *
 * @param content - Content to check
 * @param markerId - Optional specific marker ID to look for
 * @returns True if dashboard section exists
 */
export function hasDashboard(content: string, markerId?: string): boolean {
  if (markerId !== undefined && markerId !== null && markerId !== '') {
    const { start } = createMarkers(markerId);
    return content.includes(start);
  }

  return content.includes('<!-- foundry-workflow-dashboard:');
}
