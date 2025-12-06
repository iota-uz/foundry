/**
 * Tests for Mermaid diagram generation utilities.
 */

import { describe, expect, it } from 'bun:test';
import {
  generateWorkflowDiagram,
  wrapInCodeFence,
  createDiagramNodes,
  extractEdgesFromWorkflow,
  type DiagramNode,
  type DiagramEdge,
} from '../mermaid/workflow-diagram';
import {
  generateStatusDashboard,
  extractMarkerId,
  createMarkers,
  escapeRegex,
  updateDashboardInContent,
  hasDashboard,
} from '../mermaid/status-dashboard';

describe('workflow-diagram', () => {
  describe('generateWorkflowDiagram', () => {
    it('should generate a basic stateDiagram-v2', () => {
      const nodes: DiagramNode[] = [
        { id: 'PLAN', status: 'completed' },
        { id: 'BUILD', status: 'active' },
        { id: 'QA', status: 'pending' },
      ];

      const edges: DiagramEdge[] = [
        { from: 'PLAN', to: 'BUILD' },
        { from: 'BUILD', to: 'QA' },
        { from: 'QA', to: 'END' },
      ];

      const diagram = generateWorkflowDiagram({ nodes, edges, activeNode: 'BUILD' });

      expect(diagram).toContain('stateDiagram-v2');
      expect(diagram).toContain('[*] --> PLAN');
      expect(diagram).toContain('PLAN --> BUILD');
      expect(diagram).toContain('BUILD --> QA');
      expect(diagram).toContain('QA --> [*]');
      expect(diagram).toContain('classDef completed');
      expect(diagram).toContain('classDef active');
      expect(diagram).toContain('classDef pending');
      expect(diagram).toContain('class PLAN completed');
      expect(diagram).toContain('class BUILD active');
      expect(diagram).toContain('class QA pending');
      expect(diagram).toContain('class BUILD activeHighlight');
    });

    it('should support custom labels', () => {
      const nodes: DiagramNode[] = [
        { id: 'PLAN', label: 'Planning Phase', status: 'completed' },
        { id: 'BUILD', label: 'Build & Test', status: 'active' },
      ];

      const edges: DiagramEdge[] = [{ from: 'PLAN', to: 'BUILD' }];

      const diagram = generateWorkflowDiagram({ nodes, edges });

      expect(diagram).toContain('PLAN : Planning Phase');
      expect(diagram).toContain('BUILD : Build & Test');
    });

    it('should support edge labels', () => {
      const nodes: DiagramNode[] = [
        { id: 'QA', status: 'active' },
        { id: 'FIX', status: 'pending' },
      ];

      const edges: DiagramEdge[] = [
        { from: 'QA', to: 'FIX', label: 'failure' },
        { from: 'FIX', to: 'QA', label: 'retry' },
      ];

      const diagram = generateWorkflowDiagram({ nodes, edges });

      expect(diagram).toContain('QA --> FIX : failure');
      expect(diagram).toContain('FIX --> QA : retry');
    });

    it('should handle failed nodes', () => {
      const nodes: DiagramNode[] = [
        { id: 'BUILD', status: 'failed' },
        { id: 'QA', status: 'pending' },
      ];

      const edges: DiagramEdge[] = [{ from: 'BUILD', to: 'QA' }];

      const diagram = generateWorkflowDiagram({ nodes, edges });

      expect(diagram).toContain('classDef failed');
      expect(diagram).toContain('class BUILD failed');
    });

    it('should respect direction setting', () => {
      const nodes: DiagramNode[] = [{ id: 'START', status: 'active' }];
      const edges: DiagramEdge[] = [];

      const lrDiagram = generateWorkflowDiagram({ nodes, edges, direction: 'LR' });
      const tbDiagram = generateWorkflowDiagram({ nodes, edges, direction: 'TB' });

      expect(lrDiagram).toContain('direction LR');
      expect(tbDiagram).not.toContain('direction LR');
    });
  });

  describe('wrapInCodeFence', () => {
    it('should wrap diagram in mermaid code fence', () => {
      const diagram = 'stateDiagram-v2\n    [*] --> A';
      const wrapped = wrapInCodeFence(diagram);

      expect(wrapped).toBe('```mermaid\nstateDiagram-v2\n    [*] --> A\n```');
    });
  });

  describe('createDiagramNodes', () => {
    it('should create nodes with correct status', () => {
      const nodeNames = ['PLAN', 'BUILD', 'QA', 'FIX'];
      const activeNode = 'BUILD';
      const completedNodes = ['PLAN'];
      const failedNodes: string[] = [];

      const nodes = createDiagramNodes(nodeNames, activeNode, completedNodes, failedNodes);

      expect(nodes).toHaveLength(4);
      expect(nodes[0]).toEqual({ id: 'PLAN', status: 'completed' });
      expect(nodes[1]).toEqual({ id: 'BUILD', status: 'active' });
      expect(nodes[2]).toEqual({ id: 'QA', status: 'pending' });
      expect(nodes[3]).toEqual({ id: 'FIX', status: 'pending' });
    });

    it('should handle failed nodes', () => {
      const nodeNames = ['A', 'B', 'C'];
      const nodes = createDiagramNodes(nodeNames, 'C', ['A'], ['B']);

      expect(nodes[0]!.status).toBe('completed');
      expect(nodes[1]!.status).toBe('failed');
      expect(nodes[2]!.status).toBe('active');
    });

    it('should work with Set inputs', () => {
      const nodeNames = ['A', 'B'];
      const completedSet = new Set(['A']);
      const failedSet = new Set<string>();

      const nodes = createDiagramNodes(nodeNames, 'B', completedSet, failedSet);

      expect(nodes[0]!.status).toBe('completed');
      expect(nodes[1]!.status).toBe('active');
    });
  });

  describe('extractEdgesFromWorkflow', () => {
    it('should extract static transitions', () => {
      const nodes = {
        PLAN: { next: 'BUILD' },
        BUILD: { next: 'QA' },
        QA: { next: 'END' },
      };

      const edges = extractEdgesFromWorkflow(nodes);

      expect(edges).toHaveLength(3);
      expect(edges[0]).toEqual({ from: 'PLAN', to: 'BUILD' });
      expect(edges[1]).toEqual({ from: 'BUILD', to: 'QA' });
      expect(edges[2]).toEqual({ from: 'QA', to: 'END' });
    });

    it('should skip dynamic transitions', () => {
      const nodes = {
        PLAN: { next: 'BUILD' },
        BUILD: { next: () => 'QA' }, // Dynamic
      };

      const edges = extractEdgesFromWorkflow(nodes);

      expect(edges).toHaveLength(1);
      expect(edges[0]).toEqual({ from: 'PLAN', to: 'BUILD' });
    });
  });
});

describe('status-dashboard', () => {
  describe('generateStatusDashboard', () => {
    it('should generate complete dashboard with markers', () => {
      const diagramConfig = {
        nodes: [
          { id: 'PLAN', status: 'completed' as const },
          { id: 'BUILD', status: 'active' as const },
        ],
        edges: [{ from: 'PLAN', to: 'BUILD' }],
        activeNode: 'BUILD',
      };

      const dashboardConfig = {
        markerId: 'test-123',
        currentTask: 'Building the feature',
        retryAttempt: 2,
        maxRetries: 3,
        actionsRunUrl: 'https://github.com/org/repo/actions/runs/12345',
      };

      const dashboard = generateStatusDashboard(diagramConfig, dashboardConfig);

      // Check markers
      expect(dashboard).toContain('<!-- foundry-workflow-dashboard:test-123 -->');
      expect(dashboard).toContain('<!-- /foundry-workflow-dashboard:test-123 -->');

      // Check title
      expect(dashboard).toContain('## Workflow Status');

      // Check mermaid block
      expect(dashboard).toContain('```mermaid');
      expect(dashboard).toContain('stateDiagram-v2');
      expect(dashboard).toContain('```');

      // Check status table
      expect(dashboard).toContain('| Field | Value |');
      expect(dashboard).toContain('| **Current Task** | Building the feature |');
      expect(dashboard).toContain('| **Attempt** | 2 / 3 |');
      expect(dashboard).toContain('[View Logs →](https://github.com/org/repo/actions/runs/12345)');

      // Check timestamp
      expect(dashboard).toContain('<sub>Updated:');
    });

    it('should support custom title', () => {
      const dashboard = generateStatusDashboard(
        { nodes: [], edges: [] },
        { markerId: 'x', currentTask: 'Task', title: 'Custom Title' }
      );

      expect(dashboard).toContain('## Custom Title');
    });

    it('should omit optional fields when not provided', () => {
      const dashboard = generateStatusDashboard(
        { nodes: [], edges: [] },
        { markerId: 'x', currentTask: 'Task' }
      );

      expect(dashboard).not.toContain('**Attempt**');
      expect(dashboard).not.toContain('**Actions**');
    });
  });

  describe('extractMarkerId', () => {
    it('should extract marker ID from valid marker', () => {
      const marker = '<!-- foundry-workflow-dashboard:my-id-123 -->';
      expect(extractMarkerId(marker)).toBe('my-id-123');
    });

    it('should return null for invalid markers', () => {
      expect(extractMarkerId('<!-- other-marker -->')).toBeNull();
      expect(extractMarkerId('not a marker')).toBeNull();
    });
  });

  describe('createMarkers', () => {
    it('should create start and end markers', () => {
      const { start, end } = createMarkers('test-id');

      expect(start).toBe('<!-- foundry-workflow-dashboard:test-id -->');
      expect(end).toBe('<!-- /foundry-workflow-dashboard:test-id -->');
    });
  });

  describe('escapeRegex', () => {
    it('should escape special regex characters', () => {
      const input = 'test.string[with]special(chars)*';
      const escaped = escapeRegex(input);

      // Should be able to use in regex without error
      const regex = new RegExp(escaped);
      expect(input).toMatch(regex);
    });
  });

  describe('updateDashboardInContent', () => {
    it('should replace existing dashboard section', () => {
      const existingContent = `# PR Title

Some description here.

<!-- foundry-workflow-dashboard:test -->
Old dashboard content
<!-- /foundry-workflow-dashboard:test -->

More content after.`;

      const newDashboard = `<!-- foundry-workflow-dashboard:test -->
New dashboard content
<!-- /foundry-workflow-dashboard:test -->`;

      const result = updateDashboardInContent(existingContent, newDashboard, 'test');

      expect(result).toContain('# PR Title');
      expect(result).toContain('Some description here.');
      expect(result).toContain('New dashboard content');
      expect(result).toContain('More content after.');
      expect(result).not.toContain('Old dashboard content');
    });

    it('should append at bottom when no existing dashboard', () => {
      const existingContent = '# PR Title\n\nDescription';
      const dashboard = '<!-- foundry-workflow-dashboard:x -->\nDashboard\n<!-- /foundry-workflow-dashboard:x -->';

      const result = updateDashboardInContent(existingContent, dashboard, 'x', 'bottom');

      expect(result).toBe(`# PR Title\n\nDescription\n\n${dashboard}`);
    });

    it('should append at top when specified', () => {
      const existingContent = '# PR Title\n\nDescription';
      const dashboard = '<!-- foundry-workflow-dashboard:x -->\nDashboard\n<!-- /foundry-workflow-dashboard:x -->';

      const result = updateDashboardInContent(existingContent, dashboard, 'x', 'top');

      expect(result).toBe(`${dashboard}\n\n# PR Title\n\nDescription`);
    });
  });

  describe('hasDashboard', () => {
    it('should detect dashboard with specific marker', () => {
      const content = 'text <!-- foundry-workflow-dashboard:abc --> more text';

      expect(hasDashboard(content, 'abc')).toBe(true);
      expect(hasDashboard(content, 'xyz')).toBe(false);
    });

    it('should detect any dashboard when no marker specified', () => {
      const content = 'text <!-- foundry-workflow-dashboard:any --> more text';

      expect(hasDashboard(content)).toBe(true);
      expect(hasDashboard('no dashboard here')).toBe(false);
    });
  });
});
