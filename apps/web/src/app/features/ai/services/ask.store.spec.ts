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
    expect(api.ask).toHaveBeenCalledWith('Which ramen?');
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
    });
    streams[0]?.complete();
    expect(store.streaming()).toBe(false);
    expect(store.entries()[0]).toMatchObject({
      state: 'done',
      segments: [{ text: 'Hi ' }, { cite: 1 }],
    });
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
});
