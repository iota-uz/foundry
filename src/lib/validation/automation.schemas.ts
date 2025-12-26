/**
 * Zod validation schemas for Automation API routes
 */

import { z } from 'zod';

/**
 * Create automation request schema
 */
export const createAutomationSchema = z.object({
  name: z.string().min(1, 'Automation name is required').max(255, 'Name too long'),
  triggerType: z.enum(['status_enter', 'manual'], {
    errorMap: () => ({ message: 'Trigger type must be "status_enter" or "manual"' }),
  }),
  triggerStatus: z.string().min(1, 'Trigger status is required').optional(),
  buttonLabel: z.string().min(1, 'Button label is required').max(100, 'Label too long').optional(),
  workflowId: z.string().uuid('Invalid workflow ID format'),
  enabled: z.boolean().default(true),
  priority: z.number().int('Priority must be an integer').default(0),
}).refine(
  (data) => {
    // If trigger type is status_enter, triggerStatus is required
    if (data.triggerType === 'status_enter' && (data.triggerStatus === undefined || data.triggerStatus === null || data.triggerStatus === '')) {
      return false;
    }
    // If trigger type is manual, buttonLabel is required
    if (data.triggerType === 'manual' && (data.buttonLabel === undefined || data.buttonLabel === null || data.buttonLabel === '')) {
      return false;
    }
    return true;
  },
  {
    message: 'status_enter requires triggerStatus, manual requires buttonLabel',
    path: ['triggerType'],
  }
);

/**
 * Update automation request schema (all fields optional except refine validation)
 */
export const updateAutomationSchema = z.object({
  name: z.string().min(1, 'Automation name cannot be empty').max(255, 'Name too long').optional(),
  triggerType: z.enum(['status_enter', 'manual']).optional(),
  triggerStatus: z.string().min(1, 'Trigger status cannot be empty').nullable().optional(),
  buttonLabel: z.string().min(1, 'Button label cannot be empty').max(100, 'Label too long').nullable().optional(),
  workflowId: z.string().uuid('Invalid workflow ID format').optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int('Priority must be an integer').optional(),
});

/**
 * Create transition request schema
 */
export const createTransitionSchema = z.object({
  condition: z.enum(['success', 'failure', 'custom'], {
    errorMap: () => ({ message: 'Condition must be "success", "failure", or "custom"' }),
  }),
  customExpression: z.string().min(1, 'Custom expression is required').optional(),
  nextStatus: z.string().min(1, 'Next status is required').max(255, 'Status name too long'),
  priority: z.number().int('Priority must be an integer').default(0),
}).refine(
  (data) => {
    // If condition is custom, customExpression is required
    if (data.condition === 'custom' && (data.customExpression === undefined || data.customExpression === '')) {
      return false;
    }
    return true;
  },
  {
    message: 'Custom condition requires customExpression',
    path: ['condition'],
  }
);

/**
 * Update transition request schema
 */
export const updateTransitionSchema = z.object({
  condition: z.enum(['success', 'failure', 'custom']).optional(),
  customExpression: z.string().min(1, 'Custom expression cannot be empty').nullable().optional(),
  nextStatus: z.string().min(1, 'Next status cannot be empty').max(255, 'Status name too long').optional(),
  priority: z.number().int('Priority must be an integer').optional(),
});

/**
 * Trigger automation request schema
 */
export const triggerAutomationSchema = z.object({
  automationId: z.string().uuid('Invalid automation ID format'),
});

/**
 * Type exports
 */
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
export type CreateTransitionInput = z.infer<typeof createTransitionSchema>;
export type UpdateTransitionInput = z.infer<typeof updateTransitionSchema>;
export type TriggerAutomationInput = z.infer<typeof triggerAutomationSchema>;
