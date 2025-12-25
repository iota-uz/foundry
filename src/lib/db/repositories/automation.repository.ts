/**
 * Automation Repository
 *
 * Database operations for workflow automations and status transitions.
 * Manages trigger rules and conditional outputs.
 */

import { eq, and } from 'drizzle-orm';
import { getDatabase } from '../client';
import {
  projectAutomations,
  projectStatusTransitions,
  type ProjectAutomation,
  type NewProjectAutomation,
  type ProjectStatusTransition,
  type NewProjectStatusTransition,
  type TriggerType,
} from '../schema';

// ============================================================================
// Automation CRUD
// ============================================================================

/**
 * Create a new automation
 */
export async function createAutomation(
  data: NewProjectAutomation
): Promise<ProjectAutomation> {
  const db = getDatabase();
  const [automation] = await db
    .insert(projectAutomations)
    .values(data)
    .returning();
  if (!automation) {
    throw new Error('Failed to create automation');
  }
  return automation;
}

/**
 * Get an automation by ID
 */
export async function getAutomation(
  id: string
): Promise<ProjectAutomation | undefined> {
  const db = getDatabase();
  const [automation] = await db
    .select()
    .from(projectAutomations)
    .where(eq(projectAutomations.id, id))
    .limit(1);
  return automation;
}

/**
 * List all automations for a project
 */
export async function listAutomations(
  projectId: string
): Promise<ProjectAutomation[]> {
  const db = getDatabase();
  return db
    .select()
    .from(projectAutomations)
    .where(eq(projectAutomations.projectId, projectId))
    .orderBy(projectAutomations.priority);
}

/**
 * Update an automation
 */
export async function updateAutomation(
  id: string,
  data: Partial<NewProjectAutomation>
): Promise<ProjectAutomation> {
  const db = getDatabase();
  const [automation] = await db
    .update(projectAutomations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projectAutomations.id, id))
    .returning();
  if (!automation) {
    throw new Error('Automation not found');
  }
  return automation;
}

/**
 * Delete an automation
 * Note: Cascades to project_status_transitions
 */
export async function deleteAutomation(id: string): Promise<void> {
  const db = getDatabase();
  await db.delete(projectAutomations).where(eq(projectAutomations.id, id));
}

/**
 * Find automations by trigger type and status
 */
export async function findAutomationsByTrigger(
  projectId: string,
  triggerType: TriggerType,
  status?: string
): Promise<ProjectAutomation[]> {
  const db = getDatabase();

  const conditions = [
    eq(projectAutomations.projectId, projectId),
    eq(projectAutomations.triggerType, triggerType),
    eq(projectAutomations.enabled, true),
  ];

  if (status && triggerType === 'status_enter') {
    conditions.push(eq(projectAutomations.triggerStatus, status));
  }

  return db
    .select()
    .from(projectAutomations)
    .where(and(...conditions))
    .orderBy(projectAutomations.priority);
}

// ============================================================================
// Status Transitions
// ============================================================================

/**
 * Add a status transition to an automation
 */
export async function addTransition(
  automationId: string,
  data: Omit<NewProjectStatusTransition, 'automationId'>
): Promise<ProjectStatusTransition> {
  const db = getDatabase();
  const [transition] = await db
    .insert(projectStatusTransitions)
    .values({ ...data, automationId })
    .returning();
  if (!transition) {
    throw new Error('Failed to add transition');
  }
  return transition;
}

/**
 * Update a status transition
 */
export async function updateTransition(
  id: string,
  data: Partial<Omit<NewProjectStatusTransition, 'automationId'>>
): Promise<ProjectStatusTransition> {
  const db = getDatabase();
  const [transition] = await db
    .update(projectStatusTransitions)
    .set(data)
    .where(eq(projectStatusTransitions.id, id))
    .returning();
  if (!transition) {
    throw new Error('Transition not found');
  }
  return transition;
}

/**
 * Remove a status transition
 */
export async function removeTransition(id: string): Promise<void> {
  const db = getDatabase();
  await db.delete(projectStatusTransitions).where(eq(projectStatusTransitions.id, id));
}

/**
 * Get all transitions for an automation
 */
export async function getTransitions(
  automationId: string
): Promise<ProjectStatusTransition[]> {
  const db = getDatabase();
  return db
    .select()
    .from(projectStatusTransitions)
    .where(eq(projectStatusTransitions.automationId, automationId))
    .orderBy(projectStatusTransitions.priority);
}

/**
 * Get automation with its transitions
 */
export async function getAutomationWithTransitions(
  id: string
): Promise<
  | (ProjectAutomation & { transitions: ProjectStatusTransition[] })
  | undefined
> {
  const automation = await getAutomation(id);
  if (!automation) {
    return undefined;
  }

  const transitions = await getTransitions(id);
  return { ...automation, transitions };
}

/**
 * List automations with their transitions for a project
 */
export async function listAutomationsWithTransitions(
  projectId: string
): Promise<Array<ProjectAutomation & { transitions: ProjectStatusTransition[] }>> {
  const automations = await listAutomations(projectId);

  const automationsWithTransitions = await Promise.all(
    automations.map(async (automation) => {
      const transitions = await getTransitions(automation.id);
      return { ...automation, transitions };
    })
  );

  return automationsWithTransitions;
}

// ============================================================================
// Re-export types
// ============================================================================

export type {
  ProjectAutomation,
  NewProjectAutomation,
  ProjectStatusTransition,
  NewProjectStatusTransition,
  TriggerType,
};
