import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { EXPORT_FORMAT } from '@shelfmark/contracts';
import { ToastService } from '@shelfmark/ui';
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { ExportActionsService } from './export-actions.service';
import { EXPORT_RESULT } from '../models/export-result.const';
import { EXPORT_API } from '../models/export-api.const';
import type { ExportApi } from '../models/export-api.interface';
import { FoldersStore } from '../../../stores/folders.store';

/** The sidebar counts the service reads: `null` = they could not be loaded. */
function foldersWith(all: number | null) {
  return {
    load: vi.fn(() => (all === null ? Promise.reject(new Error('offline')) : Promise.resolve())),
    loaded: () => all !== null,
    counts: () => ({ all: all ?? 0, unsorted: 0, favorites: 0 }),
  };
}

async function setup(api: ExportApi, links: number | null = 3) {
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: EXPORT_API, useValue: api },
      { provide: FoldersStore, useValue: foldersWith(links) },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const toasts = TestBed.inject(ToastService);
  const show = vi.spyOn(toasts, 'show');
  return { service: TestBed.inject(ExportActionsService), show };
}

describe('ExportActionsService', () => {
  it('downloads the whole library by default', async () => {
    const download = vi.fn(() => of(undefined));
    const { service, show } = await setup({ download });

    await service.download(EXPORT_FORMAT.Json);

    expect(download).toHaveBeenCalledWith(EXPORT_FORMAT.Json, {});
    expect(show).not.toHaveBeenCalled();
  });

  it('passes the scope through', async () => {
    const download = vi.fn(() => of(undefined));
    const { service } = await setup({ download });

    await service.download(EXPORT_FORMAT.Html, { folderId: 'f', tags: ['a'] });

    expect(download).toHaveBeenCalledWith(EXPORT_FORMAT.Html, { folderId: 'f', tags: ['a'] });
  });

  it('toasts a failure with a retry that downloads again', async () => {
    const download = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('boom')))
      .mockReturnValue(of(undefined));
    const { service, show } = await setup({ download });

    await service.download(EXPORT_FORMAT.Json);

    expect(show).toHaveBeenCalledOnce();
    const options = show.mock.calls[0][0];
    expect(options.title).toBe("Couldn't export your links");
    expect(options.detail).toBe('Check your connection, then try again');
    options.action?.run();
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('ignores a second export while one runs, then allows the next', async () => {
    const pending = new Subject<undefined>();
    const download = vi.fn(() => pending);
    const { service } = await setup({ download });

    const first = service.download(EXPORT_FORMAT.Json);
    await service.download(EXPORT_FORMAT.Html);
    expect(download).toHaveBeenCalledOnce();

    pending.next(undefined);
    pending.complete();
    await first;
    download.mockReturnValue(of(undefined) as never);
    await service.download(EXPORT_FORMAT.Html);
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('allows a new export after a failure', async () => {
    const download = vi.fn(() => throwError(() => new Error('boom')));
    const { service } = await setup({ download });

    await service.download(EXPORT_FORMAT.Json);
    await service.download(EXPORT_FORMAT.Json);

    expect(download).toHaveBeenCalledTimes(2);
  });

  describe('result and abort', () => {
    it('resolves saved and failed', async () => {
      const download = vi
        .fn()
        .mockReturnValueOnce(of(undefined))
        .mockReturnValueOnce(throwError(() => new Error('boom')));
      const { service } = await setup({ download });

      expect(await service.download(EXPORT_FORMAT.Json)).toBe(EXPORT_RESULT.Saved);
      expect(await service.download(EXPORT_FORMAT.Json)).toBe(EXPORT_RESULT.Failed);
    });

    it('resolves empty when the account has no link', async () => {
      const { service } = await setup({ download: vi.fn() }, 0);

      expect(await service.download(EXPORT_FORMAT.Json)).toBe(EXPORT_RESULT.Empty);
    });

    it('stops the request and shows no toast when the signal aborts', async () => {
      let unsubscribed = false;
      const download = vi.fn(
        () =>
          new Observable<void>(() => () => {
            unsubscribed = true;
          }),
      );
      const { service, show } = await setup({ download });
      const abort = new AbortController();

      const running = service.download(EXPORT_FORMAT.Json, {}, { signal: abort.signal });
      abort.abort();

      expect(await running).toBe(EXPORT_RESULT.Skipped);
      expect(unsubscribed).toBe(true);
      expect(show).not.toHaveBeenCalled();
    });
  });

  describe('with nothing to export', () => {
    it('explains instead of saving an empty file when the account has no link', async () => {
      const download = vi.fn(() => of(undefined));
      const { service, show } = await setup({ download }, 0);

      await service.download(EXPORT_FORMAT.Json);

      expect(download).not.toHaveBeenCalled();
      expect(show).toHaveBeenCalledOnce();
      const options = show.mock.calls[0][0];
      expect(options.kind).toBe('info');
      expect(options.title).toBe('Nothing to export yet');
      expect(options.detail).toBe('Save a link first, then you can export your library');
    });

    it('explains an empty view and still exports a full one', async () => {
      const download = vi.fn(() => of(undefined));
      const { service, show } = await setup({ download });

      await service.download(EXPORT_FORMAT.Html, { folderId: 'f' }, { viewEmpty: true });
      expect(download).not.toHaveBeenCalled();
      expect(show.mock.calls[0][0].title).toBe('Nothing to export in this view');

      await service.download(EXPORT_FORMAT.Html, { folderId: 'f' }, { viewEmpty: false });
      expect(download).toHaveBeenCalledWith(EXPORT_FORMAT.Html, { folderId: 'f' });
    });

    it('exports as before when the counts cannot be loaded', async () => {
      const download = vi.fn(() => of(undefined));
      const { service, show } = await setup({ download }, null);

      await service.download(EXPORT_FORMAT.Json);

      expect(download).toHaveBeenCalledOnce();
      expect(show).not.toHaveBeenCalled();
    });

    it('lets the next export run after explaining', async () => {
      const download = vi.fn(() => of(undefined));
      const { service } = await setup({ download });

      await service.download(EXPORT_FORMAT.Json, { tags: ['a'] }, { viewEmpty: true });
      await service.download(EXPORT_FORMAT.Json);

      expect(download).toHaveBeenCalledWith(EXPORT_FORMAT.Json, {});
    });
  });
});
