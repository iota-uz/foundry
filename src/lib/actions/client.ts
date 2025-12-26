'use server';

import { createSafeActionClient } from 'next-safe-action';

export const actionClient = createSafeActionClient({
  handleServerError: (error) => {
    console.error('Server action error:', error);
    return error instanceof Error ? error.message : 'An unexpected error occurred';
  },
});
