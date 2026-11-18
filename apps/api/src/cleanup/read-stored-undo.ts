import { TAG_LIMIT } from '@shelfmark/contracts';
import type { StoredCleanupUndo } from './models/stored-cleanup-undo.interface';
import type { StoredUndoMerge } from './models/stored-undo-merge.interface';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const uuids = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter(isUuid))] : [];

function readMerge(value: unknown): StoredUndoMerge | null {
  if (!isRecord(value)) return null;
  const { keptTagId, mergedName } = value;
  if (!isUuid(keptTagId) || typeof mergedName !== 'string') return null;
  if (mergedName.length < 1 || mergedName.length > TAG_LIMIT.NameMax) return null;
  return {
    keptTagId,
    mergedName,
    linkIds: uuids(value['linkIds']),
    addedLinkIds: uuids(value['addedLinkIds']),
  };
}

/**
 * Narrows `cleanup_reports.undo_data` (jsonb) to `StoredCleanupUndo`, or `null` when it is missing
 * or malformed (nothing to undo); malformed ids and merges are dropped one by one.
 */
export function readStoredUndo(value: unknown): StoredCleanupUndo | null {
  if (!isRecord(value)) return null;
  const { deletedAt } = value;
  const time = typeof deletedAt === 'string' ? new Date(deletedAt) : null;
  if (deletedAt !== null && (time === null || Number.isNaN(time.getTime()))) return null;
  const merges: StoredUndoMerge[] = [];
  for (const entry of Array.isArray(value['merges']) ? value['merges'] : []) {
    const merge = readMerge(entry);
    if (merge !== null) merges.push(merge);
  }
  return {
    deletedAt: time === null ? null : time.toISOString(),
    trashedIds: uuids(value['trashedIds']),
    merges,
  };
}
