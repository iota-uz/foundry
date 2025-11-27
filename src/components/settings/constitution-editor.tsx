'use client';

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/store';
import { Button } from '@/components/shared';
import { Constitution } from '@/types';
import {
  PlusIcon,
  DocumentTextIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const CONSTITUTION_TEMPLATES = {
  empty: {
    version: '1.0',
    principles: [],
    coding: {
      naming: {
        functions: '',
        classes: '',
        database_tables: '',
        database_columns: '',
      },
      style: {
        max_function_length: 50,
        require_docstrings: true,
        prefer_composition: true,
      },
    },
    security: {
      authentication: '',
      authorization: '',
      input_validation: '',
      secrets: '',
    },
    ux: {
      error_format: '',
      loading_states: '',
      accessibility: '',
    },
    constraints: {
      allowed_libraries: [],
      forbidden_libraries: [],
      node_version: '',
    },
    hooks: {} as any,
  },
  basic: {
    version: '1.0',
    principles: [
      'User data privacy is paramount',
      'Fail fast, fail gracefully',
      'Accessibility is not optional',
    ],
    coding: {
      naming: {
        functions: 'snake_case',
        classes: 'PascalCase',
        database_tables: 'snake_case_singular',
        database_columns: 'snake_case',
      },
      style: {
        max_function_length: 50,
        require_docstrings: true,
        prefer_composition: true,
      },
    },
    security: {
      authentication: 'JWT with refresh tokens',
      authorization: 'Role-based access control',
      input_validation: 'Sanitize all user input at API boundary',
      secrets: 'Environment variables only, never hardcode',
    },
    ux: {
      error_format: 'Include: what went wrong, why, how to fix',
      loading_states: 'Skeleton screens, not spinners',
      accessibility: 'WCAG 2.1 AA compliance',
    },
    constraints: {
      allowed_libraries: ['axios', 'date-fns', 'lodash'],
      forbidden_libraries: ['moment.js', 'jquery'],
      node_version: '>=20.0.0',
    },
    hooks: {
      onFeatureSave: [
        { action: 'validateSchema' as any },
        { action: 'updateChecklist' as any },
      ],
    },
  },
};

interface ConstitutionEditorState {
  isEditing: boolean;
  isSaving: boolean;
  showPreview: boolean;
  content: string;
}

export function ConstitutionEditor() {
  const { constitution, updateConstitution } = useProjectStore();
  const [state, setState] = useState<ConstitutionEditorState>({
    isEditing: false,
    isSaving: false,
    showPreview: false,
    content: constitution ? JSON.stringify(constitution, null, 2) : '',
  });

  useEffect(() => {
    if (constitution) {
      setState((prev) => ({
        ...prev,
        content: JSON.stringify(constitution, null, 2),
      }));
    }
  }, [constitution]);

  const handleCreateFromTemplate = async (template: keyof typeof CONSTITUTION_TEMPLATES) => {
    const templateData = CONSTITUTION_TEMPLATES[template];
    const newConstitution: Constitution = {
      version: templateData.version,
      principles: templateData.principles,
      coding: templateData.coding,
      security: templateData.security,
      ux: templateData.ux,
      constraints: templateData.constraints,
      hooks: templateData.hooks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      content: JSON.stringify(newConstitution, null, 2),
      isEditing: true,
    }));
  };

  const handleSave = async () => {
    try {
      setState((prev) => ({ ...prev, isSaving: true }));
      const parsed = JSON.parse(state.content);

      const constitutionToSave: Constitution = {
        ...parsed,
        updatedAt: new Date().toISOString(),
      };

      await updateConstitution(constitutionToSave);

      setState((prev) => ({
        ...prev,
        isSaving: false,
        isEditing: false,
      }));
    } catch (error) {
      console.error('Failed to save constitution:', error);
      alert('Invalid JSON format. Please check your constitution.');
      setState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const handleCancel = () => {
    if (constitution) {
      setState((prev) => ({
        ...prev,
        content: JSON.stringify(constitution, null, 2),
        isEditing: false,
      }));
    }
  };

  if (!constitution && !state.isEditing) {
    return (
      <div className="p-6 bg-bg-secondary border border-border-default rounded-lg">
        <div className="flex items-start gap-4 mb-6">
          <DocumentTextIcon className="h-12 w-12 text-accent-warning flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Constitution Defined
            </h3>
            <p className="text-text-secondary mb-4">
              A constitution helps AI generate consistent artifacts by defining
              coding standards, security rules, and patterns.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handleCreateFromTemplate('empty')}
            variant="secondary"
            className="w-full justify-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Empty
          </Button>
          <Button
            onClick={() => handleCreateFromTemplate('basic')}
            variant="primary"
            className="w-full justify-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Use Basic Template
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Editor header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Project Constitution
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            {state.isEditing
              ? 'Edit your project constitution'
              : 'Your project constitution guides AI decision-making'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!state.isEditing && (
            <Button
              onClick={() => setState((prev) => ({ ...prev, isEditing: true }))}
              variant="secondary"
              size="sm"
            >
              Edit
            </Button>
          )}

          {state.isEditing && (
            <>
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="sm"
                disabled={state.isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                variant="primary"
                size="sm"
                disabled={state.isSaving}
              >
                {state.isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      {state.isEditing && (
        <div className="border border-border-default rounded-lg overflow-hidden bg-bg-secondary">
          <textarea
            value={state.content}
            onChange={(e) =>
              setState((prev) => ({ ...prev, content: e.target.value }))
            }
            className="w-full h-96 p-4 bg-bg-secondary text-text-primary font-mono text-sm focus:outline-none resize-none"
            placeholder="Enter your constitution in JSON format"
          />
        </div>
      )}

      {/* Preview */}
      {!state.isEditing && constitution && (
        <div className="space-y-6 p-6 bg-bg-secondary border border-border-default rounded-lg">
          {/* Principles */}
          {constitution.principles && constitution.principles.length > 0 && (
            <div>
              <h4 className="font-semibold text-text-primary mb-3">
                Principles
              </h4>
              <ul className="space-y-2">
                {constitution.principles.map((principle, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckIcon className="h-5 w-5 text-accent-success flex-shrink-0 mt-0.5" />
                    <span className="text-text-secondary">{principle}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coding Standards */}
          {constitution.coding && (
            <div>
              <h4 className="font-semibold text-text-primary mb-3">
                Coding Standards
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Functions:</span>
                  <code className="text-accent-primary">
                    {constitution.coding.naming?.functions || '-'}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Classes:</span>
                  <code className="text-accent-primary">
                    {constitution.coding.naming?.classes || '-'}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">DB Tables:</span>
                  <code className="text-accent-primary">
                    {constitution.coding.naming?.database_tables || '-'}
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {constitution.security && (
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Security</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Authentication:</span>
                  <span className="text-text-primary">
                    {constitution.security.authentication || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Authorization:</span>
                  <span className="text-text-primary">
                    {constitution.security.authorization || '-'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* UX Patterns */}
          {constitution.ux && (
            <div>
              <h4 className="font-semibold text-text-primary mb-3">UX Patterns</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Error Format:</span>
                  <span className="text-text-primary">
                    {constitution.ux.error_format || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Loading States:</span>
                  <span className="text-text-primary">
                    {constitution.ux.loading_states || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Accessibility:</span>
                  <span className="text-text-primary">
                    {constitution.ux.accessibility || '-'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tech Constraints */}
          {constitution.constraints && (
            <div>
              <h4 className="font-semibold text-text-primary mb-3">
                Tech Constraints
              </h4>
              <div className="space-y-3 text-sm">
                {constitution.constraints.allowed_libraries &&
                  constitution.constraints.allowed_libraries.length > 0 && (
                    <div>
                      <span className="text-text-secondary block mb-1">
                        Allowed Libraries:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {constitution.constraints.allowed_libraries.map(
                          (lib, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-accent-success/10 text-accent-success rounded text-xs"
                            >
                              {lib}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                {constitution.constraints.forbidden_libraries &&
                  constitution.constraints.forbidden_libraries.length > 0 && (
                    <div>
                      <span className="text-text-secondary block mb-1">
                        Forbidden Libraries:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {constitution.constraints.forbidden_libraries.map(
                          (lib, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-accent-error/10 text-accent-error rounded text-xs"
                            >
                              {lib}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
