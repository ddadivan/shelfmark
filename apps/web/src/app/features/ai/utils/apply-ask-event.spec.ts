import { ASK_PERIOD } from '@shelfmark/contracts';
import type { AskEntry } from '../models/ask-entry.interface';
import { ASK_ENTRY_STATE } from '../models/ask-entry-state.const';
import { applyAskEvent, endAskEntry, stopAskEntry } from './apply-ask-event';

const ALLOWANCE = { questionsLeft: 0, period: ASK_PERIOD.Day, resetsOn: '2026-11-19' };
const ENTRY: AskEntry = {
  id: 1,
  question: 'ramen?',
  state: ASK_ENTRY_STATE.Streaming,
  segments: [],
  sources: [],
  sourcesKnown: false,
  notFound: false,
  truncated: false,
  reason: null,
  allowance: null,
  activity: null,
  steps: [],
  cards: [],
  turn: null,
};

describe('applyAskEvent', () => {
  it('appends text (merged) and citations, then completes with done', () => {
    let entry = applyAskEvent(ENTRY, { type: 'meta', allowance: ALLOWANCE });
    expect(entry).toBe(ENTRY);
    entry = applyAskEvent(entry, { type: 'text', text: 'You ' });
    entry = applyAskEvent(entry, { type: 'text', text: 'saved ' });
    entry = applyAskEvent(entry, { type: 'cite', n: 1 });
    entry = applyAskEvent(entry, { type: 'text', text: '.' });
    expect(entry.segments).toEqual([{ text: 'You saved ' }, { cite: 1 }, { text: '.' }]);
    entry = applyAskEvent(entry, {
      type: 'done',
      sources: [],
      notFound: true,
      truncated: true,
      allowance: ALLOWANCE,
      turn: { question: '', answer: '', links: [] },
      depth: 'quick',
    });
    expect(entry).toMatchObject({ state: 'done', notFound: true, truncated: true });
  });

  it('turns quota into the limit state and other errors into error', () => {
    expect(
      applyAskEvent(ENTRY, {
        type: 'error',
        reason: 'quota',
        counted: false,
        allowance: ALLOWANCE,
      }),
    ).toMatchObject({ state: 'limit', reason: 'quota', allowance: ALLOWANCE });
    expect(
      applyAskEvent(ENTRY, {
        type: 'error',
        reason: 'unavailable',
        counted: false,
        allowance: null,
      }),
    ).toMatchObject({ state: 'error', reason: 'unavailable' });
  });
});

describe('endAskEntry and stopAskEntry', () => {
  it('keeps what arrived as a cut answer, else fails or reads as stopped', () => {
    const texted = { ...ENTRY, segments: [{ text: 'Hi' }] };
    expect(endAskEntry(texted)).toMatchObject({ state: 'done', truncated: true });
    expect(endAskEntry(ENTRY)).toMatchObject({ state: 'error', reason: 'unavailable' });
    expect(stopAskEntry(ENTRY)).toMatchObject({ state: 'done', truncated: true, segments: [] });
    const done = { ...ENTRY, state: ASK_ENTRY_STATE.Done };
    expect(endAskEntry(done)).toBe(done);
    expect(stopAskEntry(done)).toBe(done);
  });
});

describe('applyAskEvent for the chat events (ADR 0055)', () => {
  const link = { id: 'l1', title: 'Signals' } as never;
  it('shows the status on an activity start, adds a step on its end and hides it on text or cards', () => {
    let entry = applyAskEvent(ENTRY, {
      type: 'activity',
      activity: 'search',
      phase: 'start',
      found: null,
    });
    expect(entry.activity).toEqual({ activity: 'search' });
    entry = applyAskEvent(entry, { type: 'activity', activity: 'search', phase: 'end', found: 3 });
    expect(entry.activity).toBeNull();
    expect(entry.steps).toEqual([{ activity: 'search', found: 3 }]);
    entry = applyAskEvent(entry, {
      type: 'activity',
      activity: 'count',
      phase: 'start',
      found: null,
    });
    entry = applyAskEvent(entry, { type: 'text', text: 'You have 3.' });
    expect(entry.activity).toBeNull();
  });

  it('keeps cards in stream order and the turn from done', () => {
    let entry = applyAskEvent(ENTRY, {
      type: 'links',
      items: [{ n: 1, link }],
      total: 14,
      search: { q: 'signals', folderId: null, tags: [], kind: null, favorite: false },
    });
    expect(entry.cards).toEqual([
      {
        items: [{ n: 1, link }],
        total: 14,
        search: { q: 'signals', folderId: null, tags: [], kind: null, favorite: false },
      },
    ]);
    const turn = { question: 'ramen?', answer: 'x [1]', links: [{ n: 1, id: 'l1' }] };
    entry = applyAskEvent(entry, {
      type: 'done',
      sources: [{ n: 1, link }],
      notFound: false,
      truncated: false,
      allowance: ALLOWANCE,
      turn,
      depth: 'quick',
    });
    expect(entry.turn).toEqual(turn);
    expect(endAskEntry({ ...ENTRY, cards: entry.cards }).state).toBe(ASK_ENTRY_STATE.Done);
  });
});
