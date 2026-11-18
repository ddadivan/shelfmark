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
};

describe('applyAskEvent', () => {
  it('appends text (merged) and citations, then completes with done', () => {
    let entry = applyAskEvent(ENTRY, { type: 'meta', allowance: ALLOWANCE, retrieved: 2 });
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
