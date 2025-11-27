'use client';

import React from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';
import type { Feature } from '@/types';

interface TechnicalSectionProps {
  feature: Feature;
}

export function TechnicalSection({ feature }: TechnicalSectionProps) {
  const technical = feature.technical;

  if (!technical || (
    technical.schemaRefs.length === 0 &&
    technical.apiRefs.length === 0 &&
    technical.componentRefs.length === 0
  )) {
    return (
      <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Technical Artifacts
        </h3>
        <p className="text-text-secondary">
          No technical artifacts defined yet. Complete the CTO phase to see technical details.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-bg-secondary border border-border-default rounded-lg space-y-8">
      <h3 className="text-lg font-semibold text-text-primary">
        Technical Artifacts
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Schema References */}
        {technical.schemaRefs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">
              Database Entities
            </h4>
            <ul className="space-y-2">
              {technical.schemaRefs.map((ref, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-accent-primary flex-shrink-0 mt-0.5">
                    <LinkIcon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {ref.entity}
                    </p>
                    <p className="text-xs text-text-secondary">{ref.usage}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* API References */}
        {technical.apiRefs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">
              API Endpoints
            </h4>
            <ul className="space-y-2">
              {technical.apiRefs.map((ref, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-accent-primary flex-shrink-0 mt-0.5">
                    <LinkIcon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {ref.type === 'rest' ? (
                        <>
                          <span className="inline-block px-2 py-0.5 mr-2 bg-blue-900/30 text-blue-300 text-xs rounded font-mono">
                            {ref.method}
                          </span>
                          {ref.path}
                        </>
                      ) : (
                        <>
                          <span className="inline-block px-2 py-0.5 mr-2 bg-purple-900/30 text-purple-300 text-xs rounded font-mono">
                            GraphQL
                          </span>
                          {ref.operation}
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Component References */}
        {technical.componentRefs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">
              UI Components
            </h4>
            <ul className="space-y-2">
              {technical.componentRefs.map((ref, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-accent-primary flex-shrink-0 mt-0.5">
                    <LinkIcon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {ref.id}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {ref.type === 'page' ? 'Page' : 'Component'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Implementation Plan */}
      {feature.implementationPlan.length > 0 && (
        <div className="border-t border-border-default pt-6">
          <h4 className="text-sm font-semibold text-text-primary mb-4">
            Implementation Steps
          </h4>
          <div className="space-y-3">
            {feature.implementationPlan.map((step, index) => (
              <div key={step.id} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-accent-primary/20 border border-accent-primary rounded-full flex items-center justify-center text-xs font-semibold text-accent-primary">
                  {index + 1}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-medium text-text-primary">
                    {step.title}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {step.description}
                  </p>
                  <div className="mt-2">
                    <span className={`
                      inline-block px-2 py-0.5 text-xs rounded font-medium
                      ${step.complexity === 'low' && 'bg-green-900/30 text-green-300'}
                      ${step.complexity === 'medium' && 'bg-yellow-900/30 text-yellow-300'}
                      ${step.complexity === 'high' && 'bg-red-900/30 text-red-300'}
                    `}>
                      {step.complexity.charAt(0).toUpperCase() + step.complexity.slice(1)} Complexity
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
