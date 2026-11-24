import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { EXPORT_FORMAT } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { UiButtonHarness, UiDialogHarness } from '@shelfmark/ui/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { LAST_EXPORT_STORAGE_KEY } from '../../../../core/auth/models/last-export-storage-key.const';
import { FoldersStore } from '../../../../stores/folders.store';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { EXPORT_API } from '../../models/export-api.const';
import type { ExportApi } from '../../models/export-api.interface';
import { ExportDialogComponent } from './export-dialog.component';

/** An empty root view: the harness environment needs a fixture; the dialog itself is an overlay. */
@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class RootComponent {}

async function setup(download: ExportApi['download'] = () => of(undefined), links = 3) {
  const api: ExportApi = { download: vi.fn(download) };
  const show = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: EXPORT_API, useValue: api },
      {
        provide: FoldersStore,
        useValue: {
          load: vi.fn(),
          loaded: () => true,
          counts: () => ({ all: links, unsorted: 0, favorites: 0 }),
        },
      },
      { provide: ToastService, useValue: { show } },
    ],
  });
  await loadEnglish();
  const ref = TestBed.inject(DialogService).open(ExportDialogComponent, { size: DIALOG_SIZE.Sm });
  const closed = vi.fn();
  void ref.result.then(closed);
  await vi.waitFor(() => {
    TestBed.tick();
    expect(document.querySelector('.cdk-dialog-container')).not.toBeNull();
  });
  const loader = TestbedHarnessEnvironment.documentRootLoader(
    TestBed.createComponent(RootComponent),
  );
  const dialog = await loader.getHarness(UiDialogHarness);
  const button = (text: string | RegExp) => loader.getHarness(UiButtonHarness.with({ text }));
  const radios = () => [
    ...document.querySelectorAll<HTMLInputElement>('.cdk-dialog-container input[type="radio"]'),
  ];
  const body = () => document.querySelector('.cdk-dialog-container')?.textContent ?? '';
  const until = (check: () => void | Promise<void>) =>
    vi.waitFor(async () => {
      TestBed.tick();
      await check();
    });
  return { api, show, closed, loader, dialog, button, radios, body, until };
}

afterEach(() => {
  localStorage.removeItem(LAST_EXPORT_STORAGE_KEY);
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
    el.replaceChildren();
  });
});

describe('ExportDialogComponent', () => {
  it('is a small dialog titled Export with the formats as radio cards, JSON chosen', async () => {
    const { dialog, radios, body } = await setup();

    expect(await dialog.getTitle()).toBe('Export links');
    expect(await dialog.getSize()).toBe(DIALOG_SIZE.Sm);
    const values = radios().map((radio) => radio.value);
    expect(values).toEqual([EXPORT_FORMAT.Json, EXPORT_FORMAT.Html, EXPORT_FORMAT.Csv]);
    expect(radios()[0].checked).toBe(true);
    expect(body()).toContain('Everything: links, folders, tags, notes, reminders');
    expect(body()).toContain('Opens in the bookmark import of any browser');
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it('shows no last-export line before the first export', async () => {
    const { body } = await setup();

    expect(body()).not.toContain('Last export');
  });

  it('shows the last whole-library export of this browser', async () => {
    localStorage.setItem(
      LAST_EXPORT_STORAGE_KEY,
      JSON.stringify({ format: 'html', at: new Date(Date.now() - 3 * 86_400_000).toISOString() }),
    );
    const { body } = await setup();

    expect(body()).toContain('Last export: 3 days ago, HTML.');
  });

  it('downloads the chosen format for the whole library, then closes with a toast and remembers it', async () => {
    const { api, show, closed, button, radios, until } = await setup();

    radios()[1].click();
    await (await button(/^Export /)).click();

    await until(() => {
      expect(closed).toHaveBeenCalledTimes(1);
    });
    expect(api.download).toHaveBeenCalledWith(EXPORT_FORMAT.Html, {});
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ kind: TOAST_KIND.Success, title: 'File saved' }),
    );
    expect(JSON.parse(localStorage.getItem(LAST_EXPORT_STORAGE_KEY) ?? '{}')).toMatchObject({
      format: 'html',
    });
  });

  it('shows the preparing state with only Cancel active while the file is made', async () => {
    const pending = new Subject<void>();
    const { button, radios, body, until, closed } = await setup(() => pending);

    await (await button(/^Export /)).click();

    await until(() => {
      expect(body()).toContain('Preparing the JSON file…');
    });
    expect(await (await button(/^Export /)).isDisabled()).toBe(true);
    expect(await (await button('Cancel')).isDisabled()).toBe(false);
    expect(radios().every((radio) => radio.disabled)).toBe(true);
    expect(closed).not.toHaveBeenCalled();

    pending.complete();
    await until(() => {
      expect(closed).toHaveBeenCalledTimes(1);
    });
  });

  it('cancels the request and closes without a toast', async () => {
    let unsubscribed = false;
    const { show, button, until, closed } = await setup(
      () =>
        new Observable<void>(() => () => {
          unsubscribed = true;
        }),
    );

    await (await button(/^Export /)).click();
    await until(async () => {
      expect(await (await button(/^Export /)).isDisabled()).toBe(true);
    });
    await (await button('Cancel')).click();

    await until(() => {
      expect(closed).toHaveBeenCalledTimes(1);
    });
    expect(unsubscribed).toBe(true);
    expect(show).not.toHaveBeenCalled();
    expect(localStorage.getItem(LAST_EXPORT_STORAGE_KEY)).toBeNull();
  });

  it('keeps the dialog open after a failure, with the error toast and Download usable again', async () => {
    const { show, button, until, closed } = await setup(() => throwError(() => new Error('down')));

    await (await button(/^Export /)).click();

    await until(() => {
      expect(show).toHaveBeenCalledWith(expect.objectContaining({ kind: TOAST_KIND.Danger }));
    });
    expect(closed).not.toHaveBeenCalled();
    await until(async () => {
      expect(await (await button(/^Export /)).isDisabled()).toBe(false);
    });
  });

  it('closes after explaining when the library is empty', async () => {
    const { api, show, until, closed, button } = await setup(undefined, 0);

    await (await button(/^Export /)).click();

    await until(() => {
      expect(closed).toHaveBeenCalledTimes(1);
    });
    expect(api.download).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ kind: TOAST_KIND.Info }));
  });
});
