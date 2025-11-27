'use client';

import React, { useState } from 'react';
import { Button } from '@/components/shared';
import {
  CheckIcon,
  ClockIcon,
  PlayIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import type { Task, TaskStatus } from '@/types';

interface TaskListProps {
  tasks: Task[];
  percentComplete: number;
  onUpdateTaskStatus?: (taskId: string, status: TaskStatus) => Promise<void>;
}

export function TaskList({
  tasks,
  percentComplete,
  onUpdateTaskStatus,
}: TaskListProps) {
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!onUpdateTaskStatus) return;
    setUpdatingTaskId(taskId);
    try {
      await onUpdateTaskStatus(taskId, newStatus);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Implementation Tasks
        </h3>
        <p className="text-text-secondary">
          No tasks defined yet. Tasks are auto-generated from the implementation plan.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          Implementation Tasks
        </h3>
        <div className="text-sm text-text-secondary">
          {tasks.filter((t) => t.status === 'completed').length}/{tasks.length} completed
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">Progress</span>
          <span className="text-sm text-text-secondary">{percentComplete}%</span>
        </div>
        <div className="w-full bg-bg-tertiary rounded-full h-2">
          <div
            className="h-full rounded-full bg-accent-primary transition-all"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {tasks.map((task) => {
          const isBlocked = task.dependsOn.length > 0;
          const allDependenciesMet = tasks.every(
            (t) => !task.dependsOn.includes(t.id) || t.status === 'completed'
          );

          return (
            <TaskItemComponent
              key={task.id}
              task={task}
              isBlocked={isBlocked && !allDependenciesMet}
              isUpdating={updatingTaskId === task.id}
              onStatusChange={handleStatusChange}
            />
          );
        })}
      </div>
    </div>
  );
}

function TaskItemComponent({
  task,
  isBlocked,
  isUpdating,
  onStatusChange,
}: {
  task: Task;
  isBlocked: boolean;
  isUpdating: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
}) {
  const getIcon = () => {
    if (isBlocked) {
      return <LockClosedIcon className="h-5 w-5 text-text-tertiary" />;
    }
    switch (task.status) {
      case 'completed':
        return <CheckIcon className="h-5 w-5 text-accent-success" />;
      case 'in_progress':
        return <PlayIcon className="h-5 w-5 text-accent-warning" />;
      default:
        return <ClockIcon className="h-5 w-5 text-text-secondary" />;
    }
  };

  const getComplexityColor = () => {
    switch (task.complexity) {
      case 'low':
        return 'bg-green-900/30 text-green-300';
      case 'medium':
        return 'bg-yellow-900/30 text-yellow-300';
      case 'high':
        return 'bg-red-900/30 text-red-300';
      default:
        return 'bg-gray-900/30 text-gray-300';
    }
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg
        ${isBlocked ? 'bg-bg-tertiary/30 opacity-60' : 'hover:bg-bg-tertiary transition-colors'}
      `}
    >
      <div className="flex-shrink-0 pt-1">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            isBlocked ? 'text-text-tertiary line-through' : 'text-text-primary'
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded ${getComplexityColor()}`}>
            {task.complexity.charAt(0).toUpperCase() + task.complexity.slice(1)}
          </span>
          {task.dependsOn.length > 0 && (
            <span className="text-xs text-text-secondary">
              {task.dependsOn.length} dependency
              {task.dependsOn.length > 1 ? 'ies' : ''}
            </span>
          )}
        </div>
      </div>

      {!isBlocked && (
        <div className="flex-shrink-0 flex gap-1">
          {task.status !== 'completed' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onStatusChange(task.id, 'completed')}
              loading={isUpdating}
              disabled={isBlocked}
              title={isBlocked ? 'Complete dependencies first' : 'Mark as complete'}
              icon={<CheckIcon className="h-4 w-4" />}
            >
              Mark Done
            </Button>
          )}
          {task.status !== 'in_progress' && !isBlocked && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onStatusChange(task.id, 'in_progress')}
              loading={isUpdating}
              title="Mark as in progress"
            >
              Start
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
