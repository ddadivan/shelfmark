import { TestBed } from '@angular/core/testing';
import { FEEDBACK_MESSAGE_LIMIT, FEEDBACK_STATUS } from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MockAdminApi } from '../../admin/mock/mock-admin.api';
import { FeedbackSendError } from '../feedback-send-error';
import { FEEDBACK_SEND_ERROR_REASON } from '../models/feedback-send-error-reason.const';
import { MockFeedbackApi } from './mock-feedback.api';
import { MOCK_ADMIN_MODE } from './models/mock-admin-mode.const';
import { MOCK_ADMIN_STORAGE_KEY } from './models/mock-admin-storage-key.const';
import { MOCK_FEEDBACK_MESSAGES_STORAGE_KEY } from './models/mock-feedback-messages-storage-key.const';
import { MOCK_FEEDBACK_SCENARIO } from './models/mock-feedback-scenario.const';
import { MOCK_FEEDBACK_SCENARIO_STORAGE_KEY } from './models/mock-feedback-scenario-storage-key.const';

function signIn(id: string, extra: Record<string, unknown> = {}): void {
  localStorage.setItem(
    MOCK_SESSION_STORAGE_KEY,
    JSON.stringify({ id, name: `User ${id}`, email: `${id}@example.com`, ...extra }),
  );
}

describe('MockFeedbackApi and MockAdminApi', () => {
  beforeEach(() => {
    localStorage.clear();
    signIn('u1');
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('sends a message as received with no reply and lists it for its owner only', async () => {
    const api = TestBed.inject(MockFeedbackApi);

    const sent = await api.send({ kind: 'idea', text: '  Sort by last opened  ' });

    expect(sent).toMatchObject({
      kind: 'idea',
      text: 'Sort by last opened',
      status: FEEDBACK_STATUS.Received,
      reply: null,
      screenshotUrl: null,
    });
    expect(sent).not.toHaveProperty('user');
    expect(await api.list()).toEqual([sent]);

    signIn('u2');
    expect(await api.list()).toEqual([]);
  });

  it('lists newest first', async () => {
    const api = TestBed.inject(MockFeedbackApi);

    const first = await api.send({ kind: 'idea', text: 'one' });
    const second = await api.send({ kind: 'other', text: 'two' });

    expect((await api.list()).map((message) => message.id)).toEqual([second.id, first.id]);
  });

  it('gives a message with a screenshot a screenshot URL', async () => {
    const api = TestBed.inject(MockFeedbackApi);

    const sent = await api.send({
      kind: 'problem',
      text: 'Broken',
      screenshot: { type: 'image/png', data: 'aGVsbG8=' },
    });

    expect(sent.screenshotUrl).toContain(sent.id);
  });

  it.each([
    ['blank text', { kind: 'idea' as const, text: '   ' }],
    [
      'text over 2000 characters',
      { kind: 'idea' as const, text: 'x'.repeat(FEEDBACK_MESSAGE_LIMIT.TextMax + 1) },
    ],
    [
      'a screenshot of the wrong type',
      {
        kind: 'idea' as const,
        text: 'ok',
        // @ts-expect-error The contract type excludes GIF; the mock must refuse it anyway.
        screenshot: { type: 'image/gif', data: 'aGVsbG8=' },
      },
    ],
  ])('refuses %s', async (_name, request) => {
    const api = TestBed.inject(MockFeedbackApi);

    await expect(api.send(request)).rejects.toBeInstanceOf(FeedbackSendError);
    expect(await api.list()).toEqual([]);
  });

  it('answers 429 or 500 for the scenarios of sm-mock-feedback-scenario', async () => {
    const api = TestBed.inject(MockFeedbackApi);

    localStorage.setItem(MOCK_FEEDBACK_SCENARIO_STORAGE_KEY, MOCK_FEEDBACK_SCENARIO.RateLimited);
    await expect(api.send({ kind: 'idea', text: 'a' })).rejects.toEqual(
      new FeedbackSendError(FEEDBACK_SEND_ERROR_REASON.RateLimited),
    );
    localStorage.setItem(MOCK_FEEDBACK_SCENARIO_STORAGE_KEY, MOCK_FEEDBACK_SCENARIO.ServerError);
    await expect(api.send({ kind: 'idea', text: 'a' })).rejects.toEqual(
      new FeedbackSendError(FEEDBACK_SEND_ERROR_REASON.Failed),
    );
  });

  it('ignores a broken stored value', async () => {
    localStorage.setItem(MOCK_FEEDBACK_MESSAGES_STORAGE_KEY, '{not json');

    expect(await TestBed.inject(MockFeedbackApi).list()).toEqual([]);
  });

  describe('admin side', () => {
    it('is the author by default, but not a demo user nor with sm-mock-admin=off', async () => {
      const admin = TestBed.inject(MockAdminApi);
      expect(await admin.isAdmin()).toBe(true);

      localStorage.setItem(MOCK_ADMIN_STORAGE_KEY, MOCK_ADMIN_MODE.Off);
      expect(await admin.isAdmin()).toBe(false);
      await expect(admin.listFeedback({})).rejects.toMatchObject({ status: 404 });

      localStorage.removeItem(MOCK_ADMIN_STORAGE_KEY);
      signIn('d1', { isDemo: true });
      expect(await admin.isAdmin()).toBe(false);
    });

    it('lists every user with name and email, filters by status and pages by cursor', async () => {
      const api = TestBed.inject(MockFeedbackApi);
      const admin = TestBed.inject(MockAdminApi);
      const a = await api.send({ kind: 'idea', text: 'a' });
      signIn('u2');
      await api.send({ kind: 'idea', text: 'b' });
      await api.send({ kind: 'other', text: 'c' });
      signIn('u1');
      await admin.updateFeedback(a.id, { status: FEEDBACK_STATUS.Done });

      const page1 = await admin.listFeedback({ limit: 2 });
      expect(page1.items.map((message) => message.text)).toEqual(['c', 'b']);
      expect(page1.items[0]?.user).toEqual({ name: 'User u2', email: 'u2@example.com' });
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await admin.listFeedback({ limit: 2, cursor: page1.nextCursor ?? '' });
      expect(page2.items.map((message) => message.text)).toEqual(['a']);
      expect(page2.nextCursor).toBeNull();

      const done = await admin.listFeedback({ status: FEEDBACK_STATUS.Done });
      expect(done.items.map((message) => message.text)).toEqual(['a']);
    });

    it('a status and reply set by the admin show in the owner list; null clears the reply', async () => {
      const api = TestBed.inject(MockFeedbackApi);
      const admin = TestBed.inject(MockAdminApi);
      const sent = await api.send({ kind: 'idea', text: 'a' });

      await admin.updateFeedback(sent.id, { status: FEEDBACK_STATUS.Planned, reply: 'Soon' });
      expect(await api.list()).toMatchObject([{ status: 'planned', reply: 'Soon' }]);

      await admin.updateFeedback(sent.id, { reply: null });
      expect(await api.list()).toMatchObject([{ status: 'planned', reply: null }]);
    });

    it('refuses a reply over 2000 characters, an unknown id and (save-fails) every update', async () => {
      const api = TestBed.inject(MockFeedbackApi);
      const admin = TestBed.inject(MockAdminApi);
      const sent = await api.send({ kind: 'idea', text: 'a' });

      await expect(
        admin.updateFeedback(sent.id, { reply: 'x'.repeat(FEEDBACK_MESSAGE_LIMIT.TextMax + 1) }),
      ).rejects.toMatchObject({ status: 400 });
      await expect(admin.updateFeedback('nope', { reply: 'a' })).rejects.toMatchObject({
        status: 404,
      });

      localStorage.setItem(MOCK_ADMIN_STORAGE_KEY, MOCK_ADMIN_MODE.SaveFails);
      expect(await admin.isAdmin()).toBe(true);
      await expect(admin.updateFeedback(sent.id, { reply: 'a' })).rejects.toThrow('Mock');
    });
  });
});
