/**
 * Dialog for creating a new feature
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/shared/modal';
import { Input } from '@/components/shared/input';
import { Button } from '@/components/shared/button';
import { useProjectStore } from '@/store/project.store';

interface NewFeatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  moduleSlug?: string; // Pre-select module
}

export function NewFeatureDialog({
  isOpen,
  onClose,
  moduleSlug,
}: NewFeatureDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModuleSlug, setSelectedModuleSlug] = useState(moduleSlug || '');
  const [error, setError] = useState<string | null>(null);
  const { createFeature, modules, loading } = useProjectStore();

  // Update selected module if prop changes
  useEffect(() => {
    if (moduleSlug) {
      setSelectedModuleSlug(moduleSlug);
    }
  }, [moduleSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedModuleSlug) return;

    setError(null);
    try {
      const feature = await createFeature(selectedModuleSlug, name, description);
      setName('');
      setDescription('');
      setSelectedModuleSlug('');
      onClose();
      // Navigate to new feature
      router.push(`/features/${feature.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create feature');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setDescription('');
      setSelectedModuleSlug('');
      setError(null);
      onClose();
    }
  };

  const hasModules = modules.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Feature"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {!hasModules ? (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
            Please create a module first before adding features.
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Module *
              </label>
              <select
                value={selectedModuleSlug}
                onChange={(e) => setSelectedModuleSlug(e.target.value)}
                disabled={loading || !!moduleSlug}
                required
                className="w-full px-3 py-2 bg-bg-secondary text-text-primary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus disabled:opacity-50"
              >
                <option value="">Select a module...</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Feature Name"
              placeholder="e.g., User Login, Email Verification"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />

            <Input
              label="Description"
              placeholder="Brief description of this feature"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!hasModules || !name.trim() || !selectedModuleSlug || loading}
            loading={loading}
          >
            Create Feature
          </Button>
        </div>
      </form>
    </Modal>
  );
}
