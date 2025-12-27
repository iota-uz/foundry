/**
 * Root Router
 *
 * Combines all domain routers into a single type-safe router.
 */

import { router } from './init';
import { healthRouter } from './routers/health';
import { projectRouter } from './routers/project';
import { workflowRouter } from './routers/workflow';
import { executionRouter } from './routers/execution';
import { automationRouter } from './routers/automation';
import { visualizationRouter } from './routers/visualization';
import { planningRouter } from './routers/planning';

/**
 * Root application router
 *
 * All procedures are accessible via their namespace:
 * - trpc.health.check
 * - trpc.project.list / byId / board / executions
 * - trpc.workflow.listByProject / byId / get / parseDsl
 * - trpc.execution.byId / listByWorkflow
 * - trpc.automation.list / byId
 * - trpc.visualization.stats / executions / analytics
 * - trpc.planning.getState / listExecutions / start / submitAnswers
 */
export const appRouter = router({
  health: healthRouter,
  project: projectRouter,
  workflow: workflowRouter,
  execution: executionRouter,
  automation: automationRouter,
  visualization: visualizationRouter,
  planning: planningRouter,
});

/**
 * Type definition for the entire router
 * Used for client-side type inference
 */
export type AppRouter = typeof appRouter;
