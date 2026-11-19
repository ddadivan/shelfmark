import { LINK_KIND, type LinkKind } from '@shelfmark/contracts';
import type { StoredLinkResult } from '../models/stored-link-result.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function storedStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === 'string' && tag !== '')
    : [];
}

/** `newTags`, or the single `newTag` an older job stored before up to two were allowed. */
function storedNewTags(value: Record<string, unknown>): string[] {
  const list = value['newTags'];
  if (Array.isArray(list)) {
    return list.filter((tag): tag is string => typeof tag === 'string' && tag !== '');
  }
  const legacy = stringOrNull(value['newTag']);
  return legacy === null ? [] : [legacy];
}

const KINDS: readonly string[] = Object.values(LINK_KIND);

function storedKind(value: unknown): LinkKind | null {
  return typeof value === 'string' && KINDS.includes(value) ? (value as LinkKind) : null;
}

/** Reads `ai_jobs.result` back; `null` when it is missing or not the shape the runner wrote. */
export function toStoredLinkResult(value: unknown): StoredLinkResult | null {
  if (!isRecord(value) || !Array.isArray(value['tags'])) return null;
  return {
    tags: value['tags'].filter((tag): tag is string => typeof tag === 'string'),
    newTags: storedNewTags(value),
    moreTags: storedStrings(value['moreTags']),
    folderId: stringOrNull(value['folderId']),
    summary: stringOrNull(value['summary']),
    title: stringOrNull(value['title']),
    kind: storedKind(value['kind']),
  };
}
