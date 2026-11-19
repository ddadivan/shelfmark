import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  IMPORT_AI_STATE,
  IMPORT_SOURCE,
  type ImportAiSummary,
  type ImportSummary,
} from '@shelfmark/contracts';
import { TOAST_KIND, ToastService, type ToastOptions } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { IMPORT_AI_POLL } from '../models/import-ai-poll.const';
import { IMPORT_API } from '../models/import-api.const';
import type { ImportApi } from '../models/import-api.interface';
import { ImportAiFollowService } from './import-ai-follow.service';

function summary(ai: Partial<ImportAiSummary> | null): ImportSummary {
  return {
    id: 'imp1',
    source: IMPORT_SOURCE.Browser,
    fileName: 'b.html',
    createdAt: '2026-11-19T10:00:00.000Z',
    finishedAt: '2026-11-19T10:01:00.000Z',
    targetFolderId: null,
    linksCreated: 375,
    foldersCreated: 0,
    skipped: 0,
    failed: 0,
    ai:
      ai === null
        ? null
        : {
            state: IMPORT_AI_STATE.Running,
            total: 375,
            done: 0,
            summaries: 0,
            suggestions: 0,
            ...ai,
          },
  };
}

async function setup() {
  const get = vi.fn<ImportApi['get']>(() => of(summary({})));
  const refresh = vi.fn(async () => undefined);
  const toasts: ToastOptions[] = [];
  const navigate = vi.fn(async () => true);
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: IMPORT_API, useValue: { get } },
      { provide: AiSettingsStore, useValue: { refresh } },
      { provide: Router, useValue: { navigate } },
      {
        provide: ToastService,
        useValue: {
          show: (toast: ToastOptions) => {
            toasts.push(toast);
            return { dismiss: () => undefined, closed: new Promise(() => undefined) };
          },
        },
      },
    ],
  });
  await loadEnglish();
  return { get, refresh, toasts, navigate, service: TestBed.inject(ImportAiFollowService) };
}

describe('ImportAiFollowService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reads the AI settings first so the tick starts, then polls gently until done', async () => {
    const { service, get, refresh, toasts } = await setup();
    get
      .mockReturnValueOnce(of(summary({ done: 100 })))
      .mockReturnValueOnce(
        of(summary({ state: IMPORT_AI_STATE.Done, summaries: 375, suggestions: 212 })),
      );

    service.watch('imp1');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(IMPORT_AI_POLL.FirstMs);
    expect(get).toHaveBeenCalledTimes(1);
    expect(toasts).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(IMPORT_AI_POLL.EveryMs);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith('imp1');
    expect(toasts).toHaveLength(1);

    // Done: nothing more is read.
    await vi.advanceTimersByTimeAsync(IMPORT_AI_POLL.EveryMs * 3);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('says in a toast that descriptions and tags are ready, with the way to the Tidy review of the import', async () => {
    const { service, get, toasts, navigate } = await setup();
    get.mockReturnValue(
      of(summary({ state: IMPORT_AI_STATE.Done, summaries: 375, suggestions: 212 })),
    );

    service.watch('imp1');
    await vi.advanceTimersByTimeAsync(IMPORT_AI_POLL.FirstMs);

    expect(toasts[0]).toMatchObject({
      kind: TOAST_KIND.Success,
      title: 'Descriptions and tags are ready',
      detail: '375 links got short descriptions. There are tag suggestions for 212 links.',
    });
    toasts[0].action?.run();
    expect(toasts[0].action?.label).toBe('Review tags');
    expect(navigate).toHaveBeenCalledWith(['/', 'unsorted/tidy'], {
      queryParams: { import: 'imp1' },
    });
  });

  it('has no action and no tag sentence when nothing was suggested', async () => {
    const { service, get, toasts } = await setup();
    get.mockReturnValue(of(summary({ state: IMPORT_AI_STATE.Done, summaries: 1, suggestions: 0 })));

    service.watch('imp1');
    await vi.advanceTimersByTimeAsync(IMPORT_AI_POLL.FirstMs);

    expect(toasts[0].detail).toBe('1 link got a short description.');
    expect(toasts[0].action).toBeUndefined();
  });

  it('stops without a toast when the pass was skipped', async () => {
    const { service, get, toasts } = await setup();
    get.mockReturnValue(of(summary({ state: IMPORT_AI_STATE.Skipped })));

    service.watch('imp1');
    await vi.advanceTimersByTimeAsync(IMPORT_AI_POLL.FirstMs + IMPORT_AI_POLL.EveryMs * 3);

    expect(get).toHaveBeenCalledTimes(1);
    expect(toasts).toHaveLength(0);
  });

  it('stops when the import has no AI pass', async () => {
    const { service, get } = await setup();
    get.mockReturnValue(of(summary(null)));

    service.watch('imp1');
    await vi.advanceTimersByTimeAsync(IMPORT_AI_POLL.FirstMs + IMPORT_AI_POLL.EveryMs * 3);

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('tries again after a failed read', async () => {
    const { service, get, toasts } = await setup();
    get
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValue(of(summary({ state: IMPORT_AI_STATE.Done, summaries: 2, suggestions: 1 })));

    service.watch('imp1');
    await vi.advanceTimersByTimeAsync(IMPORT_AI_POLL.FirstMs + IMPORT_AI_POLL.EveryMs);

    expect(get).toHaveBeenCalledTimes(2);
    expect(toasts).toHaveLength(1);
  });

  it('gives up after the maximum time', async () => {
    const { service, get, toasts } = await setup();

    service.watch('imp1');
    await vi.advanceTimersByTimeAsync(IMPORT_AI_POLL.MaxMs + IMPORT_AI_POLL.EveryMs * 2);
    const reads = get.mock.calls.length;
    await vi.advanceTimersByTimeAsync(IMPORT_AI_POLL.EveryMs * 5);

    expect(reads).toBeGreaterThan(10);
    expect(get).toHaveBeenCalledTimes(reads);
    expect(toasts).toHaveLength(0);
  });

  it('stops when the session ends and follows one import once', async () => {
    const { service, get } = await setup();

    service.watch('imp1');
    service.watch('imp1');
    TestBed.inject(SessionScope).end();
    await vi.advanceTimersByTimeAsync(IMPORT_AI_POLL.FirstMs * 3);

    expect(get).not.toHaveBeenCalled();
  });
});
