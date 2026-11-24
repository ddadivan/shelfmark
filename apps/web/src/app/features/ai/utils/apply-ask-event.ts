import {
  ASK_ACTIVITY_PHASE,
  ASK_ERROR_REASON,
  ASK_EVENT_TYPE,
  type AskEvent,
} from '@shelfmark/contracts';
import type { StreamingSegment } from '@shelfmark/ui';
import type { AskEntry } from '../models/ask-entry.interface';
import { ASK_CLIENT_REASON } from '../models/ask-client-reason.const';
import { ASK_ENTRY_STATE } from '../models/ask-entry-state.const';

function appendText(segments: readonly StreamingSegment[], text: string): StreamingSegment[] {
  const last = segments.at(-1);
  return last && 'text' in last
    ? [...segments.slice(0, -1), { text: last.text + text }]
    : [...segments, { text }];
}

/**
 * An entry after one stream event (`meta` changes nothing here; the store reads its allowance): an
 * activity start shows the status line; its end adds a finished step; text, cards or the last event
 * hide the status line.
 */
export function applyAskEvent(entry: AskEntry, event: AskEvent): AskEntry {
  switch (event.type) {
    case ASK_EVENT_TYPE.Activity:
      return event.phase === ASK_ACTIVITY_PHASE.Start
        ? { ...entry, activity: { activity: event.activity } }
        : {
            ...entry,
            activity: null,
            steps: [...entry.steps, { activity: event.activity, found: event.found }],
          };
    case ASK_EVENT_TYPE.Text:
      return { ...entry, activity: null, segments: appendText(entry.segments, event.text) };
    case ASK_EVENT_TYPE.Cite:
      return { ...entry, segments: [...entry.segments, { cite: event.n }] };
    case ASK_EVENT_TYPE.Links:
      return {
        ...entry,
        activity: null,
        cards: [...entry.cards, { items: event.items, total: event.total, search: event.search }],
      };
    case ASK_EVENT_TYPE.Done:
      return {
        ...entry,
        state: ASK_ENTRY_STATE.Done,
        activity: null,
        turn: event.turn,
        sources: event.sources,
        sourcesKnown: true,
        notFound: event.notFound,
        truncated: event.truncated,
      };
    case ASK_EVENT_TYPE.Error:
      return {
        ...entry,
        activity: null,
        state:
          event.reason === ASK_ERROR_REASON.Quota ? ASK_ENTRY_STATE.Limit : ASK_ENTRY_STATE.Error,
        reason: event.reason,
        allowance: event.allowance,
      };
    default:
      return entry;
  }
}

/**
 * The stream stopped without a last event (Stop, a broken connection): what arrived stays as a cut
 * answer; with nothing yet it is a failure the user can try again (not counted).
 */
export function endAskEntry(entry: AskEntry): AskEntry {
  if (entry.state !== ASK_ENTRY_STATE.Streaming) {
    return entry;
  }
  return entry.segments.length > 0 || entry.cards.length > 0
    ? { ...entry, state: ASK_ENTRY_STATE.Done, truncated: true, activity: null }
    : {
        ...entry,
        state: ASK_ENTRY_STATE.Error,
        reason: ASK_ERROR_REASON.Unavailable,
        activity: null,
      };
}

/** The request was refused with 429 before the answer started: not counted, "Try again" is offered. */
export function rateLimitAskEntry(entry: AskEntry): AskEntry {
  return entry.state === ASK_ENTRY_STATE.Streaming
    ? {
        ...entry,
        state: ASK_ENTRY_STATE.Error,
        reason: ASK_CLIENT_REASON.RateLimited,
        activity: null,
      }
    : entry;
}

/** Stop keeps what arrived (spec: "Stop keeps what came"); nothing yet reads as stopped. */
export function stopAskEntry(entry: AskEntry): AskEntry {
  return entry.state === ASK_ENTRY_STATE.Streaming
    ? { ...entry, state: ASK_ENTRY_STATE.Done, truncated: true, activity: null }
    : entry;
}
