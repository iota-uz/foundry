/**
 * Tests for Issue Processor Workflow.
 */

import { describe, expect, it } from 'bun:test';
import {
  issueProcessorWorkflow,
  type IssueContext,
  type Task,
  type AnalysisResult,
} from '../workflows/issue-processor.workflow';
import { createNodeRuntimes, NodeAdapter } from '../cli/utils';
import { NodeType } from '../enums';

describe('issue-processor workflow', () => {
  describe('workflow definition', () => {
    it('should have correct workflow id', () => {
      expect(issueProcessorWorkflow.id).toBe('issue-processor');
    });

    it('should define all required nodes', () => {
      const nodeNames = issueProcessorWorkflow.nodes.map((n) => n.name);

      expect(nodeNames).toContain('ANALYZE');
      expect(nodeNames).toContain('PLAN');
      expect(nodeNames).toContain('CREATE_PR');
      expect(nodeNames).toContain('EXPLORE');
      expect(nodeNames).toContain('IMPLEMENT');
      expect(nodeNames).toContain('TEST');
      expect(nodeNames).toContain('UPDATE_PR');
      expect(nodeNames).toContain('NEXT_TASK');
      expect(nodeNames).toContain('FINALIZE_PR');
      expect(nodeNames).toContain('REPORT');
    });

    it('should have correct node types', () => {
      const nodeByName = Object.fromEntries(
        issueProcessorWorkflow.nodes.map((n) => [n.name, n])
      );

      expect(nodeByName['ANALYZE']?.type).toBe(NodeType.Agent);
      expect(nodeByName['PLAN']?.type).toBe(NodeType.Agent);
      expect(nodeByName['CREATE_PR']?.type).toBe(NodeType.DynamicCommand);
      expect(nodeByName['EXPLORE']?.type).toBe(NodeType.Command);
      expect(nodeByName['IMPLEMENT']?.type).toBe(NodeType.Agent);
      expect(nodeByName['TEST']?.type).toBe(NodeType.Command);
      expect(nodeByName['UPDATE_PR']?.type).toBe(NodeType.DynamicCommand);
      expect(nodeByName['NEXT_TASK']?.type).toBe(NodeType.Eval);
      expect(nodeByName['FINALIZE_PR']?.type).toBe(NodeType.DynamicCommand);
      expect(nodeByName['REPORT']?.type).toBe(NodeType.DynamicCommand);
    });

    it('should start at ANALYZE node (first in nodes array)', () => {
      const firstNode = issueProcessorWorkflow.nodes[0];
      expect(firstNode?.name).toBe('ANALYZE');
    });
  });

  describe('initial context', () => {
    it('should have correct default values', () => {
      const ctx = issueProcessorWorkflow.initialContext!;

      expect(ctx.issueNumber).toBe(0);
      expect(ctx.issueTitle).toBe('');
      expect(ctx.issueBody).toBe('');
      expect(ctx.repository).toBe('');
      expect(ctx.baseBranch).toBe('main');
      expect(ctx.currentTaskIndex).toBe(0);
      expect(ctx.testsPassed).toBe(false);
      expect(ctx.allTasksComplete).toBe(false);
      expect(ctx.fixAttempts).toBe(0);
      expect(ctx.maxFixAttempts).toBe(3);
      expect(ctx.completedNodes).toEqual([]);
      expect(ctx.failedNodes).toEqual([]);
    });
  });

  describe('type definitions', () => {
    it('Task type should have required fields', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        complexity: 'small',
        dependencies: [],
        files: ['src/test.ts'],
        completed: false,
      };

      expect(task.id).toBe('task-1');
      expect(task.complexity).toBe('small');
      expect(task.completed).toBe(false);
    });

    it('AnalysisResult type should have required fields', () => {
      const analysis: AnalysisResult = {
        type: 'feature',
        scope: 'complex',
        summary: 'Add new feature',
        affectedAreas: ['src/components', 'src/hooks'],
      };

      expect(analysis.type).toBe('feature');
      expect(analysis.scope).toBe('complex');
      expect(analysis.affectedAreas).toHaveLength(2);
    });

    it('IssueContext type should be valid', () => {
      const context: IssueContext = {
        issueNumber: 123,
        issueTitle: 'Test Issue',
        issueBody: 'Issue body',
        repository: 'owner/repo',
        baseBranch: 'main',
        currentTaskIndex: 0,
        testsPassed: false,
        allTasksComplete: false,
        fixAttempts: 0,
        maxFixAttempts: 3,
        completedNodes: ['ANALYZE', 'PLAN'],
        failedNodes: [],
        analysisResult: {
          type: 'bug',
          scope: 'simple',
          summary: 'Fix bug',
          affectedAreas: ['src/utils'],
        },
        tasks: [
          {
            id: 't1',
            description: 'Task 1',
            complexity: 'small',
            dependencies: [],
            files: [],
            completed: false,
          },
        ],
      };

      expect(context.issueNumber).toBe(123);
      expect(context.analysisResult?.type).toBe('bug');
      expect(context.tasks).toHaveLength(1);
      expect(context.baseBranch).toBe('main');
      expect(context.completedNodes).toContain('ANALYZE');
    });
  });
});

describe('createNodeRuntimes', () => {
  it('should create runtime nodes from workflow definition', () => {
    const runtimes = createNodeRuntimes(issueProcessorWorkflow);

    expect(Object.keys(runtimes)).toHaveLength(issueProcessorWorkflow.nodes.length);

    // Verify all nodes are created
    for (const nodeDef of issueProcessorWorkflow.nodes) {
      expect(runtimes[nodeDef.name]).toBeDefined();
      expect(runtimes[nodeDef.name]?.name).toBe(nodeDef.name);
    }
  });

  it('should create NodeAdapter instances', () => {
    const runtimes = createNodeRuntimes(issueProcessorWorkflow);

    for (const node of Object.values(runtimes)) {
      expect(node).toBeInstanceOf(NodeAdapter);
    }
  });
});

describe('workflow transitions', () => {
  describe('ANALYZE node', () => {
    it('should transition to PLAN', () => {
      const analyzeDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'ANALYZE');
      expect(analyzeDef?.then).toBe('PLAN');
    });
  });

  describe('PLAN node', () => {
    it('should transition to CREATE_PR', () => {
      const planDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'PLAN');
      expect(planDef?.then).toBe('CREATE_PR');
    });
  });

  describe('CREATE_PR node', () => {
    it('should transition to EXPLORE', () => {
      const createPrDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'CREATE_PR');
      expect(createPrDef?.then).toBe('EXPLORE');
    });
  });

  describe('EXPLORE node', () => {
    it('should transition to IMPLEMENT', () => {
      const exploreDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'EXPLORE');
      expect(exploreDef?.then).toBe('IMPLEMENT');
    });
  });

  describe('IMPLEMENT node', () => {
    it('should transition to TEST', () => {
      const implementDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'IMPLEMENT');
      expect(implementDef?.then).toBe('TEST');
    });
  });

  describe('TEST node', () => {
    it('should transition to UPDATE_PR', () => {
      const testDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'TEST');
      expect(testDef?.then).toBe('UPDATE_PR');
    });
  });

  describe('UPDATE_PR node', () => {
    it('should have dynamic transition', () => {
      const updatePrDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'UPDATE_PR');
      expect(typeof updatePrDef?.then).toBe('function');
    });
  });

  describe('NEXT_TASK node', () => {
    it('should have dynamic transition', () => {
      const nextTaskDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'NEXT_TASK');
      expect(typeof nextTaskDef?.then).toBe('function');
    });
  });

  describe('FINALIZE_PR node', () => {
    it('should transition to REPORT', () => {
      const finalizePrDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'FINALIZE_PR');
      expect(finalizePrDef?.then).toBe('REPORT');
    });
  });

  describe('REPORT node', () => {
    it('should transition to END', () => {
      const reportDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'REPORT');
      expect(reportDef?.then).toBe('END');
    });
  });
});

describe('node configurations', () => {
  describe('ANALYZE agent node', () => {
    it('should have analyst role', () => {
      const node = issueProcessorWorkflow.nodes.find((n) => n.name === 'ANALYZE');
      if (node?.type === NodeType.Agent) {
        expect(node.role).toBe('analyst');
      }
    });

    it('should have read-only capabilities', () => {
      const node = issueProcessorWorkflow.nodes.find((n) => n.name === 'ANALYZE');
      if (node?.type === NodeType.Agent && node.capabilities) {
        expect(node.capabilities.length).toBeGreaterThan(0);
      }
    });
  });

  describe('IMPLEMENT agent node', () => {
    it('should have developer role', () => {
      const node = issueProcessorWorkflow.nodes.find((n) => n.name === 'IMPLEMENT');
      if (node?.type === NodeType.Agent) {
        expect(node.role).toBe('developer');
      }
    });
  });

  describe('EXPLORE command node', () => {
    it('should run tree command', () => {
      const node = issueProcessorWorkflow.nodes.find((n) => n.name === 'EXPLORE');
      if (node?.type === NodeType.Command) {
        expect(node.command).toContain('tree');
      }
    });
  });

  describe('TEST command node', () => {
    it('should run lint, typecheck, and test', () => {
      const node = issueProcessorWorkflow.nodes.find((n) => n.name === 'TEST');
      if (node?.type === NodeType.Command) {
        expect(node.command).toContain('lint');
        expect(node.command).toContain('typecheck');
        expect(node.command).toContain('test');
      }
    });
  });

  describe('CREATE_PR dynamic command node', () => {
    it('should have command function for dynamic command generation', () => {
      const node = issueProcessorWorkflow.nodes.find((n) => n.name === 'CREATE_PR');
      if (node?.type === NodeType.DynamicCommand) {
        expect(typeof node.command).toBe('function');
      }
    });
  });

  describe('UPDATE_PR dynamic command node', () => {
    it('should have command function for dynamic command generation', () => {
      const node = issueProcessorWorkflow.nodes.find((n) => n.name === 'UPDATE_PR');
      if (node?.type === NodeType.DynamicCommand) {
        expect(typeof node.command).toBe('function');
      }
    });
  });

  describe('FINALIZE_PR dynamic command node', () => {
    it('should have command function for dynamic command generation', () => {
      const node = issueProcessorWorkflow.nodes.find((n) => n.name === 'FINALIZE_PR');
      if (node?.type === NodeType.DynamicCommand) {
        expect(typeof node.command).toBe('function');
      }
    });
  });

  describe('REPORT dynamic command node', () => {
    it('should have command function for dynamic command generation', () => {
      const node = issueProcessorWorkflow.nodes.find((n) => n.name === 'REPORT');
      if (node?.type === NodeType.DynamicCommand) {
        expect(typeof node.command).toBe('function');
      }
    });
  });
});
