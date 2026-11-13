import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads a repo file (path relative to the workspace root) as text. The unit-test builder bundles
 * specs, so `import.meta.url` no longer points at the source folder; Nx runs executors from the
 * workspace root.
 */
export function readRepoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}
