import type { FileSizeParts } from '../models/file-size-parts.interface';

const KB = 1024;
const MB = KB * KB;

/** A byte count as KB (rounded up, at least 1) or as MB with one decimal. */
export function fileSizeParts(bytes: number): FileSizeParts {
  if (bytes >= MB) {
    return { unit: 'mb', value: Math.round((bytes / MB) * 10) / 10 };
  }
  return { unit: 'kb', value: Math.max(1, Math.ceil(bytes / KB)) };
}
