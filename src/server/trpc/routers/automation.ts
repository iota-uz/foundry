/**
 * Automation Router
 *
 * tRPC procedures for project automation management.
 * Replaces: /api/projects/:id/automations/*
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../init';
import {
  AutomationRepository,
  ProjectRepository,
} from '@/lib/db/repositories';

export const automationRouter = router({
  /**
   * List all automations for a project with their transitions
   * Replaces: GET /api/projects/:id/automations
   */
  list: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      const project = await ProjectRepository.getProject(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const automations = await AutomationRepository.listAutomationsWithTransitions(
        input.projectId
      );

      return automations;
    }),

  /**
   * Get automation by ID with its transitions
   * Replaces: GET /api/projects/:id/automations/:automationId
   */
  byId: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        automationId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const project = await ProjectRepository.getProject(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const automation = await AutomationRepository.getAutomationWithTransitions(
        input.automationId
      );
      if (!automation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation not found',
        });
      }

      // Verify automation belongs to project
      if (automation.projectId !== input.projectId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation not found',
        });
      }

      return automation;
    }),
});
