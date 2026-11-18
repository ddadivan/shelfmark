import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideTransloco } from '@jsverse/transloco';
import { CLEANUP_STATE } from '@shelfmark/contracts';
import { MOCK_LIST_FOLDERS_RESPONSE } from '@shelfmark/contracts/testing';
import { ToastService } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { cleanupReport, fakeCleanupApi } from '../../../../testing/cleanup-report';
import { aiSettingsResponse, fakeAiApi } from '../../../../testing/fake-ai-api';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { AI_API } from '../../ai/models/ai-api.const';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { CLEANUP_API } from '../models/cleanup-api.const';
import { CLEANUP_POLL_INTERVAL_MS } from '../models/cleanup-poll-interval.const';
import { CLEANUP_VIEW } from '../models/cleanup-view.const';
import { CleanupApplyService } from './cleanup-apply.service';
import { CleanupReportStore } from './cleanup-report.store';

async function setup(report = cleanupReport()) {
  const api = fakeCleanupApi(report);
  const ai = fakeAiApi(aiSettingsResponse());
  ai.tick.mockReturnValue(
    of({
      pendingJobs: 0,
      backfill: aiSettingsResponse().backfill,
      search: aiSettingsResponse().search,
      cleanup: CLEANUP_STATE.Ready,
    }),
  );
  const applier = { apply: vi.fn<CleanupApplyService['apply']>(async () => true) };
  TestBed.configureTestingModule({
    providers: [
      CleanupReportStore,
      { provide: CLEANUP_API, useValue: api },
      { provide: AI_API, useValue: ai },
      { provide: FOLDERS_API, useValue: { list: () => of(MOCK_LIST_FOLDERS_RESPONSE) } },
      { provide: CleanupApplyService, useValue: applier },
      provideTransloco({ config: translocoConfig }),
    ],
  });
  await TestBed.inject(AiSettingsStore).load();
  const store = TestBed.inject(CleanupReportStore);
  await vi.waitFor(() => expect(store.report()).not.toBeNull());
  return { store, api, ai, applier };
}

describe('CleanupReportStore', () => {
  afterEach(() => vi.useRealTimers());

  it('derives the rows, the view and the apply count; every row starts checked', async () => {
    const { store } = await setup();
    expect(store.view()).toBe(CLEANUP_VIEW.Report);
    expect(store.duplicates().map((row) => [row.id, row.copies, row.selected])).toEqual([
      ['g1', 2, true],
      ['g2', 1, true],
    ]);
    expect(store.duplicates()[1]?.place).toBe('Angular');
    expect(store.applyCount()).toBe(4);
    expect(store.hasAi()).toBe(true);
    store.toggle('g1', false);
    store.toggle('p1', false);
    expect(store.applyCount()).toBe(1);
    store.toggle('g1', true);
    expect(store.applyCount()).toBe(3);
  });

  it('swaps a pair back and forth', async () => {
    const { store } = await setup();
    store.swap('p1');
    expect(store.tags()[0]?.keep.name).toBe('js');
    store.swap('p1');
    expect(store.tags()[0]?.keep.name).toBe('javascript');
  });

  it('applies the selection and reads the report again after a successful run', async () => {
    const { store, api, applier } = await setup();
    store.toggle('g2', false);
    api.getReport.mockClear();
    await store.apply();
    expect(applier.apply).toHaveBeenCalledWith(
      {
        duplicates: [{ groupId: 'g1', trashIds: ['hn2', 'hn3'] }],
        tagMerges: [{ pairId: 'p1', keepTagId: 't-js-long' }],
      },
      expect.any(Function),
    );
    expect(api.getReport).toHaveBeenCalledTimes(1);
    expect(store.applying()).toBe(false);
  });

  it('starts a run without AI when switched off, resets the choices, reads a running one on 409', async () => {
    const { store, api } = await setup();
    store.toggle('g1', false);
    store.setIncludeAi(false);
    await store.run();
    expect(api.run).toHaveBeenCalledWith({ includeAi: false });
    expect(store.deselected()).toEqual([]);
    api.run.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.getReport.mockClear();
    await store.run();
    expect(api.getReport).toHaveBeenCalled();
    const toasts = vi.spyOn(TestBed.inject(ToastService), 'show');
    api.run.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await store.run();
    expect(toasts).toHaveBeenCalledWith(expect.objectContaining({ kind: 'danger' }));
  });

  it('moves a running report on through the AI tick every 3 s and stops once it is ready', async () => {
    vi.useFakeTimers();
    const running = cleanupReport({ state: CLEANUP_STATE.Running, checked: 10, total: 40 });
    const { store, api, ai } = await setup(running);
    expect(store.view()).toBe(CLEANUP_VIEW.Checking);
    TestBed.tick();
    api.getReport.mockReturnValue(of(cleanupReport()));
    await vi.advanceTimersByTimeAsync(CLEANUP_POLL_INTERVAL_MS);
    expect(ai.tick).toHaveBeenCalledTimes(1);
    expect(store.view()).toBe(CLEANUP_VIEW.Report);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(CLEANUP_POLL_INTERVAL_MS * 2);
    expect(ai.tick).toHaveBeenCalledTimes(1);
  });

  it('tells a failed check with no rows from a tidy library, and keeps rows of a failed one', async () => {
    const empty = { duplicates: [], similarTags: [] };
    const failed = await setup(cleanupReport({ ...empty, state: CLEANUP_STATE.Failed }));
    expect(failed.store.view()).toBe(CLEANUP_VIEW.Failed);
    TestBed.resetTestingModule();
    const partial = await setup(cleanupReport({ state: CLEANUP_STATE.Failed }));
    expect(partial.store.view()).toBe(CLEANUP_VIEW.Report);
    TestBed.resetTestingModule();
    const tidy = await setup(cleanupReport({ ...empty, state: CLEANUP_STATE.Ready }));
    expect(tidy.store.view()).toBe(CLEANUP_VIEW.Tidy);
  });

  it('shows the error view when the first read fails', async () => {
    const api = fakeCleanupApi();
    api.getReport.mockReturnValue(throwError(() => new Error('down')));
    TestBed.configureTestingModule({
      providers: [
        CleanupReportStore,
        { provide: CLEANUP_API, useValue: api },
        { provide: AI_API, useValue: fakeAiApi() },
        { provide: FOLDERS_API, useValue: { list: () => of(MOCK_LIST_FOLDERS_RESPONSE) } },
        provideTransloco({ config: translocoConfig }),
      ],
    });
    const store = TestBed.inject(CleanupReportStore);
    await vi.waitFor(() => expect(store.view()).toBe(CLEANUP_VIEW.Error));
  });
});
