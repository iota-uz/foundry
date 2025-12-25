/**
 * Create Project Page
 *
 * Multi-step wizard for creating a new project.
 * Steps:
 * 1. Basic Info - Name only
 * 2. GitHub Connection - Token and project URL
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import {
  WizardShell,
  StepBasicInfo,
  StepGitHubConnection,
  type WizardStep,
} from '@/components/projects';
import { useProjectStore } from '@/store/project.store';
import { parseGitHubProjectUrl } from '@/lib/projects/github-url-parser';

// ============================================================================
// Wizard Steps Configuration
// ============================================================================

const STEPS: WizardStep[] = [
  {
    id: 'basic',
    title: 'Basic Info',
    description: 'Give your project a name',
  },
  {
    id: 'github',
    title: 'GitHub Connection',
    description: 'Connect to a GitHub Project V2',
  },
];

// ============================================================================
// Form State Type
// ============================================================================

interface FormState {
  name: string;
  githubToken: string;
  projectUrl: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function CreateProjectPage() {
  const router = useRouter();
  const { createProject, isLoading } = useProjectStore();

  // Current step
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [formState, setFormState] = useState<FormState>({
    name: '',
    githubToken: '',
    projectUrl: '',
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGitHubValid, setIsGitHubValid] = useState(false);

  // Update form field
  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors]
  );

  // Validate current step
  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 0: // Basic Info
        if (!formState.name.trim()) {
          newErrors.name = 'Project name is required';
        } else if (formState.name.length > 100) {
          newErrors.name = 'Name must be 100 characters or less';
        }
        break;

      case 1: // GitHub Connection
        if (!formState.githubToken.trim()) {
          newErrors.token = 'GitHub token is required';
        }
        if (!formState.projectUrl.trim()) {
          newErrors.projectUrl = 'GitHub project URL is required';
        } else if (!parseGitHubProjectUrl(formState.projectUrl)) {
          newErrors.projectUrl = 'Invalid GitHub project URL format';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, formState]);

  // Handle step navigation
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleNext = useCallback(async () => {
    if (!validateStep()) {
      return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Final step - create project
      try {
        // Parse the project URL to extract owner and number
        const parsedProject = parseGitHubProjectUrl(formState.projectUrl);

        if (!parsedProject) {
          setErrors({
            submit: 'Invalid GitHub project URL',
          });
          return;
        }

        const project = await createProject({
          name: formState.name.trim(),
          githubToken: formState.githubToken,
          githubProjectOwner: parsedProject.owner,
          githubProjectNumber: parsedProject.projectNumber,
        });

        // Navigate to the new project
        router.push(`/projects/${project.id}`);
      } catch (error) {
        setErrors({
          submit:
            error instanceof Error ? error.message : 'Failed to create project',
        });
      }
    }
  }, [currentStep, formState, validateStep, createProject, router]);

  // Check if can proceed to next step
  const canGoNext = useCallback((): boolean => {
    switch (currentStep) {
      case 0:
        return formState.name.trim().length > 0;
      case 1:
        return (
          formState.githubToken.trim().length > 0 &&
          formState.projectUrl.trim().length > 0 &&
          isGitHubValid
        );
      default:
        return false;
    }
  }, [currentStep, formState, isGitHubValid]);

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepBasicInfo
            name={formState.name}
            onNameChange={(v) => updateField('name', v)}
            errors={{ name: errors.name }}
          />
        );

      case 1:
        return (
          <StepGitHubConnection
            token={formState.githubToken}
            projectUrl={formState.projectUrl}
            onTokenChange={(v) => updateField('githubToken', v)}
            onProjectUrlChange={(v) => updateField('projectUrl', v)}
            onValidationChange={setIsGitHubValid}
            errors={{
              token: errors.token,
              projectUrl: errors.projectUrl,
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: 'New Project' },
        ]}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="py-12 px-6">
          <WizardShell
            steps={STEPS}
            currentStep={currentStep}
            onBack={handleBack}
            onNext={handleNext}
            canGoNext={canGoNext()}
            isLastStep={currentStep === STEPS.length - 1}
            isSubmitting={isLoading}
          >
            {renderStepContent()}

            {/* Submit error */}
            {errors.submit && (
              <div className="mt-6 p-4 rounded-lg bg-accent-error/10 border border-accent-error/30">
                <p className="text-sm text-accent-error">{errors.submit}</p>
              </div>
            )}
          </WizardShell>
        </div>
      </div>
    </div>
  );
}
