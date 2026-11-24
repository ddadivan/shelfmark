import {
  ASK_ACTIVITY,
  ASK_DEPTH,
  ASK_LIMIT,
  LINK_KIND,
  type AskActivity,
  type AskConversationStep,
  type AskDepth,
  type AskSearchFilter,
  type LinkKind,
} from '@shelfmark/contracts';
import type { AskStoredCards } from '../models/ask-stored-cards.interface';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVITIES: readonly string[] = Object.values(ASK_ACTIVITY);
const DEPTHS: readonly string[] = Object.values(ASK_DEPTH);
const KINDS: readonly string[] = Object.values(LINK_KIND);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isMarker = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= ASK_LIMIT.LinkMarkerMax;
const isActivity = (value: unknown): value is AskActivity =>
  typeof value === 'string' && ACTIVITIES.includes(value);
const isKind = (value: unknown): value is LinkKind =>
  typeof value === 'string' && KINDS.includes(value);

/** `ask_conversation_turns.steps` (jsonb): malformed entries are dropped one by one. */
export function readStoredSteps(value: unknown): AskConversationStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    if (!isRecord(entry) || !isActivity(entry['activity'])) return [];
    const found = entry['found'];
    return [{ activity: entry['activity'], found: isCount(found) ? found : null }];
  });
}

function readSearch(value: unknown): AskSearchFilter | null {
  if (!isRecord(value)) return null;
  const { q, folderId, tags, kind, favorite } = value;
  if (q !== null && typeof q !== 'string') return null;
  if (folderId !== null && !(typeof folderId === 'string' && UUID.test(folderId))) return null;
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) return null;
  if (kind !== null && !isKind(kind)) return null;
  if (typeof favorite !== 'boolean') return null;
  return { q, folderId, tags: tags.filter((tag) => typeof tag === 'string'), kind, favorite };
}

/** `ask_conversation_turns.cards` (jsonb): malformed groups and markers are dropped. */
export function readStoredCards(value: unknown): AskStoredCards[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    if (!isRecord(entry) || !Array.isArray(entry['n'])) return [];
    const total = entry['total'];
    return [
      {
        n: entry['n'].filter(isMarker),
        total: isCount(total) ? total : null,
        search: readSearch(entry['search']),
      },
    ];
  });
}

/** `ask_conversation_turns.depth`: an unknown value reads as the quick profile. */
export function readStoredDepth(value: string): AskDepth {
  return DEPTHS.includes(value) ? (value as AskDepth) : ASK_DEPTH.Quick;
}
