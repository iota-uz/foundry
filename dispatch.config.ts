/**
 * Dispatch Workflow Configuration
 *
 * Fetches issues from label or project source, builds dependency DAG,
 * and generates GitHub Actions matrix for parallel processing.
 *
 * Key env vars: GRAPH_SOURCE (label|project), GRAPH_PROJECT_NUMBER
 * Run: bun run graph dispatch.config.ts --help
 */
export default {
  id: 'dispatch',
  description: 'GitHub Issue DAG Dispatcher - finds ready issues and generates matrix',
};
