import {
  ASK_ACTIVITY,
  ASK_ACTIVITY_PHASE,
  ASK_DEPTH,
  ASK_ERROR_REASON,
  ASK_EVENT_TYPE,
  ASK_PERIOD,
  LINK_KIND,
  type AskAllowance,
  type AskEvent,
  type AskSearchFilter,
  type AskSource,
  type AskTurn,
  type AskTurnLink,
} from '@shelfmark/contracts';

type Fields = Record<string, unknown>;

function isObject(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isAllowance(value: unknown): value is AskAllowance {
  return (
    isObject(value) &&
    isCount(value['questionsLeft']) &&
    Object.values<unknown>(ASK_PERIOD).includes(value['period']) &&
    typeof value['resetsOn'] === 'string'
  );
}

function isSource(value: unknown): value is AskSource {
  if (!isObject(value) || !isCount(value['n']) || !isObject(value['link'])) {
    return false;
  }
  const link = value['link'];
  return (
    typeof link['id'] === 'string' &&
    typeof link['url'] === 'string' &&
    typeof link['title'] === 'string' &&
    Array.isArray(link['tags'])
  );
}

function isTurnLink(value: unknown): value is AskTurnLink {
  return isObject(value) && isCount(value['n']) && typeof value['id'] === 'string';
}

function isTurn(value: unknown): value is AskTurn {
  return (
    isObject(value) &&
    typeof value['question'] === 'string' &&
    typeof value['answer'] === 'string' &&
    Array.isArray(value['links']) &&
    value['links'].every(isTurnLink)
  );
}

function isSearchFilter(value: unknown): value is AskSearchFilter {
  if (!isObject(value)) {
    return false;
  }
  const { q, folderId, tags, kind, favorite } = value;
  return (
    (q === null || typeof q === 'string') &&
    (folderId === null || typeof folderId === 'string') &&
    Array.isArray(tags) &&
    tags.every((tag) => typeof tag === 'string') &&
    (kind === null || Object.values<unknown>(LINK_KIND).includes(kind)) &&
    typeof favorite === 'boolean'
  );
}

function oneOf<T extends string>(values: Record<string, T>, value: unknown): T | undefined {
  return Object.values(values).find((known) => known === value);
}

/**
 * Narrows one parsed `data:` payload of the Ask stream to an `AskEvent`, or `null` for anything
 * else (an unknown type or a missing field), which the reader then skips.
 */
export function toAskEvent(value: unknown): AskEvent | null {
  if (!isObject(value)) {
    return null;
  }
  switch (value['type']) {
    case ASK_EVENT_TYPE.Meta:
      return isAllowance(value['allowance'])
        ? { type: ASK_EVENT_TYPE.Meta, allowance: value['allowance'] }
        : null;
    case ASK_EVENT_TYPE.Activity: {
      const activity = oneOf(ASK_ACTIVITY, value['activity']);
      const phase = oneOf(ASK_ACTIVITY_PHASE, value['phase']);
      const found = value['found'];
      return activity !== undefined && phase !== undefined && (found === null || isCount(found))
        ? { type: ASK_EVENT_TYPE.Activity, activity, phase, found }
        : null;
    }
    case ASK_EVENT_TYPE.Links: {
      const { items, total, search } = value;
      return Array.isArray(items) &&
        items.every(isSource) &&
        (total === null || isCount(total)) &&
        (search === null || isSearchFilter(search))
        ? { type: ASK_EVENT_TYPE.Links, items, total, search }
        : null;
    }
    case ASK_EVENT_TYPE.Text:
      return typeof value['text'] === 'string'
        ? { type: ASK_EVENT_TYPE.Text, text: value['text'] }
        : null;
    case ASK_EVENT_TYPE.Cite:
      return isCount(value['n']) && value['n'] > 0
        ? { type: ASK_EVENT_TYPE.Cite, n: value['n'] }
        : null;
    case ASK_EVENT_TYPE.Done: {
      const sources = value['sources'];
      const depth = oneOf(ASK_DEPTH, value['depth']);
      return Array.isArray(sources) &&
        sources.every(isSource) &&
        typeof value['notFound'] === 'boolean' &&
        typeof value['truncated'] === 'boolean' &&
        isAllowance(value['allowance']) &&
        isTurn(value['turn']) &&
        depth !== undefined
        ? {
            type: ASK_EVENT_TYPE.Done,
            sources,
            notFound: value['notFound'],
            truncated: value['truncated'],
            allowance: value['allowance'],
            turn: value['turn'],
            depth,
          }
        : null;
    }
    case ASK_EVENT_TYPE.Error: {
      const reason = oneOf(ASK_ERROR_REASON, value['reason']);
      const allowance = value['allowance'];
      return reason !== undefined &&
        typeof value['counted'] === 'boolean' &&
        (allowance === null || isAllowance(allowance))
        ? { type: ASK_EVENT_TYPE.Error, reason, counted: value['counted'], allowance }
        : null;
    }
    default:
      return null;
  }
}
