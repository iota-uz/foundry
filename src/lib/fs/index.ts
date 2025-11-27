/**
 * File system utilities re-exports
 */

export * from './yaml';
export * from './paths';
export * from './atomic';
// Don't re-export watcher to avoid bundling chokidar in client builds
// Import watcher directly from '@/lib/fs/watcher' when needed
