/**
 * Issue Processor Workflow Configuration
 *
 * Processes a GitHub issue through: analyze, plan, implement, test, PR.
 *
 * Key env vars: GRAPH_ISSUE_NUMBER (required), ANTHROPIC_API_KEY
 * Run: bun run graph issue-processor.config.ts --help
 */
export { issueProcessorWorkflow as default } from './src/lib/graph/workflows/issue-processor.workflow';
