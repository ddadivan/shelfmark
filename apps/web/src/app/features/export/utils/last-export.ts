import { EXPORT_FORMAT, type ExportFormat } from '@shelfmark/contracts';
import type { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import type { LastExport } from '../models/last-export.interface';

function isFormat(value: unknown): value is ExportFormat {
  return (Object.values(EXPORT_FORMAT) as unknown[]).includes(value);
}

/** The remembered last export, or `null` when unknown, malformed or the storage is blocked. */
export function readLastExport(storage: SafeStorage): LastExport | null {
  const parsed = storage.getJson<object | null>(
    STORAGE_KEY.LastExport,
    (value): value is object => typeof value === 'object' && value !== null,
    null,
  );
  if (parsed === null) {
    return null;
  }
  const { format, at } = parsed as Record<string, unknown>;
  return isFormat(format) && typeof at === 'string' && !Number.isNaN(Date.parse(at))
    ? { format, at }
    : null;
}

/** Remembers `format` as exported now; a blocked or full storage is ignored. */
export function writeLastExport(
  storage: SafeStorage,
  format: ExportFormat,
  now: Date = new Date(),
): LastExport {
  const last: LastExport = { format, at: now.toISOString() };
  // A blocked or full storage: the line just stays out next time.
  storage.setJson(STORAGE_KEY.LastExport, last);
  return last;
}
