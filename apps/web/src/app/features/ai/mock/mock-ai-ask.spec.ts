import { HttpErrorResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import {
  AI_TIER,
  ASK_PERIOD,
  type AskDoneEvent,
  type AskEvent,
  type AskTurn,
} from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockAiAsk } from './mock-ai-ask';
import { MockAskHistory } from './mock-ask-history';
import { MockAiData } from './mock-ai-data';
import { mockAskTopic } from './mock-ask-plan';
import { MOCK_ASK } from './models/mock-ask.const';

const NOW = Date.UTC(2026, 10, 18, 12);

function setup() {
  localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify({ isDemo: true }));
  const injector = Injector.create({
    providers: [MockLibraryData, MockAiData, MockAskHistory, MockAiAsk],
  });
  return { ask: injector.get(MockAiAsk), data: injector.get(MockAiData) };
}

/** Every event of the stream for `question` (the fake clock runs to the end). */
async function events(
  ask: MockAiAsk,
  question: string,
  ms = 5_000,
  history: AskTurn[] = [],
): Promise<AskEvent[]> {
  const seen: AskEvent[] = [];
  let failure: unknown = null;
  ask
    .ask(question, history)
    .subscribe({ next: (e) => seen.push(e), error: (e: unknown) => (failure = e) });
  await vi.advanceTimersByTimeAsync(ms);
  if (failure) {
    throw failure;
  }
  return seen;
}

function text(seen: AskEvent[]): string {
  return seen
    .map((e) => (e.type === 'text' ? e.text : e.type === 'cite' ? `[${e.n}]` : ''))
    .join('');
}

const done = (seen: AskEvent[]) => seen.at(-1) as AskDoneEvent;

describe('MockAiAsk (chat, ADR 0055 point 10)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('reads the topic word of a question', () => {
    expect(mockAskTopic('find the signals article i saved')).toBe('signal');
    expect(mockAskTopic('how many links do i have?')).toBe('');
  });

  it('streams a canned ramen answer after the search activity, with the turn, counted once', async () => {
    const { ask, data } = setup();
    const seen = await events(ask, 'What did I save about ramen?');
    expect(seen[0]).toMatchObject({ type: 'meta', allowance: { questionsLeft: 4 } });
    expect(seen[1]).toEqual({ type: 'activity', activity: 'search', phase: 'start', found: null });
    expect(seen[2]).toMatchObject({ type: 'activity', activity: 'search', phase: 'end' });
    expect(text(seen)).toMatch(/^You saved a few ramen recipes\. .+ \[1\] .+ \[2\]/u);
    expect(done(seen)).toMatchObject({
      type: 'done',
      notFound: false,
      truncated: false,
      depth: 'quick',
    });
    expect(done(seen).sources.every((s) => /ramen/iu.test(s.link.title))).toBe(true);
    expect(done(seen).turn.answer).toBe(text(seen));
    expect(done(seen).turn.links.map((l) => l.n)).toEqual(done(seen).sources.map((s) => s.n));
    expect(data.askAllowance()).toMatchObject({ questionsLeft: 4, period: ASK_PERIOD.Month });
  });

  it('counts with the count activity', async () => {
    const { ask } = setup();
    const seen = await events(ask, 'How many links do I have?');
    expect(seen).toContainEqual(
      expect.objectContaining({ type: 'activity', activity: 'count', phase: 'start' }),
    );
    expect(text(seen)).toMatch(/^You have \d+ links\.$/u);
  });

  it('shows cards for a find, then follows up with "the first one" and "what else"', async () => {
    const { ask } = setup();
    const found = await events(ask, 'find ramen');
    const cards = found.find((e) => e.type === 'links');
    expect(cards?.type === 'links' && cards.items.length).toBeGreaterThan(0);
    expect(text(found)).toMatch(/^I found \d+ links? about ramen\. $/u);
    const turn = done(found).turn;
    const first = await events(ask, 'open the first one', 5_000, [turn]);
    expect(first).toContainEqual(expect.objectContaining({ type: 'activity', activity: 'read' }));
    expect(done(first).sources[0]?.link.id).toBe(turn.links[0]?.id);
    const more = await events(ask, 'what else?', 5_000, [turn]);
    expect(done(more).sources.map((s) => s.link.id)).not.toContain(turn.links[0]?.id);
  });

  it('offers "show all" when more links match than the cards', async () => {
    const { ask } = setup();
    const seen = await events(ask, 'show my links about angular');
    const cards = seen.find((e) => e.type === 'links');
    if (cards?.type === 'links' && cards.total !== null) {
      expect(cards.total).toBeGreaterThan(cards.items.length);
      expect(cards.search).toMatchObject({ q: 'angular' });
    }
  });

  it('hands comparisons to the deep profile', async () => {
    const { ask } = setup();
    const seen = await events(ask, 'compare my coats');
    expect(seen).toContainEqual(
      expect.objectContaining({ type: 'activity', activity: 'deep', phase: 'start' }),
    );
    expect(text(seen)).toContain('Looking closer');
    expect(done(seen).depth).toBe('deep');
  });

  it('says not found for sourdough after a search, counted', async () => {
    const { ask, data } = setup();
    const seen = await events(ask, 'What did I save about sourdough?');
    expect(done(seen)).toMatchObject({ notFound: true, sources: [] });
    expect(data.askAllowance().questionsLeft).toBe(4);
  });

  it('fails and refunds for ai-fail, ai-refuse and ai-slow (the pill stays until the deadline)', async () => {
    const { ask, data } = setup();
    expect((await events(ask, 'ramen ai-fail')).map((e) => e.type)).toEqual(['meta', 'error']);
    const refused = await events(ask, 'ramen ai-refuse');
    expect(refused.at(-1)).toMatchObject({ reason: 'rejected', counted: false });
    const slow = await events(ask, 'ramen ai-slow', MOCK_ASK.RoundFirstOutputMs + 1_000);
    expect(slow.map((e) => e.type)).toEqual(['meta', 'activity', 'error']);
    expect(slow.at(-1)).toMatchObject({ reason: 'unavailable', allowance: { questionsLeft: 5 } });
    expect(data.askAllowance().questionsLeft).toBe(5);
  });

  it('cuts after two words, truncated and counted', async () => {
    const { ask, data } = setup();
    const seen = await events(ask, 'ramen ai-cut');
    expect(text(seen)).toBe('You saved ');
    expect(done(seen)).toMatchObject({ type: 'done', truncated: true });
    expect(data.askAllowance().questionsLeft).toBe(4);
  });

  it('searches every round before the forced answer for ai-loop', async () => {
    const { ask } = setup();
    const seen = await events(ask, 'ramen ai-loop', 10_000);
    expect(seen.filter((e) => e.type === 'activity' && e.phase === 'start')).toHaveLength(4);
    expect(done(seen).type).toBe('done');
  });

  it('answers quota for ai-quota and when the allowance is used up', async () => {
    const { ask, data } = setup();
    expect(await events(ask, 'ramen ai-quota')).toEqual([
      expect.objectContaining({
        type: 'error',
        reason: 'quota',
        allowance: expect.objectContaining({ questionsLeft: 0 }),
      }),
    ]);
    data.account = { ...data.account, askDayUsed: 5, askMonthUsed: 5 };
    expect((await events(ask, 'ramen recipes'))[0]).toMatchObject({
      type: 'error',
      reason: 'quota',
    });
    data.account = { ...data.account, tier: AI_TIER.AiPack, askDayUsed: 50, askMonthUsed: 50 };
    expect((await events(ask, 'ramen recipes'))[0]).toMatchObject({
      reason: 'quota',
      allowance: { period: ASK_PERIOD.Day, resetsOn: '2026-11-19' },
    });
  });

  it('answers off while AI or Ask is off', async () => {
    const { ask, data } = setup();
    data.account = { ...data.account, settings: { ...data.account.settings, ask: false } };
    expect(await events(ask, 'ramen')).toEqual([
      { type: 'error', reason: 'off', counted: false, allowance: null },
    ]);
  });

  it('answers busy while a question is in flight; a Stop before text refunds it', async () => {
    const { ask, data } = setup();
    const first = ask.ask('What did I save about ramen?').subscribe();
    await vi.advanceTimersByTimeAsync(1);
    const busy = await events(ask, 'ramen recipes', MOCK_ASK.MetaMs + 1);
    expect(busy[0]).toMatchObject({ type: 'error', reason: 'busy' });
    first.unsubscribe();
    expect(data.askAllowance().questionsLeft).toBe(5);
  });

  it('keeps the count when Stop comes after text', async () => {
    const { ask, data } = setup();
    const sub = ask.ask('What did I save about ramen?').subscribe();
    await vi.advanceTimersByTimeAsync(MOCK_ASK.MetaMs + MOCK_ASK.ToolMs + MOCK_ASK.ChunkMs * 3);
    sub.unsubscribe();
    expect(data.askAllowance().questionsLeft).toBe(4);
  });

  it('refuses an invalid question or history like the DTO (400)', async () => {
    const { ask } = setup();
    await expect(events(ask, ' a ')).rejects.toBeInstanceOf(HttpErrorResponse);
    await expect(events(ask, 'x'.repeat(501))).rejects.toMatchObject({ status: 400 });
    const turn = { question: 'q', answer: 'a', links: [] };
    await expect(
      events(
        ask,
        'ramen',
        5_000,
        Array.from({ length: 11 }, () => turn),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
