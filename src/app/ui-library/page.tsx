'use client';

/**
 * UI Library Showcase Page
 *
 * Interactive component playground with props documentation.
 */

import { useState } from 'react';
import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import { Select } from '@/components/shared/select';
import { Modal } from '@/components/shared/modal';
import { Toast } from '@/components/shared/toast';
import { Skeleton } from '@/components/shared/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

export default function UILibraryPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('option1');
  const [selectedTab, setSelectedTab] = useState<string>('buttons');

  const tabs = [
    { id: 'buttons', label: 'Buttons' },
    { id: 'inputs', label: 'Inputs' },
    { id: 'feedback', label: 'Feedback' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">UI Component Library</h1>
          <p className="text-gray-400">
            Interactive showcase of all shared components with examples and props documentation.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`
                  px-4 py-2 border-b-2 font-medium transition-colors
                  ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons Section */}
        {selectedTab === 'buttons' && (
          <div className="space-y-8">
            <ComponentSection
              title="Button"
              description="Primary action buttons with variants and states"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button disabled>Disabled</Button>
                  <Button loading>Loading</Button>
                </div>
              </div>

              <CodeBlock code={`<Button variant="primary">Click me</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="danger">Delete</Button>
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>`} />
            </ComponentSection>
          </div>
        )}

        {/* Inputs Section */}
        {selectedTab === 'inputs' && (
          <div className="space-y-8">
            <ComponentSection
              title="Input"
              description="Text input with label and helper text"
            >
              <div className="space-y-4 max-w-md">
                <Input
                  label="Email"
                  type="email"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter your email"
                  helperText="We'll never share your email"
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter password"
                  error="Password is required"
                />

                <Input
                  label="Disabled Input"
                  value="Cannot edit"
                  disabled
                />
              </div>

              <CodeBlock code={`<Input
  label="Email"
  type="email"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Enter your email"
  helperText="Helper text"
/>`} />
            </ComponentSection>

            <ComponentSection
              title="Select"
              description="Dropdown select with options"
            >
              <div className="max-w-md">
                <Select
                  label="Choose an option"
                  value={selectValue}
                  onChange={(value) => setSelectValue(value)}
                  options={[
                    { value: 'option1', label: 'Option 1' },
                    { value: 'option2', label: 'Option 2' },
                    { value: 'option3', label: 'Option 3' },
                  ]}
                />
              </div>

              <CodeBlock code={`<Select
  label="Choose an option"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ]}
/>`} />
            </ComponentSection>
          </div>
        )}

        {/* Feedback Section */}
        {selectedTab === 'feedback' && (
          <div className="space-y-8">
            <ComponentSection
              title="Modal"
              description="Dialog overlay with focus trap"
            >
              <div>
                <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
                <Modal
                  isOpen={modalOpen}
                  onClose={() => setModalOpen(false)}
                  title="Example Modal"
                >
                  <p className="text-gray-300">
                    This is a modal dialog with automatic focus management and escape key support.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={() => setModalOpen(false)}>
                      Confirm
                    </Button>
                  </div>
                </Modal>
              </div>

              <CodeBlock code={`<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Example Modal"
>
  <p>Modal content goes here</p>
</Modal>`} />
            </ComponentSection>

            <ComponentSection
              title="Toast"
              description="Toast notifications for feedback"
            >
              <div className="space-y-2">
                <Button onClick={() => setToastVisible(true)}>Show Toast</Button>
                {toastVisible && (
                  <Toast
                    message="Operation successful!"
                    type="success"
                    onClose={() => setToastVisible(false)}
                  />
                )}
              </div>

              <CodeBlock code={`{visible && (
  <Toast
    message="Success!"
    type="success"
    onClose={() => setVisible(false)}
  />
)}`} />
            </ComponentSection>

            <ComponentSection
              title="Skeleton"
              description="Loading placeholders"
            >
              <div className="space-y-3 max-w-md">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-32 w-full" />
              </div>

              <CodeBlock code={`<Skeleton className="h-8 w-3/4" />
<Skeleton className="h-4 w-full" />
<Skeleton className="h-32 w-full" />`} />
            </ComponentSection>

            <ComponentSection
              title="Empty State"
              description="Empty state with icon and action"
            >
              <EmptyState
                icon={
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                }
                title="No items found"
                description="Get started by creating your first item"
                action={{
                  label: 'Create Item',
                  onClick: () => console.log('Create clicked'),
                }}
              />

              <CodeBlock code={`<EmptyState
  icon={<FolderIcon />}
  title="No items found"
  description="Get started by creating your first item"
  action={{
    label: 'Create Item',
    onClick: () => console.log('Create clicked')
  }}
/>`} />
            </ComponentSection>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for sections
function ComponentSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/40 overflow-hidden">
      <div className="border-b border-gray-700 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// Code block component
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs text-white transition-colors"
        aria-label="Copy code"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="p-4 rounded bg-gray-900 border border-gray-700 overflow-x-auto">
        <code className="text-sm text-gray-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}
