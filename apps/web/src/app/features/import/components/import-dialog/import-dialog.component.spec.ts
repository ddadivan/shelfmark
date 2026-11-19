import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Router } from '@angular/router';
import { IMPORT_LIMIT, type ImportLinksResponse } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService, ToastService } from '@shelfmark/ui';
import { UiButtonHarness, UiDialogHarness, UiDropZoneHarness } from '@shelfmark/ui/testing';
import { of, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { mockHttpError } from '../../../../core/api/mock-http-error';
import { TabSyncService } from '../../../../core/sync/tab-sync.service';
import { FoldersStore } from '../../../../stores/folders.store';
import { LinksStore } from '../../../../stores/links.store';
import { PinsStore } from '../../../../stores/pins.store';
import { TagsStore } from '../../../../stores/tags.store';
import { TrashStore } from '../../../../stores/trash.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { IMPORT_API } from '../../models/import-api.const';
import type { ImportApi } from '../../models/import-api.interface';
import { RecentImportsStore } from '../../services/recent-imports.store';
import { ImportDialogComponent } from './import-dialog.component';

/** An empty root view: the harness environment needs a fixture; the dialog itself is an overlay. */
@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class RootComponent {}

const BOOKMARKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
<DT><H3>Dev</H3>
<DL><p>
<DT><A HREF="https://a.example/">A</A>
<DT><A HREF="https://b.example/">B</A>
</DL><p>
<DT><A HREF="https://c.example/">C</A>
</DL><p>`;

function bookmarks(name = 'my-bookmarks.html'): File {
  return new File([BOOKMARKS], name, { type: 'text/html' });
}

async function setup() {
  const api = {
    list: vi.fn(),
    check: vi.fn<ImportApi['check']>(() => of({ saved: [] })),
    start: vi.fn<ImportApi['start']>(() =>
      of({ id: 'imp1', targetFolderId: 'target1', folders: [{ key: 'f1', id: 'folder1' }] }),
    ),
    addLinks: vi.fn<ImportApi['addLinks']>((_id, body) =>
      of<ImportLinksResponse>({ created: body.items.length, replayed: 0, errors: [] }),
    ),
    finish: vi.fn<ImportApi['finish']>(() => of(undefined)),
    undo: vi.fn(),
  };
  const recent = { load: vi.fn(async () => undefined), undo: vi.fn(async () => true) };
  const navigate = vi.fn(async () => true);
  const refresh = () => ({ refresh: vi.fn(async () => undefined) });
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: IMPORT_API, useValue: api },
      { provide: RecentImportsStore, useValue: recent },
      { provide: Router, useValue: { navigate } },
      { provide: FoldersStore, useValue: { ...refresh(), entities: signal([]), load: vi.fn() } },
      { provide: UserSettingsStore, useValue: { shownColour: (colour: string) => colour } },
      { provide: TagsStore, useValue: refresh() },
      { provide: PinsStore, useValue: refresh() },
      { provide: TrashStore, useValue: refresh() },
      { provide: LinksStore, useValue: { refresh: vi.fn() } },
      { provide: TabSyncService, useValue: { post: vi.fn() } },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ],
  });
  await loadEnglish();
  const ref = TestBed.inject(DialogService).open(ImportDialogComponent, { size: DIALOG_SIZE.Md });
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
  const button = (text: string) => loader.getHarness(UiButtonHarness.with({ text }));
  const maybeButton = (text: string) => loader.getHarnessOrNull(UiButtonHarness.with({ text }));
  const until = (check: () => Promise<void>) =>
    vi.waitFor(async () => {
      TestBed.tick();
      await check();
    });
  return { api, recent, navigate, closed, loader, dialog, button, maybeButton, until };
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
    el.replaceChildren();
  });
});

describe('ImportDialogComponent', () => {
  it('opens on the source step with the browser source and a drop zone', async () => {
    const { loader, dialog } = await setup();
    const zone = await loader.getHarness(UiDropZoneHarness);

    expect(await dialog.getTitle()).toBe('Import links');
    expect(await dialog.getBodyText()).toContain('Browser bookmarks');
    expect(await zone.getLabel()).toBe('Drop the file here or');
    expect(await zone.getActionLabel()).toBe('choose it');
    expect(await zone.getHint()).toContain('Export bookmarks');
    expect(await zone.isInvalid()).toBe(false);
  });

  it('moves to the review step with the file name as the title when a file is dropped', async () => {
    const { loader, dialog, until, api } = await setup();
    const zone = await loader.getHarness(UiDropZoneHarness);

    await zone.dropFile(bookmarks());

    await until(async () => {
      expect(await dialog.getTitle()).toBe('my-bookmarks.html');
    });
    expect(api.check).toHaveBeenCalledTimes(1);
    expect(await dialog.getBodyText()).toContain('Put them into');
  });

  it('shows the problem and marks the zone invalid for a file that is not bookmarks', async () => {
    const { loader, dialog, until } = await setup();
    const zone = await loader.getHarness(UiDropZoneHarness);

    await zone.dropFile(new File(['{}'], 'data.html'));

    await until(async () => {
      expect(await zone.isInvalid()).toBe(true);
    });
    expect(await dialog.getTitle()).toBe('Import links');
    expect(await dialog.getBodyText()).toContain('This is not a bookmarks file.');
  });

  it('shows the size limit of a too-big file in megabytes', async () => {
    const { loader, dialog, until } = await setup();
    const zone = await loader.getHarness(UiDropZoneHarness);
    const big = bookmarks();
    Object.defineProperty(big, 'size', { value: IMPORT_LIMIT.FileBytesMax + 1 });

    await zone.dropFile(big);

    await until(async () => {
      expect(await dialog.getBodyText()).toContain('This file is larger than 50 MB.');
    });
  });

  it('shows Back and "Import N links" in the review footer and goes back to the source', async () => {
    const { loader, dialog, until, button } = await setup();
    await (await loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await until(async () => {
      expect(await dialog.getTitle()).toBe('my-bookmarks.html');
    });

    const importButton = await button('Import 3 links');
    expect(await importButton.isDisabled()).toBe(false);
    await (await button('Back')).click();

    await until(async () => {
      expect(await dialog.getTitle()).toBe('Import links');
    });
    expect(await loader.getHarnessOrNull(UiDropZoneHarness)).not.toBeNull();
  });

  it('imports and ends on the summary with Undo import and Open the folder', async () => {
    const { loader, dialog, until, button, api, navigate, closed } = await setup();
    await (await loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await until(async () => {
      expect(await dialog.getTitle()).toBe('my-bookmarks.html');
    });

    await (await button('Import 3 links')).click();

    await until(async () => {
      expect(await dialog.getBodyText()).toContain('3 links imported');
    });
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(await dialog.getBodyText()).toContain('In “Imported bookmarks”. 2 folders.');
    expect(await (await button('Undo import')).isDisabled()).toBe(false);

    await (await button('Open the folder')).click();

    expect(navigate).toHaveBeenCalledWith(['/', 'folders', 'target1']);
    await vi.waitFor(() => expect(closed).toHaveBeenCalled());
  });

  it('undoes the import from the summary and closes the dialog', async () => {
    const { loader, dialog, until, button, recent, closed } = await setup();
    await (await loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await until(async () => {
      expect(await dialog.getTitle()).toBe('my-bookmarks.html');
    });
    await (await button('Import 3 links')).click();
    await until(async () => {
      expect(await dialog.getBodyText()).toContain('3 links imported');
    });

    await (await button('Undo import')).click();

    expect(recent.undo).toHaveBeenCalledWith('imp1', 3);
    await vi.waitFor(() => expect(closed).toHaveBeenCalled());
  });

  it('keeps the dialog open when the undo is not done', async () => {
    const { loader, dialog, until, button, recent, closed } = await setup();
    recent.undo.mockResolvedValue(false);
    await (await loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await until(async () => {
      expect(await dialog.getTitle()).toBe('my-bookmarks.html');
    });
    await (await button('Import 3 links')).click();
    await until(async () => {
      expect(await dialog.getBodyText()).toContain('3 links imported');
    });

    await (await button('Undo import')).click();

    expect(recent.undo).toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
    expect(await dialog.getBodyText()).toContain('3 links imported');
  });

  it('offers "Open Unsorted" and no Undo when nothing was created', async () => {
    const { loader, dialog, until, button, maybeButton, api, navigate } = await setup();
    api.start.mockReturnValue(of({ id: 'imp1', targetFolderId: null, folders: [] }));
    api.addLinks.mockReturnValue(throwError(() => new Error('network')));
    await (await loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await until(async () => {
      expect(await dialog.getTitle()).toBe('my-bookmarks.html');
    });

    await (await button('Import 3 links')).click();

    await until(async () => {
      expect(await dialog.getBodyText()).toContain('3 could not be saved.');
    });
    expect(await maybeButton('Undo import')).toBeNull();
    await (await button('Open Unsorted')).click();
    expect(navigate).toHaveBeenCalledWith(['/', 'unsorted']);
  });

  it('shows the failure and goes back to the review with Back when the start fails', async () => {
    const { loader, dialog, until, button, api } = await setup();
    api.start.mockReturnValue(throwError(() => mockHttpError(500)));
    await (await loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await until(async () => {
      expect(await dialog.getTitle()).toBe('my-bookmarks.html');
    });
    await (await button('Import 3 links')).click();

    await until(async () => {
      expect(await dialog.getBodyText()).toContain(
        'The import could not start, nothing was saved.',
      );
    });
    await (await button('Back')).click();

    await until(async () => {
      expect(await dialog.getBodyText()).toContain('Put them into');
    });
  });

  it('has no axe violations on the source and review steps', async () => {
    const { loader, dialog, until } = await setup();
    const container = () => document.querySelector<HTMLElement>('.cdk-dialog-container');
    expect(await axeViolations(container() as HTMLElement)).toEqual([]);

    await (await loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await until(async () => {
      expect(await dialog.getTitle()).toBe('my-bookmarks.html');
    });

    expect(await axeViolations(container() as HTMLElement)).toEqual([]);
  });
});
