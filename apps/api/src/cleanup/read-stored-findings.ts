import type { Prisma } from '../generated/prisma/client';
import { CLEANUP_SOURCE, DUPLICATE_REASON } from '@shelfmark/contracts';
import { CLEANUP_CHECK_KEY } from './models/cleanup-check-key.const';
import type { CleanupCheckKey } from './models/cleanup-check-key.type';
import type { StoredCleanupFindings } from './models/stored-cleanup-findings.interface';
import type { StoredDuplicateGroup } from './models/stored-duplicate-group.interface';
import type { StoredTagPair } from './models/stored-tag-pair.interface';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GROUP_ID = /^[A-Za-z0-9_-]{1,32}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const isGroupId = (value: unknown): value is string =>
  typeof value === 'string' && GROUP_ID.test(value);
const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

const REASONS = Object.values(DUPLICATE_REASON);
const SOURCES = Object.values(CLEANUP_SOURCE);
const CHECK_KEYS = Object.values(CLEANUP_CHECK_KEY);

function readGroup(value: unknown): StoredDuplicateGroup | null {
  if (!isRecord(value)) return null;
  const { id, reason, source, linkIds } = value;
  if (!isGroupId(id) || !isOneOf(REASONS, reason) || !isOneOf(SOURCES, source)) return null;
  if (!Array.isArray(linkIds) || !linkIds.every(isUuid)) return null;
  const unique = [...new Set(linkIds)];
  return unique.length >= 2 ? { id, reason, source, linkIds: unique } : null;
}

function readPair(value: unknown): StoredTagPair | null {
  if (!isRecord(value)) return null;
  const { id, source, tagIds } = value;
  if (!isGroupId(id) || !isOneOf(SOURCES, source)) return null;
  if (!Array.isArray(tagIds) || tagIds.length !== 2) return null;
  const [first, second] = tagIds as unknown[];
  if (!isUuid(first) || !isUuid(second) || first === second) return null;
  return { id, source, tagIds: [first, second] };
}

function readNearPair(value: unknown): [string, string] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [first, second] = value as unknown[];
  return isUuid(first) && isUuid(second) && first !== second ? [first, second] : null;
}

function list<T>(value: unknown, read: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const items: T[] = [];
  for (const entry of value) {
    const item = read(entry);
    if (item !== null) items.push(item);
  }
  return items;
}

/** Empty findings: what a malformed or missing `findings` value reads as. */
export function emptyFindings(): StoredCleanupFindings {
  return { duplicates: [], similarTags: [], pending: [], nearPairs: [] };
}

/**
 * Narrows `cleanup_reports.findings` (jsonb) to `StoredCleanupFindings`: anything malformed is
 * dropped item by item, never trusted (like `parseStoredQuery` for saved views).
 */
export function readStoredFindings(value: unknown): StoredCleanupFindings {
  if (!isRecord(value)) return emptyFindings();
  const pending = list<CleanupCheckKey>(value['pending'], (item) =>
    isOneOf(CHECK_KEYS, item) ? item : null,
  );
  return {
    duplicates: list(value['duplicates'], readGroup),
    similarTags: list(value['similarTags'], readPair),
    pending: [...new Set(pending)],
    nearPairs: list(value['nearPairs'], readNearPair),
  };
}

/** The findings as a JSON value for the `findings` column (ids, group ids and reasons only). */
export function toFindingsJson(findings: StoredCleanupFindings): Prisma.InputJsonObject {
  return {
    duplicates: findings.duplicates.map((group) => ({ ...group, linkIds: [...group.linkIds] })),
    similarTags: findings.similarTags.map((pair) => ({ ...pair, tagIds: [...pair.tagIds] })),
    pending: [...findings.pending],
    nearPairs: findings.nearPairs.map((pair) => [...pair]),
  };
}
