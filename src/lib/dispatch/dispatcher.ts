/**
 * Dispatch Controller - Main entry point for the dispatch system
 *
 * Orchestrates GitHub issue fetching, DAG building, and matrix generation.
 */

import type {
  DispatchConfig,
  DispatchResult,
  MatrixOutput,
  MatrixEntry,
  ResolvedIssue,
} from './types';
import { GitHubClient } from './github-client';
import { DagBuilder, sortByPriority, applyMaxConcurrent, createIssueId } from './dag-builder';

/**
 * Main dispatch function
 *
 * Fetches issues, builds DAG, resolves dependencies, and generates matrix output.
 */
export async function dispatch(config: DispatchConfig): Promise<DispatchResult> {
  const verbose = config.verbose ?? false;

  const log = (message: string): void => {
    if (verbose) {
      console.log(`[Dispatcher] ${message}`);
    }
  };

  log('Starting dispatch...');
  log(`Repository: ${config.owner}/${config.repo}`);
  log(`Queue label: ${config.queueLabel ?? 'queue'}`);
  log(`Max concurrent: ${config.maxConcurrent ?? 'unlimited'}`);
  log(`Dry run: ${config.dryRun ?? false}`);

  // Initialize GitHub client
  const client = new GitHubClient(config);

  // Fetch issues with queue label
  const label = config.queueLabel ?? 'queue';
  const issues = await client.fetchQueuedIssues(label);

  log(`Fetched ${issues.length} issues with label '${label}'`);

  // Filter to only open issues for DAG building
  const openIssues = issues.filter((i) => i.state === 'open');
  log(`Open issues: ${openIssues.length}`);

  // Build DAG
  const dagBuilder = new DagBuilder(config, client);
  await dagBuilder.build(openIssues);

  // Detect cycles
  const cycleWarnings = dagBuilder.detectCycles();
  if (cycleWarnings.length > 0) {
    for (const cycle of cycleWarnings) {
      console.warn(`[Dispatcher] WARNING: ${cycle.description}`);
    }
  }

  // Get ready leaf issues (only leaves are dispatched), blocked, and parent issues
  let readyIssues = dagBuilder.getReadyLeafIssues();
  const blockedIssues = dagBuilder.getBlockedIssues();
  const parentIssues = dagBuilder.getParentIssues();

  log(`Ready leaf issues: ${readyIssues.length}`);
  log(`Blocked issues: ${blockedIssues.length}`);
  log(`Parent issues (not dispatched): ${parentIssues.length}`);

  // Apply MAX_CONCURRENT limit with priority sorting
  readyIssues = applyMaxConcurrent(readyIssues, config.maxConcurrent);

  if (config.maxConcurrent !== undefined && config.maxConcurrent !== null && config.maxConcurrent > 0 &&
      readyIssues.length < dagBuilder.getReadyIssues().length) {
    log(`Applied MAX_CONCURRENT limit: ${config.maxConcurrent}`);
  }

  // Generate matrix output
  const matrix = generateMatrix(readyIssues, config);

  const result: DispatchResult = {
    totalIssues: issues.length,
    readyIssues,
    blockedIssues,
    cycleWarnings,
    matrix,
    timestamp: new Date().toISOString(),
    dryRun: config.dryRun ?? false,
  };

  // Output matrix
  if (verbose) {
    log('Matrix output:');
    console.log(JSON.stringify(matrix, null, 2));
  }

  return result;
}

/**
 * Generate GitHub Actions matrix output from ready issues
 */
export function generateMatrix(
  issues: ResolvedIssue[],
  config: DispatchConfig
): MatrixOutput {
  const sorted = sortByPriority(issues);

  const include: MatrixEntry[] = sorted.map((resolved) => ({
    issue_number: resolved.issue.number,
    title: resolved.issue.title,
    priority: resolved.priority,
    priority_score: resolved.priorityScore,
    repository: `${config.owner}/${config.repo}`,
    url: resolved.issue.htmlUrl,
    parent_issue_number: resolved.issue.parentIssueNumber ?? null,
  }));

  return { include };
}

/**
 * Format dispatch result as a human-readable summary
 */
export function formatResultSummary(result: DispatchResult): string {
  const lines: string[] = [
    '='.repeat(60),
    'DISPATCH SUMMARY',
    '='.repeat(60),
    '',
    `Timestamp: ${result.timestamp}`,
    `Dry Run: ${result.dryRun}`,
    '',
    `Total Issues: ${result.totalIssues}`,
    `Ready Leaf Issues: ${result.readyIssues.length}`,
    `Blocked Issues: ${result.blockedIssues.length}`,
    '',
  ];

  if (result.cycleWarnings.length > 0) {
    lines.push('CYCLE WARNINGS:');
    for (const cycle of result.cycleWarnings) {
      lines.push(`  - ${cycle.description}`);
    }
    lines.push('');
  }

  if (result.readyIssues.length > 0) {
    lines.push('READY FOR EXECUTION (leaf issues only):');
    for (const issue of result.readyIssues) {
      const id = createIssueId(issue.issue.owner, issue.issue.repo, issue.issue.number);
      const parentInfo = issue.issue.parentIssueNumber !== undefined && issue.issue.parentIssueNumber !== null && issue.issue.parentIssueNumber !== 0 ? ` (child of #${issue.issue.parentIssueNumber})` : '';
      lines.push(`  [${issue.priority.toUpperCase()}] ${id}: ${issue.issue.title}${parentInfo}`);
    }
    lines.push('');
  }

  if (result.blockedIssues.length > 0) {
    lines.push('BLOCKED ISSUES:');
    for (const issue of result.blockedIssues) {
      const id = createIssueId(issue.issue.owner, issue.issue.repo, issue.issue.number);
      const blockedBy = issue.blockedBy.map((d) => `${d.owner}/${d.repo}#${d.number}`).join(', ');
      const isParent = !issue.isLeaf ? ' [PARENT]' : '';
      lines.push(`  ${id}${isParent}: ${issue.issue.title}`);
      lines.push(`    Blocked by: ${blockedBy}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(60));
  lines.push('MATRIX OUTPUT:');
  lines.push('='.repeat(60));
  lines.push(JSON.stringify(result.matrix, null, 2));

  return lines.join('\n');
}

/**
 * Write matrix output to a file
 */
export async function writeMatrixToFile(
  matrix: MatrixOutput,
  outputFile: string
): Promise<void> {
  const fs = await import('fs/promises');
  await fs.writeFile(outputFile, JSON.stringify(matrix, null, 2), 'utf-8');
}

/**
 * Set GitHub Actions output
 */
export async function setGitHubActionsOutput(matrix: MatrixOutput): Promise<void> {
  const matrixJson = JSON.stringify(matrix);

  // For GitHub Actions, output to GITHUB_OUTPUT file
  const outputFile = process.env['GITHUB_OUTPUT'];
  if (outputFile !== undefined && outputFile !== null && outputFile !== '') {
    const fs = await import('fs/promises');
    await fs.appendFile(outputFile, `matrix=${matrixJson}\n`);
  }
}
