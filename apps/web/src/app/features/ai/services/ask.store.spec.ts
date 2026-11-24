import { HttpErrorResponse } from '@angular/common/http';
import { signal, type EnvironmentProviders, type Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ASK_PERIOD, type AskEvent } from '@shelfmark/contracts';
import { Subject } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { AUTH_ROUTE } from '../../../core/auth/models/auth-routes.const';
import { aiSettingsResponse, fakeAiApi } from '../../../../testing/fake-ai-api';
import { AI_API } from '../models/ai-api.const';
import { AiSettingsStore } from './ai-settings.store';
import { AskHistoryChanges } from './ask-history-changes.service';
import { AskStore } from './ask.store';

const ALLOWANCE = { questionsLeft: 7, period: ASK_PERIOD.Day, resetsOn: '2026-11-19' };

async function setup(providers: (Provider | EnvironmentProviders)[] = []) {
  const api = fakeAiApi(aiSettingsResponse());
  const streams: Subject<AskEvent>[] = [];
  api.ask.mockImplementation(() => {
    const stream = new Subject<AskEvent>();
    streams.push(stream);
    return stream;
  });
  TestBed.configureTestingModule({
    providers: [{ provide: AI_API, useValue: api }, AskStore, ...providers],
  });
  const settings = TestBed.inject(AiSettingsStore);
  await settings.load();
  return { api, streams, settings, store: TestBed.inject(AskStore) };
}

describe('AskStore', () => {
  it('streams one question at a time and feeds the allowance to the settings', async () => {
    const { api, streams, settings, store } = await setup();
    expect(store.ask('  Which   ramen? ')).toBe(true);
    expect(api.ask).toHaveBeenCalledWith('Which ramen?', []);
    expect(store.streaming()).toBe(true);
    expect(store.ask('another one')).toBe(false);
    expect(store.ask('no')).toBe(false);

    streams[0]?.next({ type: 'meta', allowance: ALLOWANCE });
    expect(settings.askAllowance()).toEqual(ALLOWANCE);
    streams[0]?.next({ type: 'text', text: 'Hi ' });
    streams[0]?.next({ type: 'cite', n: 1 });
    streams[0]?.next({
      type: 'done',
      sources: [],
      notFound: false,
      truncated: false,
      allowance: ALLOWANCE,
      turn: { question: '', answer: '', links: [] },
      depth: 'quick',
      conversationId: null,
    });
    streams[0]?.complete();
    expect(store.streaming()).toBe(false);
    expect(store.entries()[0]).toMatchObject({
      state: 'done',
      segments: [{ text: 'Hi ' }, { cite: 1 }],
    });
  });

  it('sends the finished turns back with the next question, at most ten, and forgets them on reset', async () => {
    const { api, streams, store } = await setup();
    const finish = (index: number, question: string) => {
      streams[index]?.next({
        type: 'done',
        sources: [],
        notFound: false,
        truncated: false,
        allowance: ALLOWANCE,
        turn: { question, answer: `answer ${index}`, links: [] },
        depth: 'quick',
        conversationId: null,
      });
      streams[index]?.complete();
    };
    expect(store.answered()).toBe(false);
    store.ask('first question');
    finish(0, 'first question');
    expect(store.answered()).toBe(true);
    store.ask('a follow-up');
    expect(api.ask).toHaveBeenLastCalledWith('a follow-up', [
      { question: 'first question', answer: 'answer 0', links: [] },
    ]);
    // An error adds no turn.
    streams[1]?.next({ type: 'error', reason: 'unavailable', counted: false, allowance: null });
    streams[1]?.complete();
    for (let index = 2; index < 13; index += 1) {
      store.ask(`question ${index}`);
      finish(index, `question ${index}`);
    }
    expect(store.history()).toHaveLength(10);
    expect(store.history()[0]?.question).toBe('question 3');
    expect(store.historyTrimmed()).toBe(true);
    store.reset();
    expect(store.history()).toEqual([]);
    expect(store.answered()).toBe(false);
  });

  it('stops keeping what arrived, and the stream is unsubscribed', async () => {
    const { streams, store } = await setup();
    store.ask('ramen recipes');
    streams[0]?.next({ type: 'text', text: 'Partial' });
    store.stop();
    expect(streams[0]?.observed).toBe(false);
    expect(store.entries()[0]).toMatchObject({ state: 'done', truncated: true });
  });

  it('retries a failed question in place and resets the conversation', async () => {
    const { api, streams, store } = await setup();
    store.ask('ramen recipes');
    streams[0]?.next({
      type: 'error',
      reason: 'unavailable',
      counted: false,
      allowance: ALLOWANCE,
    });
    streams[0]?.complete();
    expect(store.entries()[0]?.state).toBe('error');
    const id = store.entries()[0]?.id ?? 0;
    store.retry(id);
    expect(api.ask).toHaveBeenCalledTimes(2);
    expect(store.entries()).toHaveLength(1);
    expect(store.entries()[0]?.state).toBe('streaming');
    store.retry(id);
    expect(api.ask).toHaveBeenCalledTimes(2);
    store.reset();
    expect(store.entries()).toEqual([]);
    expect(streams[1]?.observed).toBe(false);
  });

  it('ends a broken stream as an error and refreshes the settings on off', async () => {
    const { api, streams, store } = await setup();
    store.ask('ramen recipes');
    streams[0]?.error(new Error('network'));
    expect(store.entries()[0]).toMatchObject({ state: 'error', reason: 'unavailable' });
    store.ask('ramen again');
    streams[1]?.next({ type: 'error', reason: 'off', counted: false, allowance: null });
    expect(api.getSettings).toHaveBeenCalledTimes(2);
  });

  it('shows the rate-limit line for a 429 and ends the session for a 401', async () => {
    const auth = { user: signal({ id: 'u1' }), expireSession: vi.fn() };
    const { streams, store } = await setup([
      provideRouter([]),
      { provide: AuthStore, useValue: auth },
    ]);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store.ask('ramen recipes');
    streams[0]?.error(new HttpErrorResponse({ status: 429 }));
    expect(store.entries()[0]).toMatchObject({ state: 'error', reason: 'rate-limited' });
    expect(store.streaming()).toBe(false);
    expect(auth.expireSession).not.toHaveBeenCalled();
    store.ask('ramen again');
    streams[1]?.error(new HttpErrorResponse({ status: 401 }));
    expect(store.entries()[1]).toMatchObject({ state: 'error', reason: 'unavailable' });
    expect(auth.expireSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith([AUTH_ROUTE.SignIn], expect.anything());
  });

  describe('Ask history (ADR 0055 amendment)', () => {
    const ID = '0192f3a4-5b6c-7d8e-9f01-23456789abcd';
    const done = (conversationId: string | null): AskEvent => ({
      type: 'done',
      sources: [],
      notFound: false,
      truncated: false,
      allowance: ALLOWANCE,
      turn: { question: 'Which ramen?', answer: 'Two [1].', links: [{ n: 1, id: 'l1' }] },
      depth: 'quick',
      conversationId,
    });

    it('is unsaved while an answer streams and once a finished turn was not stored', async () => {
      const { streams, store } = await setup();
      expect(store.unsaved()).toBe(false);
      store.ask('Which ramen?');
      expect(store.unsaved()).toBe(true);
      streams[0]?.next(done(null));
      streams[0]?.complete();
      expect(store.entries()[0]?.persisted).toBe(false);
      expect(store.unsaved()).toBe(true);
      expect(store.conversationId()).toBeNull();
    });

    it('keeps the stored conversation id, sends it with the next question and tells the list', async () => {
      const { api, streams, store } = await setup();
      const changes = TestBed.inject(AskHistoryChanges);
      store.ask('Which ramen?');
      streams[0]?.next(done(ID));
      streams[0]?.complete();
      expect(store.conversationId()).toBe(ID);
      expect(store.unsaved()).toBe(false);
      expect(changes.version()).toBe(1);
      store.ask('the first one');
      expect(api.ask).toHaveBeenLastCalledWith('the first one', [store.entries()[0]?.turn], ID);
      store.reset();
      expect(store.conversationId()).toBeNull();
      expect(store.unsaved()).toBe(false);
    });

    it('opens a stored conversation as persisted, finished entries with its citations', async () => {
      const { store } = await setup();
      store.open({
        id: ID,
        title: 'Which ramen?',
        createdAt: '2026-11-24T10:00:00.000Z',
        updatedAt: '2026-11-24T10:00:00.000Z',
        turns: [
          {
            turn: { question: 'Which ramen?', answer: 'Two [1] and [2024].', links: [] },
            sources: [],
            cards: [],
            steps: [{ activity: 'search', found: 2 }],
            notFound: false,
            truncated: false,
            depth: 'quick',
            createdAt: '2026-11-24T10:00:00.000Z',
          },
        ],
      });
      expect(store.conversationId()).toBe(ID);
      expect(store.unsaved()).toBe(false);
      expect(store.answered()).toBe(true);
      expect(store.entries()[0]).toMatchObject({
        state: 'done',
        persisted: true,
        sourcesKnown: true,
        steps: [{ activity: 'search', found: 2 }],
        segments: [{ text: 'Two ' }, { cite: 1 }, { text: ' and [2024].' }],
      });
    });
  });
});
