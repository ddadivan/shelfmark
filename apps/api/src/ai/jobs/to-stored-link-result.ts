import type { StoredLinkResult } from '../models/stored-link-result.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** Reads `ai_jobs.result` back; `null` when it is missing or not the shape the runner wrote. */
export function toStoredLinkResult(value: unknown): StoredLinkResult | null {
  if (!isRecord(value) || !Array.isArray(value['tags'])) return null;
  return {
    tags: value['tags'].filter((tag): tag is string => typeof tag === 'string'),
    newTag: stringOrNull(value['newTag']),
    folderId: stringOrNull(value['folderId']),
    summary: stringOrNull(value['summary']),
  };
}
