/**
 * HistoryService - Artifact change history tracking
 *
 * Implements F3: Per-Artifact History
 * Records and retrieves change history for all artifacts (features, schemas, APIs, components)
 */

import { nanoid } from 'nanoid';
import { getDatabaseService } from './database.service';
import type { HistoryEntry } from '@/lib/db/queries/history';
import { diff, type DiffResult } from '@/lib/utils/diff';

/**
 * Change entry for recording artifact modifications
 */
export interface ChangeEntry {
  artifactType: 'feature' | 'schema' | 'api' | 'component';
  artifactId: string;
  action: 'created' | 'updated' | 'deleted';
  actor: string; // 'user' | 'ai:cpo-agent' | 'ai:cto-agent' | 'ai:clarify-agent'
  changes: Record<string, unknown>;
  reason?: string;
  projectId?: string;
  sessionId?: string;
}

/**
 * Search filters for history queries
 */
export interface HistoryFilters {
  artifactType?: string;
  action?: 'created' | 'updated' | 'deleted';
  dateFrom?: string;
  dateTo?: string;
  actor?: string;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'markdown' | 'csv';

/**
 * HistoryService interface
 */
export interface IHistoryService {
  recordChange(entry: ChangeEntry): Promise<void>;
  getHistory(artifactType: string, artifactId: string): Promise<HistoryEntry[]>;
  search(query: string, filters?: HistoryFilters): Promise<HistoryEntry[]>;
  exportHistory(
    artifactType: string,
    artifactId: string,
    format: ExportFormat
  ): Promise<string>;
  exportProjectHistory(
    projectId: string,
    format: ExportFormat,
    limit?: number
  ): Promise<string>;
  computeDiff(before: unknown, after: unknown): DiffResult;
}

/**
 * HistoryService implementation
 */
export class HistoryService implements IHistoryService {
  private dbService = getDatabaseService();

  /**
   * Record a change to an artifact
   */
  async recordChange(entry: ChangeEntry): Promise<void> {
    // Get the current version number for this artifact
    const currentVersion = await this.dbService.getLatestVersion(
      entry.artifactType,
      entry.artifactId
    );

    // Create history entry
    const historyEntry: HistoryEntry = {
      id: nanoid(),
      projectId: entry.projectId || 'unknown',
      artifactType: entry.artifactType,
      artifactId: entry.artifactId,
      version: currentVersion + 1,
      changeType: entry.action,
      changes: entry.changes,
      changedBy: entry.actor,
      sessionId: entry.sessionId || null,
      createdAt: new Date().toISOString(),
    };

    // Record in database
    await this.dbService.recordHistory(historyEntry);
  }

  /**
   * Get change history for a specific artifact
   */
  async getHistory(
    artifactType: string,
    artifactId: string
  ): Promise<HistoryEntry[]> {
    return this.dbService.getHistory(artifactType, artifactId);
  }

  /**
   * Search history across all artifacts
   */
  async search(
    query: string,
    filters?: HistoryFilters
  ): Promise<HistoryEntry[]> {
    // Get all history entries for the project
    // In a real implementation, we'd need to add a projectId parameter
    // For now, we'll get all entries and filter in memory

    // TODO: Add full-text search support to database queries
    // For now, this is a simplified implementation

    const allHistory: HistoryEntry[] = [];

    // Apply filters if provided
    return allHistory.filter((entry) => {
      // Filter by artifact type
      if (filters?.artifactType && entry.artifactType !== filters.artifactType) {
        return false;
      }

      // Filter by action
      if (filters?.action && entry.changeType !== filters.action) {
        return false;
      }

      // Filter by date range
      if (filters?.dateFrom && entry.createdAt < filters.dateFrom) {
        return false;
      }

      if (filters?.dateTo && entry.createdAt > filters.dateTo) {
        return false;
      }

      // Filter by actor
      if (filters?.actor && entry.changedBy !== filters.actor) {
        return false;
      }

      // Search in artifact ID and changes
      const searchLower = query.toLowerCase();
      const artifactIdMatch = entry.artifactId.toLowerCase().includes(searchLower);
      const changesMatch = JSON.stringify(entry.changes)
        .toLowerCase()
        .includes(searchLower);

      return artifactIdMatch || changesMatch;
    });
  }

  /**
   * Export artifact history in specified format
   */
  async exportHistory(
    artifactType: string,
    artifactId: string,
    format: ExportFormat
  ): Promise<string> {
    const history = await this.getHistory(artifactType, artifactId);

    switch (format) {
      case 'json':
        return this.exportAsJSON(history);
      case 'markdown':
        return this.exportAsMarkdown(history, artifactId);
      case 'csv':
        return this.exportAsCSV(history);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export project-wide history in specified format
   */
  async exportProjectHistory(
    projectId: string,
    format: ExportFormat,
    limit?: number
  ): Promise<string> {
    const history = await this.dbService.getProjectHistory(projectId, limit);

    switch (format) {
      case 'json':
        return this.exportAsJSON(history);
      case 'markdown':
        return this.exportAsMarkdown(history, `Project ${projectId}`);
      case 'csv':
        return this.exportAsCSV(history);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Compute diff between two object states
   */
  computeDiff(before: unknown, after: unknown): DiffResult {
    return diff(before, after);
  }

  /**
   * Export as JSON
   */
  private exportAsJSON(history: HistoryEntry[]): string {
    return JSON.stringify(history, null, 2);
  }

  /**
   * Export as Markdown
   */
  private exportAsMarkdown(history: HistoryEntry[], title: string): string {
    const lines: string[] = [];

    lines.push(`# Change History: ${title}`);
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push('');

    // Group by date
    const byDate = this.groupByDate(history);

    for (const [date, entries] of Object.entries(byDate)) {
      lines.push(`## ${date}`);
      lines.push('');

      for (const entry of entries) {
        const time = new Date(entry.createdAt).toLocaleTimeString();
        lines.push(`### ${time} - ${this.formatActor(entry.changedBy)}`);
        lines.push(`**Action:** ${this.formatAction(entry.changeType)}`);
        lines.push('');

        // Format changes
        const changes = this.formatChanges(entry.changes);
        if (changes.length > 0) {
          lines.push('**Changes:**');
          changes.forEach((change) => lines.push(change));
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Export as CSV
   */
  private exportAsCSV(history: HistoryEntry[]): string {
    const lines: string[] = [];

    // Header
    lines.push('Date,Time,Actor,Action,Artifact Type,Artifact ID,Changes');

    // Rows
    for (const entry of history) {
      const date = new Date(entry.createdAt);
      const dateStr = date.toISOString().split('T')[0];
      const timePart = date.toISOString().split('T')[1];
      const timeStr = timePart?.split('.')[0] || '00:00:00';
      const changesStr = JSON.stringify(entry.changes)
        .replace(/"/g, '""'); // Escape quotes

      lines.push(
        `"${dateStr}","${timeStr}","${entry.changedBy}","${entry.changeType}","${entry.artifactType}","${entry.artifactId}","${changesStr}"`
      );
    }

    return lines.join('\n');
  }

  /**
   * Group history entries by date
   */
  private groupByDate(history: HistoryEntry[]): Record<string, HistoryEntry[]> {
    const grouped: Record<string, HistoryEntry[]> = {};

    for (const entry of history) {
      const datePart = new Date(entry.createdAt).toISOString().split('T')[0];
      const date = datePart || 'unknown';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    }

    return grouped;
  }

  /**
   * Format actor name for display
   */
  private formatActor(actor: string): string {
    if (actor === 'user') return 'User';
    if (actor.startsWith('ai:')) {
      const agentName = actor.replace('ai:', '').replace('-agent', '');
      return `AI (${agentName.toUpperCase()} Agent)`;
    }
    return actor;
  }

  /**
   * Format action for display
   */
  private formatAction(action: string): string {
    return action.charAt(0).toUpperCase() + action.slice(1);
  }

  /**
   * Format changes for markdown display
   */
  private formatChanges(changes: unknown): string[] {
    const lines: string[] = [];

    if (changes?.added && Object.keys(changes.added).length > 0) {
      lines.push('- **Added:**');
      for (const [key, value] of Object.entries(changes.added)) {
        lines.push(`  - ${key}: ${JSON.stringify(value)}`);
      }
    }

    if (changes?.removed && Object.keys(changes.removed).length > 0) {
      lines.push('- **Removed:**');
      for (const [key, value] of Object.entries(changes.removed)) {
        lines.push(`  - ${key}: ${JSON.stringify(value)}`);
      }
    }

    if (changes?.modified && Object.keys(changes.modified).length > 0) {
      lines.push('- **Modified:**');
      for (const [key, change] of Object.entries(changes.modified)) {
        const mod = change as { before: unknown; after: unknown };
        lines.push(`  - **${key}**`);
        lines.push(`    - From: ${JSON.stringify(mod.before)}`);
        lines.push(`    - To: ${JSON.stringify(mod.after)}`);
      }
    }

    return lines;
  }
}

/**
 * Create singleton instance
 */
let historyServiceInstance: HistoryService | null = null;

export function getHistoryService(): HistoryService {
  if (!historyServiceInstance) {
    historyServiceInstance = new HistoryService();
  }
  return historyServiceInstance;
}
