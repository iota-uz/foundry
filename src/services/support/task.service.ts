/**
 * TaskService implementation
 * Handles task management for F8
 */

import { Task, TaskProgress, Feature } from '@/types/domain/feature';
import { generateId } from '@/lib/utils/id';
import { getFileService } from '@/services/core/file.service';
import { getFoundryDir } from '@/lib/fs/paths';
import path from 'path';

/**
 * TaskService interface
 */
export interface ITaskService {
  getTasks(featureId: string): Promise<Task[]>;
  createTask(featureId: string, task: Omit<Task, 'id'>): Promise<Task>;
  updateTask(
    featureId: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<Task>;
  deleteTask(featureId: string, taskId: string): Promise<void>;
  updateProgress(featureId: string): Promise<TaskProgress>;
  generateTasksFromImplementationPlan(feature: Feature): Task[];
}

/**
 * TaskService implementation
 */
export class TaskService implements ITaskService {
  private fileService = getFileService();
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Get feature file path
   *
   * TODO: Replace with proper feature service/registry when implemented
   * The feature service should provide:
   * - getFeaturePath(featureId: string): string
   * - getFeaturesByModule(moduleId: string): Feature[]
   * - getFeature(featureId: string): Feature
   * - searchFeatures(query: string): Feature[]
   *
   * This would centralize all feature file operations and provide
   * better error handling and caching.
   *
   * For now, we use a simple path lookup based on feature ID.
   * This assumes features are stored as: .foundry/features/{module-slug}/{feature-slug}.yaml
   */
  private getFeaturePath(featureId: string): string {
    // Current implementation: direct file path lookup
    // This works for now but should be replaced with a proper service
    return path.join(
      getFoundryDir(this.projectPath),
      'features',
      `${featureId}.yaml`
    );
  }

  /**
   * Read feature from file
   */
  private async readFeature(featureId: string): Promise<Feature> {
    try {
      const featurePath = this.getFeaturePath(featureId);
      return await this.fileService.readYaml<Feature>(featurePath);
    } catch (error) {
      throw new Error(`Failed to read feature: ${(error as Error).message}`);
    }
  }

  /**
   * Write feature to file
   */
  private async writeFeature(
    featureId: string,
    feature: Feature
  ): Promise<void> {
    try {
      const featurePath = this.getFeaturePath(featureId);
      await this.fileService.writeYaml(featurePath, feature);
    } catch (error) {
      throw new Error(`Failed to write feature: ${(error as Error).message}`);
    }
  }

  /**
   * Get tasks for a feature
   */
  async getTasks(featureId: string): Promise<Task[]> {
    const feature = await this.readFeature(featureId);
    return feature.tasks || [];
  }

  /**
   * Create a new task
   */
  async createTask(
    featureId: string,
    task: Omit<Task, 'id'>
  ): Promise<Task> {
    try {
      // Read feature
      const feature = await this.readFeature(featureId);

      // Create new task with ID
      const newTask: Task = {
        id: generateId('task'),
        ...task,
      };

      // Add to tasks
      feature.tasks = [...(feature.tasks || []), newTask];

      // Update progress
      feature.taskProgress = this.calculateProgress(feature.tasks);

      // Write feature
      await this.writeFeature(featureId, feature);

      return newTask;
    } catch (error) {
      throw new Error(`Failed to create task: ${(error as Error).message}`);
    }
  }

  /**
   * Update a task
   */
  async updateTask(
    featureId: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<Task> {
    try {
      // Read feature
      const feature = await this.readFeature(featureId);

      // Find task
      const taskIndex = feature.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Update task - preserve required fields
      const existingTask = feature.tasks[taskIndex];
      if (!existingTask) {
        throw new Error(`Task not found at index: ${taskIndex}`);
      }

      const updatedTask: Task = {
        id: existingTask.id,
        title: updates.title ?? existingTask.title,
        status: updates.status ?? existingTask.status,
        complexity: updates.complexity ?? existingTask.complexity,
        dependsOn: updates.dependsOn ?? existingTask.dependsOn,
        implementationStepId:
          updates.implementationStepId ?? existingTask.implementationStepId,
        ...(existingTask.completedAt !== undefined && {
          completedAt: updates.completedAt ?? existingTask.completedAt,
        }),
      };

      // Set completedAt if status changed to completed
      if (
        updates.status === 'completed' &&
        existingTask.status !== 'completed'
      ) {
        updatedTask.completedAt = new Date().toISOString();
      }

      feature.tasks[taskIndex] = updatedTask;

      // Update progress
      feature.taskProgress = this.calculateProgress(feature.tasks);

      // Write feature
      await this.writeFeature(featureId, feature);

      return updatedTask;
    } catch (error) {
      throw new Error(`Failed to update task: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(featureId: string, taskId: string): Promise<void> {
    try {
      // Read feature
      const feature = await this.readFeature(featureId);

      // Filter out task
      const filtered = feature.tasks.filter((t) => t.id !== taskId);

      if (filtered.length === feature.tasks.length) {
        throw new Error(`Task not found: ${taskId}`);
      }

      feature.tasks = filtered;

      // Update progress
      feature.taskProgress = this.calculateProgress(feature.tasks);

      // Write feature
      await this.writeFeature(featureId, feature);
    } catch (error) {
      throw new Error(`Failed to delete task: ${(error as Error).message}`);
    }
  }

  /**
   * Update task progress
   */
  async updateProgress(featureId: string): Promise<TaskProgress> {
    try {
      // Read feature
      const feature = await this.readFeature(featureId);

      // Calculate progress
      const progress = this.calculateProgress(feature.tasks);

      // Update feature
      feature.taskProgress = progress;

      // Write feature
      await this.writeFeature(featureId, feature);

      return progress;
    } catch (error) {
      throw new Error(`Failed to update progress: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate task progress
   */
  private calculateProgress(tasks: Task[]): TaskProgress {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;

    return {
      total,
      completed,
      inProgress,
      pending,
      percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /**
   * Generate tasks from implementation plan
   */
  generateTasksFromImplementationPlan(feature: Feature): Task[] {
    // Only generate for non-implemented features
    if (feature.implemented) {
      return [];
    }

    // Generate tasks from implementation steps
    const plan = feature.implementationPlan || [];
    const tasks: Task[] = plan.map((step, index) => {
      const prevStep = index > 0 ? plan[index - 1] : null;
      return {
        id: generateId('task'),
        title: step.title,
        status: 'pending' as const,
        complexity: step.complexity,
        dependsOn: prevStep ? [prevStep.id] : [],
        implementationStepId: step.id,
      };
    });

    return tasks;
  }

  /**
   * Regenerate tasks from implementation plan
   */
  async regenerateTasks(featureId: string): Promise<Task[]> {
    try {
      // Read feature
      const feature = await this.readFeature(featureId);

      // Generate new tasks
      const tasks = this.generateTasksFromImplementationPlan(feature);

      // Update feature
      feature.tasks = tasks;
      feature.taskProgress = this.calculateProgress(tasks);

      // Write feature
      await this.writeFeature(featureId, feature);

      return tasks;
    } catch (error) {
      throw new Error(
        `Failed to regenerate tasks: ${(error as Error).message}`
      );
    }
  }

  /**
   * Mark task as completed
   */
  async completeTask(featureId: string, taskId: string): Promise<Task> {
    return this.updateTask(featureId, taskId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Mark task as in progress
   */
  async startTask(featureId: string, taskId: string): Promise<Task> {
    return this.updateTask(featureId, taskId, {
      status: 'in_progress',
    });
  }

  /**
   * Get blocked tasks (tasks with incomplete dependencies)
   */
  async getBlockedTasks(featureId: string): Promise<Task[]> {
    const tasks = await this.getTasks(featureId);

    return tasks.filter((task) => {
      if (task.status === 'completed') {
        return false;
      }

      // Check if any dependencies are not completed
      const hasIncompleteDeps = task.dependsOn.some((depId) => {
        const depTask = tasks.find((t) => t.id === depId);
        return depTask && depTask.status !== 'completed';
      });

      return hasIncompleteDeps;
    });
  }

  /**
   * Get available tasks (tasks with no incomplete dependencies)
   */
  async getAvailableTasks(featureId: string): Promise<Task[]> {
    const tasks = await this.getTasks(featureId);
    const blocked = await this.getBlockedTasks(featureId);
    const blockedIds = new Set(blocked.map((t) => t.id));

    return tasks.filter(
      (task) =>
        task.status !== 'completed' &&
        !blockedIds.has(task.id)
    );
  }
}

/**
 * Create TaskService instance
 */
export function createTaskService(projectPath: string): TaskService {
  return new TaskService(projectPath);
}

/**
 * Singleton instance for current project
 */
let taskServiceInstance: TaskService | null = null;

export function getTaskService(projectPath?: string): TaskService {
  if (!taskServiceInstance) {
    if (!projectPath) {
      throw new Error('Project path required to initialize TaskService');
    }
    taskServiceInstance = new TaskService(projectPath);
  }
  return taskServiceInstance;
}

/**
 * Reset singleton instance
 */
export function resetTaskService(): void {
  taskServiceInstance = null;
}
