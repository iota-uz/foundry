'use client';

/**
 * First Run Welcome Wizard
 *
 * Onboarding experience for new users.
 */

import { useState } from 'react';
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
}

interface FirstRunProps {
  onComplete?: () => void;
}

export function FirstRun({ onComplete }: FirstRunProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Foundry',
      description: 'Your AI-powered specification constructor',
      content: (
        <div className="text-center max-w-lg mx-auto space-y-4">
          <div className="text-6xl mb-4">🏗️</div>
          <h2 className="text-2xl font-bold text-white">Welcome to Foundry</h2>
          <p className="text-gray-400 leading-relaxed">
            Foundry helps you transform vague product ideas into detailed technical
            specifications through an AI-driven Q&A process.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-lg bg-gray-800/40 border border-gray-700">
              <div className="text-2xl mb-2">💬</div>
              <h3 className="text-sm font-semibold text-white mb-1">AI-Guided Q&A</h3>
              <p className="text-xs text-gray-500">
                Answer questions across CPO, Clarify, and CTO phases
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-800/40 border border-gray-700">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="text-sm font-semibold text-white mb-1">Visual Specs</h3>
              <p className="text-xs text-gray-500">
                Generate schemas, APIs, and UI mockups automatically
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-800/40 border border-gray-700">
              <div className="text-2xl mb-2">🔄</div>
              <h3 className="text-sm font-semibold text-white mb-1">Git Integration</h3>
              <p className="text-xs text-gray-500">
                Version control with branches and commits
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'workflow',
      title: 'Three-Phase Workflow',
      description: 'CPO → Clarify → CTO',
      content: (
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-xl font-bold text-white text-center mb-6">
            How the Workflow Works
          </h2>

          <div className="space-y-4">
            {/* CPO Phase */}
            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-blue-300 mb-1">CPO Phase</h3>
                  <p className="text-sm text-gray-300">
                    Define product scope, user experience, and business requirements.
                    AI asks questions about features, users, and goals.
                  </p>
                </div>
              </div>
            </div>

            {/* Clarify Phase */}
            <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-700">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-amber-300 mb-1">Clarify Phase</h3>
                  <p className="text-sm text-gray-300">
                    AI detects ambiguities and asks clarifying questions to ensure
                    nothing is missed or misunderstood.
                  </p>
                </div>
              </div>
            </div>

            {/* CTO Phase */}
            <div className="p-4 rounded-lg bg-green-900/20 border border-green-700">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-green-300 mb-1">CTO Phase</h3>
                  <p className="text-sm text-gray-300">
                    Make technical decisions about architecture, data models, APIs,
                    and technology choices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'features',
      title: 'Key Features',
      description: 'What makes Foundry powerful',
      content: (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-6">
            Key Features
          </h2>

          <div className="space-y-3">
            {[
              {
                title: 'Live Preview',
                description:
                  'See spec updates in real-time as you answer questions',
                icon: '👁️',
              },
              {
                title: 'Decision Journal',
                description:
                  'Track all decisions with undo capability and cascade preview',
                icon: '📝',
              },
              {
                title: 'Impact Previews',
                description:
                  'Understand the impact of each choice before committing',
                icon: '⚡',
              },
              {
                title: 'Recommendations',
                description:
                  'AI suggests best practices with explanations',
                icon: '💡',
              },
              {
                title: 'Visual Diagrams',
                description:
                  'Interactive database schemas, API docs, and dependency graphs',
                icon: '📊',
              },
              {
                title: 'Actualize',
                description:
                  'Compare spec with code and apply changes selectively',
                icon: '🔄',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/40 border border-gray-700"
              >
                <div className="text-2xl">{feature.icon}</div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'ready',
      title: 'Ready to Start',
      description: 'Let\'s build your specification',
      content: (
        <div className="text-center max-w-md mx-auto space-y-4">
          <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">You\'re All Set!</h2>
          <p className="text-gray-400 leading-relaxed">
            You\'re ready to start building your first specification. Click "Get Started"
            to create a new project or open an existing one.
          </p>
          <div className="pt-4">
            <button
              onClick={onComplete}
              className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  if (!currentStep) {
    return null; // Safety check for array access
  }

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = () => {
    onComplete?.();
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Progress indicator */}
      <div className="border-b border-gray-700 bg-gray-800/40">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-400">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Skip onboarding"
            >
              Skip
            </button>
          </div>
          <div className="flex gap-1">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`
                  h-1 flex-1 rounded-full transition-colors
                  ${idx <= currentStepIndex ? 'bg-blue-500' : 'bg-gray-700'}
                `}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          {/* Step content */}
          <div className="mb-8">{currentStep.content}</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t border-gray-700 bg-gray-800/40">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={isFirstStep}
              className="flex items-center gap-2 px-4 py-2 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              aria-label="Previous step"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              Previous
            </button>

            <div className="flex gap-2">
              {steps.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`
                    w-2 h-2 rounded-full transition-colors
                    ${idx === currentStepIndex ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'}
                  `}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              aria-label={isLastStep ? 'Finish onboarding' : 'Next step'}
            >
              {isLastStep ? 'Finish' : 'Next'}
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
