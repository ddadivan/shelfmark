import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import {
  AI_APPLIED_PART,
  AI_FEATURE_MODE,
  AI_JOB_STATUS,
  AI_LIMIT,
  SUMMARY_SOURCE,
  type LinkAiState,
  type LinkResponse,
} from '@shelfmark/contracts';
import { MOCK_ID, MOCK_LINKS, MOCK_NAME } from '@shelfmark/contracts/testing';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom, of, throwError } from 'rxjs';
import { aiSettingsResponse, fakeAiApi, type FakeAiApi } from '../../../../testing/fake-ai-api';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { MockFoldersApi } from '../../links/mock/mock-folders.api';
import { MockTagsApi } from '../../links/mock/mock-tags.api';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { LINKS_API } from '../../links/models/links-api.const';
import { TAGS_API } from '../../links/models/tags-api.const';
import { AI_API } from '../models/ai-api.const';
import { AI_BATCH_FOLLOW_UP } from '../models/ai-batch-follow-up.const';
import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import { AI_POLL_INTERVAL_MS } from '../models/ai-poll-interval.const';
import { AiFollowUpService } from './ai-follow-up.service';
import { AiSettingsStore } from './ai-settings.store';

const SAVED: LinkResponse = {
  ...MOCK_LINKS[0],
  folderId: null,
  tags: [],
  summary: null,
  summarySource: null,
  aiStatus: AI_JOB_STATUS.Pending,
};

function state(patch: Partial<LinkAiState> = {}): LinkAiState {
  return {
    aiStatus: AI_JOB_STATUS.Done,
    reason: null,
    summary: 'In short.',
    summarySource: SUMMARY_SOURCE.Ai,
    suggestions: [],
    autoApplied: null,
    ...patch,
  };
}

async function setup(ai: FakeAiApi = fakeAiApi(), fresh: LinkResponse = SAVED) {
  const links = { get: vi.fn(() => of(fresh)) };
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: AI_API, useValue: ai },
      { provide: LINKS_API, useValue: links },
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: TAGS_API, useClass: MockTagsApi },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  await TestBed.inject(AiSettingsStore).load();
  await TestBed.inject(FoldersStore).load();
  const store = TestBed.inject(LinksStore);
  const applyEdit = vi.spyOn(store, 'applyEdit').mockImplementation(() => undefined);
  const show = vi.spyOn(TestBed.inject(ToastService), 'show');
  return { ai, links, applyEdit, show, service: TestBed.inject(AiFollowUpService) };
}

describe('AiFollowUpService', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }));
  afterEach(() => vi.useRealTimers());

  it('polls a pending link and puts its summary into the feed', async () => {
    const ai = fakeAiApi();
    ai.getLinkAi
      .mockReturnValueOnce(of(state({ aiStatus: AI_JOB_STATUS.Pending, summary: null })))
      .mockReturnValueOnce(of(state()));
    const { applyEdit, show, service } = await setup(ai);
    const pending = TestBed.inject(AiSettingsStore).pendingJobs();
    service.watch(SAVED, true);
    expect(TestBed.inject(AiSettingsStore).pendingJobs()).toBe(pending + 1);
    await vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS * 3);
    expect(ai.getLinkAi).toHaveBeenCalledTimes(2);
    expect(applyEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: SAVED.id,
        summary: 'In short.',
        summarySource: SUMMARY_SOURCE.Ai,
        aiStatus: AI_JOB_STATUS.Done,
      }),
    );
    expect(show).not.toHaveBeenCalled();
  });

  it('stops after the skeleton window and ignores links without a pending job', async () => {
    const ai = fakeAiApi();
    ai.getLinkAi.mockReturnValue(of(state({ aiStatus: AI_JOB_STATUS.Pending })));
    const { applyEdit, service } = await setup(ai);
    service.watch({ ...SAVED, aiStatus: AI_JOB_STATUS.Done });
    service.watch({ ...SAVED, aiStatus: null }, true);
    expect(ai.getLinkAi).not.toHaveBeenCalled();
    service.watch(SAVED);
    await vi.advanceTimersByTimeAsync(AI_LIMIT.PendingSkeletonMs + AI_POLL_INTERVAL_MS * 2);
    const calls = ai.getLinkAi.mock.calls.length;
    expect(calls).toBeLessThanOrEqual(AI_LIMIT.PendingSkeletonMs / AI_POLL_INTERVAL_MS);
    await vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS * 5);
    expect(ai.getLinkAi.mock.calls.length).toBe(calls);
    expect(applyEdit).not.toHaveBeenCalled();
  });

  it('names a move by Automatic mode in a toast whose Undo puts it back', async () => {
    const ai = fakeAiApi();
    ai.getLinkAi.mockReturnValue(
      of(state({ autoApplied: { folderId: MOCK_ID.FolderAngular, tags: ['angular'] } })),
    );
    const moved = { ...SAVED, folderId: MOCK_ID.FolderAngular, tags: ['angular'] };
    ai.undoApply
      .mockReturnValueOnce(of({ ...moved, folderId: null }))
      .mockReturnValueOnce(of({ ...moved, folderId: null, tags: [] }));
    const { applyEdit, show, links, service } = await setup(ai, moved);
    service.watch(SAVED, true);
    await vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS);
    expect(links.get).toHaveBeenCalledWith(SAVED.id);
    expect(applyEdit).toHaveBeenCalledWith(moved);
    const toast = show.mock.calls[0]?.[0];
    expect(toast?.kind).toBe(TOAST_KIND.Moved);
    expect(toast?.title).toBe(`Moved to ${MOCK_NAME.FolderAngular} by AI`);
    expect(toast?.action?.label).toBe('Undo');

    toast?.action?.run();
    await vi.advanceTimersByTimeAsync(0);
    expect(ai.undoApply).toHaveBeenNthCalledWith(1, SAVED.id, { part: AI_APPLIED_PART.Folder });
    expect(ai.undoApply).toHaveBeenNthCalledWith(2, SAVED.id, { part: AI_APPLIED_PART.Tags });
    expect(applyEdit).toHaveBeenLastCalledWith({ ...moved, folderId: null, tags: [] });
  });

  describe('after an edit', () => {
    const edited: LinkResponse = { ...SAVED, folderId: MOCK_ID.FolderAngular, tags: ['angular'] };

    it('does not announce again what AI applied before the edit', async () => {
      const ai = fakeAiApi();
      ai.getLinkAi.mockReturnValue(
        of(state({ autoApplied: { folderId: MOCK_ID.FolderAngular, tags: ['angular'] } })),
      );
      const { applyEdit, show, links, service } = await setup(ai, edited);
      service.watch(edited);
      await vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS);
      expect(links.get).not.toHaveBeenCalled();
      expect(applyEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: SAVED.id, summary: 'In short.' }),
      );
      expect(show).not.toHaveBeenCalled();
    });

    it('announces only the tags this follow-up added', async () => {
      const ai = fakeAiApi();
      ai.getLinkAi.mockReturnValue(
        of(
          state({
            autoApplied: { folderId: MOCK_ID.FolderAngular, tags: ['angular', 'signals'] },
          }),
        ),
      );
      ai.undoApply.mockReturnValue(of({ ...edited, tags: ['angular'] }));
      const { show, service } = await setup(ai, { ...edited, tags: ['angular', 'signals'] });
      service.watch(edited);
      await vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS);
      const toast = show.mock.calls[0]?.[0];
      expect(toast?.kind).toBe(TOAST_KIND.Success);
      expect(toast?.title).toBe('1 tag added by AI');
      toast?.action?.run();
      await vi.advanceTimersByTimeAsync(0);
      expect(ai.undoApply).toHaveBeenCalledTimes(1);
      expect(ai.undoApply).toHaveBeenCalledWith(SAVED.id, { part: AI_APPLIED_PART.Tags });
    });
  });

  it('asks once for a new link whose draft was done while Automatic mode is on', async () => {
    const ai = fakeAiApi(
      aiSettingsResponse({
        settings: { ...AI_SETTINGS_DEFAULT, enabled: true, tagsMode: AI_FEATURE_MODE.Auto },
      }),
    );
    ai.getLinkAi.mockReturnValue(of(state({ autoApplied: { folderId: null, tags: ['a', 'b'] } })));
    ai.undoApply.mockReturnValue(throwError(() => new Error('gone')));
    const { show, service } = await setup(ai);
    service.watch({ ...SAVED, aiStatus: AI_JOB_STATUS.Done }, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(ai.getLinkAi).toHaveBeenCalledTimes(1);
    const toast = show.mock.calls[0]?.[0];
    expect(toast?.title).toBe('2 tags added by AI');
    toast?.action?.run();
    await vi.advanceTimersByTimeAsync(0);
    expect(show.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({ kind: TOAST_KIND.Danger, title: 'Couldn’t undo the AI change' }),
    );
  });

  describe('links saved together (paste many)', () => {
    const second: LinkResponse = { ...SAVED, id: 'second' };

    async function batchSetup() {
      const ai = fakeAiApi();
      const ctx = await setup(ai);
      const store = TestBed.inject(LinksStore);
      let shown: Record<string, LinkResponse> = { [SAVED.id]: SAVED, [second.id]: second };
      vi.spyOn(store, 'entityMap').mockImplementation(() => shown);
      const refresh = vi.spyOn(store, 'refresh').mockImplementation(() => undefined);
      return { ...ctx, refresh, show: (next: Record<string, LinkResponse>) => (shown = next) };
    }

    it('reloads the feed in one loop until none of them is pending, without per-link polls', async () => {
      const { ai, service, refresh, show } = await batchSetup();
      const pending = TestBed.inject(AiSettingsStore).pendingJobs();
      service.watchMany([SAVED, second, { ...SAVED, id: 'done', aiStatus: AI_JOB_STATUS.Done }]);
      service.watchMany([second]);
      expect(TestBed.inject(AiSettingsStore).pendingJobs()).toBe(pending + 3);

      await vi.advanceTimersByTimeAsync(AI_BATCH_FOLLOW_UP.RefreshMs);
      expect(refresh).toHaveBeenCalledTimes(1);
      show({ [SAVED.id]: { ...SAVED, aiStatus: AI_JOB_STATUS.Done } });
      await vi.advanceTimersByTimeAsync(AI_BATCH_FOLLOW_UP.RefreshMs * 3);

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(ai.getLinkAi).not.toHaveBeenCalled();
    });

    it('gives up after the window and stops when the session ends', async () => {
      const { service, refresh } = await batchSetup();
      service.watchMany([SAVED]);
      await vi.advanceTimersByTimeAsync(AI_BATCH_FOLLOW_UP.WindowMs * 2);
      const calls = refresh.mock.calls.length;
      expect(calls).toBeLessThanOrEqual(AI_BATCH_FOLLOW_UP.WindowMs / AI_BATCH_FOLLOW_UP.RefreshMs);

      service.watchMany([second]);
      TestBed.inject(SessionScope).end();
      await vi.advanceTimersByTimeAsync(AI_BATCH_FOLLOW_UP.RefreshMs * 2);
      expect(refresh.mock.calls.length).toBe(calls);
    });
  });

  it('stops following when the session ends', async () => {
    const ai = fakeAiApi();
    ai.getLinkAi.mockReturnValue(of(state()));
    const { applyEdit, service } = await setup(ai);
    service.watch(SAVED);
    TestBed.inject(SessionScope).end();
    await vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS * 2);
    expect(ai.getLinkAi).not.toHaveBeenCalled();
    expect(applyEdit).not.toHaveBeenCalled();
  });
});
