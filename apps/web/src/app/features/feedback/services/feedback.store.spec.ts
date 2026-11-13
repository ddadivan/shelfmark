import { TestBed } from '@angular/core/testing';
import type { FeedbackMessage } from '@shelfmark/contracts';
import { feedbackMessage } from '../../../../testing/feedback-message';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { FeedbackSendError } from '../utils/feedback-send-error';
import { FeedbackStore } from './feedback.store';
import { FEEDBACK_API } from '../models/feedback-api.const';
import type { FeedbackApi } from '../models/feedback-api.interface';
import { FEEDBACK_LOAD_STATE } from '../models/feedback-load-state.const';
import { FEEDBACK_SEND_ERROR_REASON } from '../models/feedback-send-error-reason.const';

function setup(overrides: Partial<FeedbackApi> = {}) {
  const api = {
    list: vi.fn(() => Promise.resolve([feedbackMessage({ id: 'old' })])),
    send: vi.fn(() => Promise.resolve(feedbackMessage({ id: 'new' }))),
    attachScreenshot: vi.fn((id: string) =>
      Promise.resolve(feedbackMessage({ id, screenshotUrls: [`/s/${id}`] })),
    ),
    ...overrides,
  } satisfies FeedbackApi;
  TestBed.configureTestingModule({ providers: [{ provide: FEEDBACK_API, useValue: api }] });
  return { api, store: TestBed.inject(FeedbackStore), scope: TestBed.inject(SessionScope) };
}

describe('FeedbackStore', () => {
  it('starts idle and empty is false until loaded', () => {
    const { store } = setup();

    expect(store.phase()).toBe(FEEDBACK_LOAD_STATE.Idle);
    expect(store.empty()).toBe(false);
  });

  it('loads the list', async () => {
    const { store } = setup();

    const pending = store.load();
    expect(store.phase()).toBe(FEEDBACK_LOAD_STATE.Loading);
    await pending;

    expect(store.phase()).toBe(FEEDBACK_LOAD_STATE.Loaded);
    expect(store.items().map((item) => item.id)).toEqual(['old']);
  });

  it('is empty when loaded without messages', async () => {
    const { store } = setup({ list: vi.fn(() => Promise.resolve([])) });

    await store.load();

    expect(store.empty()).toBe(true);
  });

  it('shares a load that is already running', async () => {
    const { api, store } = setup();

    await Promise.all([store.load(), store.load()]);

    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('fails softly and loads again on retry', async () => {
    const list = vi
      .fn<FeedbackApi['list']>()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce([feedbackMessage()]);
    const { store } = setup({ list });

    await store.load();
    expect(store.phase()).toBe(FEEDBACK_LOAD_STATE.Failed);

    await store.load();
    expect(store.phase()).toBe(FEEDBACK_LOAD_STATE.Loaded);
    expect(store.items()).toHaveLength(1);
  });

  it('puts a sent message on top without another request', async () => {
    const { api, store } = setup();
    await store.load();

    const sent = await store.send({ kind: 'idea', text: 'hello' });

    expect(api.send).toHaveBeenCalledWith({ kind: 'idea', text: 'hello' });
    expect(sent).toEqual({ message: feedbackMessage({ id: 'new' }), screenshotsFailed: 0 });
    expect(api.attachScreenshot).not.toHaveBeenCalled();
    expect(store.items().map((item) => item.id)).toEqual(['new', 'old']);
    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('attaches the screenshots one by one after the message, in order', async () => {
    const { api, store } = setup();
    const shots = [
      { type: 'image/png' as const, data: 'AAAA' },
      { type: 'image/jpeg' as const, data: 'BBBB' },
    ];

    const sent = await store.send({ kind: 'idea', text: 'hello' }, shots);

    expect(api.attachScreenshot).toHaveBeenCalledTimes(2);
    expect(api.attachScreenshot).toHaveBeenNthCalledWith(1, 'new', shots[0]);
    expect(api.attachScreenshot).toHaveBeenNthCalledWith(2, 'new', shots[1]);
    expect(sent.screenshotsFailed).toBe(0);
    expect(store.items()[0]?.screenshotUrls).toEqual(['/s/new']);
  });

  it('keeps the sent message and counts the screenshots that failed', async () => {
    const attachScreenshot = vi
      .fn<FeedbackApi['attachScreenshot']>()
      .mockRejectedValueOnce(new Error('400'))
      .mockResolvedValueOnce(feedbackMessage({ id: 'new', screenshotUrls: ['/s/0'] }));
    const { store } = setup({ attachScreenshot });

    const sent = await store.send({ kind: 'idea', text: 'hello' }, [
      { type: 'image/png', data: 'AAAA' },
      { type: 'image/png', data: 'BBBB' },
    ]);

    expect(sent.screenshotsFailed).toBe(1);
    expect(sent.message.screenshotUrls).toEqual(['/s/0']);
    expect(store.items()[0]?.id).toBe('new');
  });

  it('passes a send failure on and leaves the list alone', async () => {
    const failure = new FeedbackSendError(FEEDBACK_SEND_ERROR_REASON.RateLimited);
    const { store } = setup({ send: vi.fn(() => Promise.reject(failure)) });
    await store.load();

    await expect(store.send({ kind: 'idea', text: 'x' })).rejects.toBe(failure);

    expect(store.items().map((item) => item.id)).toEqual(['old']);
  });

  it('forgets everything when the session ends, and drops a late answer', async () => {
    let resolve: (items: FeedbackMessage[]) => void = () => undefined;
    const { store, scope } = setup({
      list: vi.fn(() => new Promise<FeedbackMessage[]>((res) => (resolve = res))),
    });

    const pending = store.load();
    scope.end();
    resolve([feedbackMessage()]);
    await pending;

    expect(store.items()).toEqual([]);
    expect(store.phase()).toBe(FEEDBACK_LOAD_STATE.Idle);
  });
});
