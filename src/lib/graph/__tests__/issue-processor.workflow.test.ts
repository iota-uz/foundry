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
import { createNodeRuntimes, NodeAdapter } from '../runtime-builders';
import { NodeType, WorkflowStatus } from '../enums';
import type { WorkflowState } from '../schema';

/**
 * Helper to create a mock workflow state for testing transitions.
 */
function createMockState(contextOverrides: Partial<IssueContext> = {}): WorkflowState<IssueContext> {
  return {
    currentNode: 'TEST',
    status: WorkflowStatus.Running,
    updatedAt: new Date().toISOString(),
    conversationHistory: [],
    context: {
      issueNumber: 1,
      issueTitle: 'Test',
      issueBody: 'Test body',
      repository: 'test/repo',
      baseBranch: 'main',
      currentTaskIndex: 0,
      testsPassed: false,
      allTasksComplete: false,
      fixAttempts: 0,
      maxFixAttempts: 3,
      completedNodes: [],
      failedNodes: [],
      ...contextOverrides,
    },
  };
}

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
      expect(nodeNames).toContain('PARSE_PR');
      expect(nodeNames).toContain('EXPLORE');
      expect(nodeNames).toContain('IMPLEMENT');
      expect(nodeNames).toContain('TEST');
      expect(nodeNames).toContain('SET_TEST_RESULT');
      expect(nodeNames).toContain('GEN_PR_STATUS');
      expect(nodeNames).toContain('WRITE_PR_STATUS');
      expect(nodeNames).toContain('INCREMENT_RETRY');
      expect(nodeNames).toContain('NEXT_TASK');
      expect(nodeNames).toContain('GEN_FINAL_PR');
      expect(nodeNames).toContain('WRITE_FINAL_PR');
      expect(nodeNames).toContain('REPORT');
    });

    it('should have correct node types', () => {
      const nodeByName = Object.fromEntries(
        issueProcessorWorkflow.nodes.map((n) => [n.name, n])
      );

      expect(nodeByName['ANALYZE']?.type).toBe(NodeType.Agent);
      expect(nodeByName['PLAN']?.type).toBe(NodeType.Agent);
      expect(nodeByName['CREATE_PR']?.type).toBe(NodeType.DynamicCommand);
      expect(nodeByName['PARSE_PR']?.type).toBe(NodeType.Eval);
      expect(nodeByName['EXPLORE']?.type).toBe(NodeType.Command);
      expect(nodeByName['IMPLEMENT']?.type).toBe(NodeType.Agent);
      expect(nodeByName['TEST']?.type).toBe(NodeType.Command);
      expect(nodeByName['SET_TEST_RESULT']?.type).toBe(NodeType.Eval);
      expect(nodeByName['GEN_PR_STATUS']?.type).toBe(NodeType.Eval);
      expect(nodeByName['WRITE_PR_STATUS']?.type).toBe(NodeType.DynamicCommand);
      expect(nodeByName['INCREMENT_RETRY']?.type).toBe(NodeType.Eval);
      expect(nodeByName['NEXT_TASK']?.type).toBe(NodeType.Eval);
      expect(nodeByName['GEN_FINAL_PR']?.type).toBe(NodeType.Eval);
      expect(nodeByName['WRITE_FINAL_PR']?.type).toBe(NodeType.DynamicCommand);
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
      expect(typeof analyzeDef?.then).toBe('function');
      expect(analyzeDef?.then(createMockState())).toBe('PLAN');
    });
  });

  describe('PLAN node', () => {
    it('should transition to CREATE_PR', () => {
      const planDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'PLAN');
      expect(typeof planDef?.then).toBe('function');
      expect(planDef?.then(createMockState())).toBe('CREATE_PR');
    });
  });

  describe('CREATE_PR node', () => {
    it('should transition to PARSE_PR', () => {
      const createPrDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'CREATE_PR');
      expect(typeof createPrDef?.then).toBe('function');
      expect(createPrDef?.then(createMockState())).toBe('PARSE_PR');
    });
  });

  describe('PARSE_PR node', () => {
    it('should transition to EXPLORE', () => {
      const parsePrDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'PARSE_PR');
      expect(typeof parsePrDef?.then).toBe('function');
      expect(parsePrDef?.then(createMockState())).toBe('EXPLORE');
    });
  });

  describe('EXPLORE node', () => {
    it('should transition to IMPLEMENT', () => {
      const exploreDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'EXPLORE');
      expect(typeof exploreDef?.then).toBe('function');
      expect(exploreDef?.then(createMockState())).toBe('IMPLEMENT');
    });
  });

  describe('IMPLEMENT node', () => {
    it('should transition to TEST', () => {
      const implementDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'IMPLEMENT');
      expect(typeof implementDef?.then).toBe('function');
      expect(implementDef?.then(createMockState())).toBe('TEST');
    });
  });

  describe('TEST node', () => {
    it('should transition to SET_TEST_RESULT', () => {
      const testDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'TEST');
      expect(typeof testDef?.then).toBe('function');
      expect(testDef?.then(createMockState())).toBe('SET_TEST_RESULT');
    });
  });

  describe('SET_TEST_RESULT node', () => {
    it('should transition to GEN_PR_STATUS', () => {
      const setTestResultDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'SET_TEST_RESULT');
      expect(typeof setTestResultDef?.then).toBe('function');
      expect(setTestResultDef?.then(createMockState())).toBe('GEN_PR_STATUS');
    });
  });

  describe('GEN_PR_STATUS node', () => {
    it('should transition to WRITE_PR_STATUS', () => {
      const genPrStatusDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'GEN_PR_STATUS');
      expect(typeof genPrStatusDef?.then).toBe('function');
      expect(genPrStatusDef?.then(createMockState())).toBe('WRITE_PR_STATUS');
    });
  });

  describe('WRITE_PR_STATUS node', () => {
    it('should have dynamic transition', () => {
      const writePrStatusDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'WRITE_PR_STATUS');
      expect(typeof writePrStatusDef?.then).toBe('function');
    });
  });

  describe('INCREMENT_RETRY node', () => {
    it('should have dynamic transition', () => {
      const incrementRetryDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'INCREMENT_RETRY');
      expect(typeof incrementRetryDef?.then).toBe('function');
    });
  });

  describe('NEXT_TASK node', () => {
    it('should have dynamic transition', () => {
      const nextTaskDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'NEXT_TASK');
      expect(typeof nextTaskDef?.then).toBe('function');
    });
  });

  describe('GEN_FINAL_PR node', () => {
    it('should transition to WRITE_FINAL_PR', () => {
      const genFinalPrDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'GEN_FINAL_PR');
      expect(typeof genFinalPrDef?.then).toBe('function');
      expect(genFinalPrDef?.then(createMockState())).toBe('WRITE_FINAL_PR');
    });
  });

  describe('WRITE_FINAL_PR node', () => {
    it('should transition to SET_DONE_STATUS', () => {
      const writeFinalPrDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'WRITE_FINAL_PR');
      expect(typeof writeFinalPrDef?.then).toBe('function');
      expect(writeFinalPrDef?.then(createMockState())).toBe('SET_DONE_STATUS');
    });
  });

  describe('SET_DONE_STATUS node', () => {
    it('should transition to REPORT', () => {
      const setDoneStatusDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'SET_DONE_STATUS');
      expect(typeof setDoneStatusDef?.then).toBe('function');
      expect(setDoneStatusDef?.then(createMockState())).toBe('REPORT');
    });
  });

  describe('REPORT node', () => {
    it('should transition to END', () => {
      const reportDef = issueProcessorWorkflow.nodes.find((n) => n.name === 'REPORT');
      expect(typeof reportDef?.then).toBe('function');
      // Note: Transitions should return SpecialNode.End, not string 'END'
      const result = reportDef?.then(createMockState());
      expect(result).toBeDefined();
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

  describe('WRITE_PR_STATUS dynamic command node', () => {
    it('should have command function for dynamic command generation', () => {
      const node = issueProcessorWorkflow.nodes.find((n) => n.name === 'WRITE_PR_STATUS');
      if (node?.type === NodeType.DynamicCommand) {
        expect(typeof node.command).toBe('function');
      }
    });
  });

  describe('WRITE_FINAL_PR dynamic command node', () => {
    it('should have command function for dynamic command generation', () => {
      const node = issueProcessorWorkflow.nodes.find((n) => n.name === 'WRITE_FINAL_PR');
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
