/**
 * Dialog for creating a new module
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/shared/modal';
import { Input } from '@/components/shared/input';
import { Button } from '@/components/shared/button';
import { useProjectStore } from '@/store/project.store';

interface NewModuleDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewModuleDialog({ isOpen, onClose }: NewModuleDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { createModule, loading } = useProjectStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    try {
      const module = await createModule(name, description);
      setName('');
      setDescription('');
      onClose();
      // Navigate to new module
      router.push(`/modules/${module.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create module');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setDescription('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Module"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Module Name"
          placeholder="e.g., Authentication, Payment Processing"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
          autoFocus
        />

        <Input
          label="Description"
          placeholder="Brief description of this module"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />

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
            disabled={!name.trim() || loading}
            loading={loading}
          >
            Create Module
          </Button>
        </div>
      </form>
    </Modal>
  );
}
