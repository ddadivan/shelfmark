import { EXPORT_FORMAT, type ExportFormat } from '@shelfmark/contracts';
import { LAST_EXPORT_STORAGE_KEY } from '../../../core/auth/models/last-export-storage-key.const';
import type { LastExport } from '../models/last-export.interface';

function isFormat(value: unknown): value is ExportFormat {
  return (Object.values(EXPORT_FORMAT) as unknown[]).includes(value);
}

/** The remembered last export, or `null` when unknown, malformed or the storage is blocked. */
export function readLastExport(): LastExport | null {
  try {
    const raw = globalThis.localStorage.getItem(LAST_EXPORT_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const { format, at } = parsed as Record<string, unknown>;
    return isFormat(format) && typeof at === 'string' && !Number.isNaN(Date.parse(at))
      ? { format, at }
      : null;
  } catch {
    return null;
  }
}

/** Remembers `format` as exported now; a blocked or full storage is ignored. */
export function writeLastExport(format: ExportFormat, now: Date = new Date()): LastExport {
  const last: LastExport = { format, at: now.toISOString() };
  try {
    globalThis.localStorage.setItem(LAST_EXPORT_STORAGE_KEY, JSON.stringify(last));
  } catch {
    // The line just stays out next time.
  }
  return last;
}
