'use client';

/**
 * F4: Cross-References Navigator
 *
 * Shows what references this artifact and what it references.
 * Provides clickable navigation between related artifacts.
 */

import { useState, useEffect } from 'react';
import { ArrowRightIcon, ArrowLeftIcon, LinkIcon } from '@heroicons/react/24/outline';
import type { ArtifactType } from '@/components/features/history-viewer';

export interface CrossReference {
  id: string;
  type: ArtifactType;
  name: string;
  relationshipType: 'uses' | 'used_by' | 'related_to';
  description?: string;
}

interface CrossReferencePanelProps {
  artifactType: ArtifactType;
  artifactId: string;
  onNavigate?: (type: ArtifactType, id: string) => void;
}

export function CrossReferencePanel({
  artifactType,
  artifactId,
  onNavigate,
}: CrossReferencePanelProps) {
  const [references, setReferences] = useState<CrossReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'incoming' | 'outgoing' | 'all'>('all');

  useEffect(() => {
    const loadReferences = async () => {
      setLoading(true);
      try {
        // TODO: Implement API call to fetch cross-references
        const response = await fetch(
          `/api/artifacts/${artifactType}/${artifactId}/references`
        );
        if (response.ok) {
          const data = await response.json();
          setReferences(data.references || []);
        }
      } catch (error) {
        console.error('Failed to load references:', error);
      } finally {
        setLoading(false);
      }
    };
    loadReferences();
  }, [artifactType, artifactId]);

  const filteredReferences = references.filter((ref) => {
    if (selectedTab === 'incoming') return ref.relationshipType === 'used_by';
    if (selectedTab === 'outgoing') return ref.relationshipType === 'uses';
    return true;
  });

  const incomingCount = references.filter((r) => r.relationshipType === 'used_by').length;
  const outgoingCount = references.filter((r) => r.relationshipType === 'uses').length;

  const getTypeColor = (type: ArtifactType) => {
    switch (type) {
      case 'feature':
        return 'bg-blue-900/40 text-blue-300 border-blue-700';
      case 'schema':
        return 'bg-green-900/40 text-green-300 border-green-700';
      case 'api':
        return 'bg-amber-900/40 text-amber-300 border-amber-700';
      case 'component':
        return 'bg-purple-900/40 text-purple-300 border-purple-700';
      default:
        return 'bg-gray-900/40 text-gray-300 border-gray-700';
    }
  };

  const getRelationshipIcon = (type: CrossReference['relationshipType']) => {
    switch (type) {
      case 'uses':
        return <ArrowRightIcon className="h-4 w-4 text-blue-400" />;
      case 'used_by':
        return <ArrowLeftIcon className="h-4 w-4 text-green-400" />;
      default:
        return <LinkIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/40">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Cross References
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {artifactType}: <span className="font-mono">{artifactId}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 px-4">
        <div className="flex gap-2 -mb-px">
          <button
            onClick={() => setSelectedTab('all')}
            className={`
              px-3 py-2 text-sm font-medium border-b-2 transition-colors
              ${
                selectedTab === 'all'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }
            `}
            aria-label="Show all references"
          >
            All ({references.length})
          </button>
          <button
            onClick={() => setSelectedTab('incoming')}
            className={`
              px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1
              ${
                selectedTab === 'incoming'
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }
            `}
            aria-label="Show incoming references"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Used By ({incomingCount})
          </button>
          <button
            onClick={() => setSelectedTab('outgoing')}
            className={`
              px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1
              ${
                selectedTab === 'outgoing'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }
            `}
            aria-label="Show outgoing references"
          >
            <ArrowRightIcon className="h-4 w-4" />
            Uses ({outgoingCount})
          </button>
        </div>
      </div>

      {/* References list */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading references...</div>
        ) : filteredReferences.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {selectedTab === 'all'
              ? 'No references found'
              : selectedTab === 'incoming'
              ? 'No incoming references'
              : 'No outgoing references'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReferences.map((ref) => (
              <button
                key={ref.id}
                onClick={() => onNavigate?.(ref.type, ref.id)}
                className="
                  w-full text-left p-3 rounded-lg border border-gray-700
                  hover:border-blue-500 hover:bg-gray-700/40
                  transition-colors group
                "
                aria-label={`Navigate to ${ref.type} ${ref.name}`}
              >
                <div className="flex items-start gap-3">
                  {/* Relationship icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getRelationshipIcon(ref.relationshipType)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Type badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`
                          inline-block px-2 py-0.5 rounded text-xs font-semibold border
                          ${getTypeColor(ref.type)}
                        `}
                      >
                        {ref.type}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {ref.relationshipType.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {ref.name}
                    </div>

                    {/* Description */}
                    {ref.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {ref.description}
                      </p>
                    )}
                  </div>

                  {/* Navigation arrow */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRightIcon className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredReferences.length > 0 && (
        <div className="border-t border-gray-700 px-4 py-2 text-xs text-gray-500">
          Click any reference to navigate
        </div>
      )}
    </div>
  );
}
