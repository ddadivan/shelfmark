import { HttpErrorResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import { AI_TIER, ASK_PERIOD, type AskEvent } from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockAiAsk } from './mock-ai-ask';
import { MockAiData } from './mock-ai-data';
import { MOCK_ASK } from './models/mock-ask.const';

const NOW = Date.UTC(2026, 10, 18, 12);

function setup() {
  localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify({ isDemo: true }));
  const injector = Injector.create({ providers: [MockLibraryData, MockAiData, MockAiAsk] });
  return { ask: injector.get(MockAiAsk), data: injector.get(MockAiData) };
}

/** Every event of the stream for `question` (the fake clock runs to the end). */
async function events(ask: MockAiAsk, question: string, ms = 5_000): Promise<AskEvent[]> {
  const seen: AskEvent[] = [];
  let failure: unknown = null;
  ask.ask(question).subscribe({ next: (e) => seen.push(e), error: (e: unknown) => (failure = e) });
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

describe('MockAiAsk', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('streams a canned ramen answer citing the seed recipes, counted once', async () => {
    const { ask, data } = setup();
    const seen = await events(ask, 'Which ramen recipes did I save?');
    expect(seen[0]).toMatchObject({ type: 'meta', allowance: { questionsLeft: 4 } });
    expect(text(seen)).toMatch(/^You saved a few ramen recipes\. .+ \[1\] .+ \[2\] .+ \[3\]$/u);
    const done = seen.at(-1);
    expect(done).toMatchObject({ type: 'done', notFound: false, truncated: false });
    expect(done?.type === 'done' && done.sources.map((s) => [s.n, s.link.title])).toEqual([
      [1, expect.stringMatching(/ramen/iu)],
      [2, expect.stringMatching(/ramen/iu)],
      [3, expect.stringMatching(/ramen/iu)],
    ]);
    expect(data.askAllowance()).toMatchObject({ questionsLeft: 4, period: ASK_PERIOD.Month });
  });

  it('answers the coats and Angular signals questions from the seed', async () => {
    const { ask } = setup();
    const coats = await events(ask, 'Which coats was I comparing?');
    expect(text(coats)).toContain('You were comparing two coats.');
    expect(text(coats)).toMatch(/\[1\].+\[2\]/u);
    const signals = await events(ask, 'What do I have on Angular signals?');
    expect(text(signals)).toContain('Your Angular links cover signals.');
  });

  it('finds nothing without a model call or a count', async () => {
    const { ask, data } = setup();
    expect(await events(ask, 'zzzqqq xyzzy')).toEqual([
      expect.objectContaining({ type: 'done', notFound: true, sources: [] }),
    ]);
    expect(data.askAllowance().questionsLeft).toBe(5);
  });

  it('says not found for sourdough after the model answered without citations', async () => {
    const { ask, data } = setup();
    const seen = await events(ask, 'What did I save about sourdough?');
    expect(seen[0]?.type).toBe('meta');
    expect(seen.at(-1)).toMatchObject({ type: 'done', notFound: true, sources: [] });
    expect(data.askAllowance().questionsLeft).toBe(4);
  });

  it('fails and refunds for ai-fail, ai-refuse and ai-slow', async () => {
    const { ask, data } = setup();
    expect((await events(ask, 'ramen ai-fail')).map((e) => e.type)).toEqual(['meta', 'error']);
    const refused = await events(ask, 'ramen ai-refuse');
    expect(refused.at(-1)).toMatchObject({ reason: 'rejected', counted: false });
    const slow = await events(ask, 'ramen ai-slow', MOCK_ASK.FirstTokenMs + 1_000);
    expect(slow.at(-1)).toMatchObject({ reason: 'unavailable', allowance: { questionsLeft: 5 } });
    expect(data.askAllowance().questionsLeft).toBe(5);
  });

  it('cuts after two words, truncated and counted', async () => {
    const { ask, data } = setup();
    const seen = await events(ask, 'ramen ai-cut');
    expect(text(seen)).toBe('You saved ');
    expect(seen.at(-1)).toMatchObject({ type: 'done', truncated: true, notFound: true });
    expect(data.askAllowance().questionsLeft).toBe(4);
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
    const first = ask.ask('Which ramen recipes did I save?').subscribe();
    await vi.advanceTimersByTimeAsync(1);
    const busy = await events(ask, 'ramen recipes', MOCK_ASK.MetaMs + 1);
    expect(busy[0]).toMatchObject({ type: 'error', reason: 'busy' });
    first.unsubscribe();
    expect(data.askAllowance().questionsLeft).toBe(5);
  });

  it('keeps the count when Stop comes after text', async () => {
    const { ask, data } = setup();
    const sub = ask.ask('Which ramen recipes did I save?').subscribe();
    await vi.advanceTimersByTimeAsync(MOCK_ASK.MetaMs + MOCK_ASK.ChunkMs * 3);
    sub.unsubscribe();
    expect(data.askAllowance().questionsLeft).toBe(4);
  });

  it('refuses an invalid question like the DTO (400)', async () => {
    const { ask } = setup();
    await expect(events(ask, ' a ')).rejects.toBeInstanceOf(HttpErrorResponse);
    await expect(events(ask, 'x'.repeat(501))).rejects.toMatchObject({ status: 400 });
  });
});
