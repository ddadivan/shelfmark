import { TestBed } from '@angular/core/testing';
import {
  AI_JOB_REASON,
  AI_JOB_STATUS,
  AI_LIMIT,
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  type AiJobResponse,
} from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { aiSettingsResponse, fakeAiApi, type FakeAiApi } from '../../../../testing/fake-ai-api';
import { AI_API } from '../models/ai-api.const';
import { AI_DRAFT_STATE } from '../models/ai-draft-state.const';
import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import { AI_POLL_INTERVAL_MS } from '../models/ai-poll-interval.const';
import { AiDraftService } from './ai-draft.service';
import { AiSettingsStore } from './ai-settings.store';

const URL = 'https://example.org/signals';

function job(patch: Partial<AiJobResponse> = {}): AiJobResponse {
  return {
    id: 'job-1',
    status: AI_JOB_STATUS.Done,
    reason: null,
    suggestions: [
      {
        id: 's-tag',
        kind: SUGGESTION_KIND.Tag,
        state: SUGGESTION_STATE.Suggested,
        tagName: 'angular',
        folderId: null,
      },
      {
        id: 's-folder',
        kind: SUGGESTION_KIND.Folder,
        state: SUGGESTION_STATE.Suggested,
        tagName: null,
        folderId: 'f1',
      },
    ],
    summary: null,
    title: null,
    ...patch,
  };
}

async function setup(api: FakeAiApi = fakeAiApi(), load = true) {
  TestBed.configureTestingModule({
    providers: [{ provide: AI_API, useValue: api }, AiDraftService],
  });
  if (load) {
    await TestBed.inject(AiSettingsStore).load();
  }
  return { api, draft: TestBed.inject(AiDraftService) };
}

describe('AiDraftService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing while AI is off', async () => {
    const { api, draft } = await setup(
      fakeAiApi(aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT } })),
    );
    draft.start({ url: URL });
    expect(api.createDraft).not.toHaveBeenCalled();
    expect(draft.state()).toBe(AI_DRAFT_STATE.Idle);
    expect(draft.draftId()).toBeNull();
  });

  it('asks once per address and exposes the suggestions', async () => {
    const api = fakeAiApi();
    api.createDraft.mockReturnValue(of(job()));
    const { draft } = await setup(api);
    draft.start({ url: URL, title: ' Signals ', description: '', note: 'mine' });
    draft.start({ url: URL });
    await vi.waitFor(() => expect(draft.state()).toBe(AI_DRAFT_STATE.Ready));
    expect(api.createDraft).toHaveBeenCalledTimes(1);
    const request = api.createDraft.mock.calls[0]?.[0];
    // No description (empty) and no note ("Include my notes" is off).
    expect(request).toEqual({ draftId: draft.draftId(), url: URL, title: 'Signals' });
    expect(draft.suggestions().map((item) => item.id)).toEqual(['s-tag', 's-folder']);
  });

  it('sends the note only while "Include my notes" is on', async () => {
    const api = fakeAiApi(
      aiSettingsResponse({
        settings: { ...AI_SETTINGS_DEFAULT, enabled: true, includeNotes: true },
      }),
    );
    api.createDraft.mockReturnValue(of(job()));
    const { draft } = await setup(api);
    draft.start({ url: URL, note: ' read later ' });
    await vi.waitFor(() => expect(api.createDraft).toHaveBeenCalled());
    expect(api.createDraft.mock.calls[0]?.[0].note).toBe('read later');
  });

  it('polls a pending job until it is done', async () => {
    vi.useFakeTimers();
    const api = fakeAiApi();
    api.createDraft.mockReturnValue(
      of(job({ status: AI_JOB_STATUS.Pending, suggestions: [], id: 'job-9' })),
    );
    api.getJob
      .mockReturnValueOnce(of(job({ status: AI_JOB_STATUS.Pending, suggestions: [] })))
      .mockReturnValueOnce(of(job()));
    const { draft } = await setup(api);
    draft.start({ url: URL });
    await vi.advanceTimersByTimeAsync(0);
    expect(draft.state()).toBe(AI_DRAFT_STATE.Loading);
    await vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS * 2);
    expect(api.getJob).toHaveBeenCalledWith('job-9');
    expect(draft.state()).toBe(AI_DRAFT_STATE.Ready);
  });

  it('gives up after the poll limit: the rows collapse, the draft id is still sent', async () => {
    vi.useFakeTimers();
    const api = fakeAiApi();
    const pending = job({ status: AI_JOB_STATUS.Pending, suggestions: [] });
    api.createDraft.mockReturnValue(of(pending));
    api.getJob.mockReturnValue(of(pending));
    const { draft } = await setup(api);
    draft.start({ url: URL });
    await vi.advanceTimersByTimeAsync(AI_LIMIT.DraftPollMaxMs + AI_POLL_INTERVAL_MS);
    expect(draft.state()).toBe(AI_DRAFT_STATE.Hidden);
    expect(draft.draftId()).not.toBeNull();
    const calls = api.getJob.mock.calls.length;
    await vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS * 5);
    expect(api.getJob.mock.calls.length).toBe(calls);
  });

  it('maps the reasons: quota is the limit line, unavailable offers Try again once', async () => {
    const api = fakeAiApi();
    api.createDraft.mockReturnValueOnce(
      of(job({ status: AI_JOB_STATUS.Skipped, reason: AI_JOB_REASON.Quota, suggestions: [] })),
    );
    const { draft } = await setup(api);
    draft.start({ url: URL });
    await vi.waitFor(() => expect(draft.state()).toBe(AI_DRAFT_STATE.Quota));
    expect(draft.suggestions()).toEqual([]);

    api.createDraft.mockReturnValueOnce(
      of(job({ status: AI_JOB_STATUS.Failed, reason: AI_JOB_REASON.Unavailable })),
    );
    draft.start({ url: `${URL}/2` });
    await vi.waitFor(() => expect(draft.state()).toBe(AI_DRAFT_STATE.Unavailable));
    expect(draft.canRetry()).toBe(true);
    const first = draft.draftId();

    api.createDraft.mockReturnValueOnce(throwError(() => new Error('offline')));
    draft.retry();
    await vi.waitFor(() => expect(api.createDraft).toHaveBeenCalledTimes(3));
    await vi.waitFor(() => expect(draft.state()).toBe(AI_DRAFT_STATE.Unavailable));
    // A retry resends the same draft (the server re-arms it); and only one retry is offered.
    expect(draft.draftId()).toBe(first);
    expect(api.createDraft.mock.calls[2]?.[0]).toEqual(
      expect.objectContaining({ draftId: first, url: `${URL}/2` }),
    );
    expect(draft.canRetry()).toBe(false);
    draft.retry();
    expect(api.createDraft).toHaveBeenCalledTimes(3);
  });

  it('hides other reasons silently', async () => {
    const api = fakeAiApi();
    api.createDraft.mockReturnValue(
      of(job({ status: AI_JOB_STATUS.Failed, reason: AI_JOB_REASON.Rejected })),
    );
    const { draft } = await setup(api);
    draft.start({ url: URL });
    await vi.waitFor(() => expect(draft.state()).toBe(AI_DRAFT_STATE.Hidden));
    expect(draft.canRetry()).toBe(false);
  });

  it('dismisses locally and forgets everything on reset', async () => {
    const api = fakeAiApi();
    api.createDraft.mockReturnValue(of(job()));
    const { draft } = await setup(api);
    draft.start({ url: URL });
    await vi.waitFor(() => expect(draft.state()).toBe(AI_DRAFT_STATE.Ready));
    draft.dismiss('s-tag');
    expect(draft.suggestions().map((item) => item.id)).toEqual(['s-folder']);
    expect(api.dismissSuggestion).not.toHaveBeenCalled();
    draft.reset();
    expect(draft.state()).toBe(AI_DRAFT_STATE.Idle);
    expect(draft.draftId()).toBeNull();
    expect(draft.suggestions()).toEqual([]);
  });

  it('ignores the answer of a draft replaced by a new address', async () => {
    vi.useFakeTimers();
    const api = fakeAiApi();
    api.createDraft
      .mockReturnValueOnce(of(job({ status: AI_JOB_STATUS.Pending, suggestions: [] })))
      .mockReturnValueOnce(of(job({ id: 'job-2', suggestions: [] })));
    api.getJob.mockReturnValue(of(job()));
    const { draft } = await setup(api);
    draft.start({ url: URL });
    await vi.advanceTimersByTimeAsync(0);
    draft.start({ url: `${URL}/other` });
    await vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS * 3);
    expect(api.getJob).not.toHaveBeenCalled();
    expect(draft.state()).toBe(AI_DRAFT_STATE.Ready);
    expect(draft.suggestions()).toEqual([]);
  });
});
