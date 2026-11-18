import {
  ASK_ERROR_REASON,
  ASK_EVENT_TYPE,
  ASK_PERIOD,
  type AskAllowance,
  type AskEvent,
  type AskSource,
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
      return isAllowance(value['allowance']) && isCount(value['retrieved'])
        ? {
            type: ASK_EVENT_TYPE.Meta,
            allowance: value['allowance'],
            retrieved: value['retrieved'],
          }
        : null;
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
      return Array.isArray(sources) &&
        sources.every(isSource) &&
        typeof value['notFound'] === 'boolean' &&
        typeof value['truncated'] === 'boolean' &&
        isAllowance(value['allowance'])
        ? {
            type: ASK_EVENT_TYPE.Done,
            sources,
            notFound: value['notFound'],
            truncated: value['truncated'],
            allowance: value['allowance'],
          }
        : null;
    }
    case ASK_EVENT_TYPE.Error: {
      const reason = Object.values(ASK_ERROR_REASON).find((known) => known === value['reason']);
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
