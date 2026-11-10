import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { EXPORT_FORMAT } from '@shelfmark/contracts';
import { ToastService } from '@shelfmark/ui';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../core/i18n/transloco.config';
import { ExportActionsService } from './export-actions.service';
import { EXPORT_API } from './models/export-api.const';
import type { ExportApi } from './models/export-api.interface';

async function setup(api: ExportApi) {
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: EXPORT_API, useValue: api },
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
    expect(options.title).toBe("Couldn't export your links. Try again.");
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
});
