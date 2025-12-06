/**
 * @sys/graph/mermaid - Mermaid Diagram Generation
 *
 * Utilities for generating Mermaid diagrams and status dashboards
 * for workflow visualization in GitHub PRs.
 */

export {
  generateWorkflowDiagram,
  wrapInCodeFence,
  createDiagramNodes,
  extractEdgesFromWorkflow,
  type NodeStatus,
  type DiagramNode,
  type DiagramEdge,
  type WorkflowDiagramConfig,
} from './workflow-diagram';

export {
  generateStatusDashboard,
  extractMarkerId,
  createMarkers,
  escapeRegex,
  updateDashboardInContent,
  hasDashboard,
  type DashboardConfig,
} from './status-dashboard';
