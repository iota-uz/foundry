'use client';

/**
 * Project Picker Component
 *
 * Select existing project or create new one.
 */

import { useState, useEffect } from 'react';
import {
  FolderIcon,
  PlusIcon,
  ClockIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  path: string;
  phase: 'cpo' | 'clarify' | 'cto' | 'complete';
  lastModified: string;
}

interface ProjectPickerProps {
  onSelectProject?: (projectPath: string) => void;
  onCreateNew?: () => void;
}

export function ProjectPicker({ onSelectProject, onCreateNew }: ProjectPickerProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadRecentProjects();
  }, []);

  const loadRecentProjects = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to fetch recent projects
      const response = await fetch('/api/projects/recent');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPhaseColor = (phase: ProjectInfo['phase']) => {
    switch (phase) {
      case 'cpo':
        return 'bg-blue-900/40 text-blue-300 border-blue-700';
      case 'clarify':
        return 'bg-amber-900/40 text-amber-300 border-amber-700';
      case 'cto':
        return 'bg-green-900/40 text-green-300 border-green-700';
      case 'complete':
        return 'bg-purple-900/40 text-purple-300 border-purple-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome to Foundry</h1>
        <p className="text-gray-400">
          Select an existing project or create a new specification
        </p>
      </div>

      {/* Search and create */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 rounded bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            aria-label="Search projects"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          aria-label="Create new project"
        >
          <PlusIcon className="h-5 w-5" />
          New Project
        </button>
      </div>

      {/* Projects list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            {searchQuery ? 'No projects found' : 'No recent projects'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? 'Try a different search term'
              : 'Get started by creating a new project'}
          </p>
          {!searchQuery && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Create Your First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                setSelectedId(project.id);
                onSelectProject?.(project.path);
              }}
              className={`
                text-left p-4 rounded-lg border transition-all
                ${
                  selectedId === project.id
                    ? 'border-blue-500 bg-blue-900/20 ring-2 ring-blue-500/50'
                    : 'border-gray-700 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-700/40'
                }
              `}
              aria-label={`Select project ${project.name}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FolderIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <h3 className="font-semibold text-white truncate">{project.name}</h3>
                </div>
                <span
                  className={`
                    inline-block px-2 py-0.5 rounded text-xs font-semibold border
                    ${getPhaseColor(project.phase)}
                  `}
                >
                  {project.phase.toUpperCase()}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                {project.description}
              </p>

              {/* Footer */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ClockIcon className="h-4 w-4" />
                <span>{formatDate(project.lastModified)}</span>
              </div>

              {/* Path */}
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-xs font-mono text-gray-600 truncate">
                  {project.path}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
