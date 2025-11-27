/**
 * File watching using chokidar
 */

import chokidar from 'chokidar';

/**
 * File watch event
 */
export interface WatchEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
}

/**
 * Watch a file or directory
 * Returns a cleanup function to stop watching
 */
export function watch(
  path: string,
  callback: (event: WatchEvent) => void
): () => void {
  const watcher = chokidar.watch(path, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100,
    },
  });

  watcher.on('add', (filePath: string) => {
    callback({ type: 'add', path: filePath });
  });

  watcher.on('change', (filePath: string) => {
    callback({ type: 'change', path: filePath });
  });

  watcher.on('unlink', (filePath: string) => {
    callback({ type: 'unlink', path: filePath });
  });

  // Return cleanup function
  return () => {
    watcher.close();
  };
}

/**
 * Watch multiple paths
 */
export function watchMany(
  paths: string[],
  callback: (event: WatchEvent) => void
): () => void {
  const cleanupFunctions = paths.map((path) => watch(path, callback));

  // Return cleanup function that stops all watchers
  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
  };
}
