import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Router } from '@angular/router';
import { IMPORT_LIMIT, type AiUsage, type ImportLinksResponse } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService, ToastService } from '@shelfmark/ui';
import { UiButtonHarness, UiDialogHarness, UiDropZoneHarness } from '@shelfmark/ui/testing';
import { of, Subject, throwError } from 'rxjs';
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
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
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
    get: vi.fn(),
    groups: vi.fn<ImportApi['groups']>(() =>
      of({
        groups: [
          { key: 'g1', name: 'Websites', folderId: null, linkIndexes: [0, 1] },
          { key: 'g2', name: 'Reading', folderId: 'existing', linkIndexes: [2] },
        ],
        rest: [],
        charged: 3,
      }),
    ),
    releaseGroups: vi.fn<ImportApi['releaseGroups']>(() => of(undefined)),
    check: vi.fn<ImportApi['check']>(() => of({ saved: [], room: 10_000 })),
    start: vi.fn<ImportApi['start']>(() =>
      of({ id: 'imp1', targetFolderId: 'target1', folders: [{ key: 'f1', id: 'folder1' }] }),
    ),
    addLinks: vi.fn<ImportApi['addLinks']>((_id, body) =>
      of<ImportLinksResponse>({ created: body.items.length, replayed: 0, errors: [] }),
    ),
    finish: vi.fn<ImportApi['finish']>(() => of(undefined)),
    undo: vi.fn(),
  };
  const recent = {
    load: vi.fn(async () => undefined),
    undo: vi.fn(async () => true),
    items: signal([]),
    undoing: signal(null),
  };
  const ai = {
    load: vi.fn(async () => undefined),
    refresh: vi.fn(async () => undefined),
    isOn: signal(false),
    providerUnavailable: signal(false),
    usage: signal<AiUsage | null>(null),
  };
  const navigate = vi.fn(async () => true);
  const refresh = () => ({ refresh: vi.fn(async () => undefined) });
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: IMPORT_API, useValue: api },
      { provide: RecentImportsStore, useValue: recent },
      { provide: Router, useValue: { navigate } },
      {
        provide: FoldersStore,
        useValue: { ...refresh(), entities: signal([]), entityMap: signal({}), load: vi.fn() },
      },
      { provide: AiSettingsStore, useValue: ai },
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
  return { api, recent, ai, navigate, closed, loader, dialog, button, maybeButton, until };
}

/** The native radio or checkbox of the label that holds `text` (no harness exists for them). */
function control(kind: 'radio' | 'checkbox', text: string): HTMLInputElement {
  const label = Array.from(document.querySelectorAll('label')).find(
    (item) => item.textContent?.includes(text) && item.querySelector(`input[type="${kind}"]`),
  );
  const input = label?.querySelector<HTMLInputElement>(`input[type="${kind}"]`);
  if (!input) throw new Error(`No ${kind} "${text}"`);
  return input;
}

function radioLabels(): string[] {
  return Array.from(document.querySelectorAll('input[type="radio"]')).map(
    (radio) => radio.closest('label')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  );
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
    expect(await zone.isStacked()).toBe(true);
    expect(await zone.getHeading()).toBe('Browser bookmarks');
    expect(await zone.getText()).toContain('HTML file from Chrome');
    expect(await zone.getLabel()).toBe('or drag the file here');
    expect(await zone.getActionLabel()).toBe('Choose file');
    expect(await zone.getHint()).toContain('.html, up to 50 MB and');
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
    expect(await dialog.getBodyText()).toContain('There are no bookmarks in this file.');
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
    api.addLinks.mockReturnValue(throwError(() => mockHttpError(400)));
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

  it('shows the short export help when asked, without leaving the dialog', async () => {
    const { dialog, until, button } = await setup();
    expect(await dialog.getBodyText()).not.toContain('Chrome and Edge');

    await (await button('How to export bookmarks from a browser')).click();

    await until(async () => {
      expect(await dialog.getBodyText()).toContain('Chrome and Edge');
    });
    expect(await dialog.getBodyText()).toContain('Firefox');
    expect(await dialog.getBodyText()).toContain('Safari');
  });

  it('says "Release to import" while a file is dragged over the dialog and imports a drop anywhere', async () => {
    const { loader, dialog, until } = await setup();
    const zone = await loader.getHarness(UiDropZoneHarness);
    const host = document.querySelector<HTMLElement>('ui-dialog') as HTMLElement;
    const drag = (type: string, files: File[] = []): void => {
      const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
      Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], files } });
      host.querySelector('.ui-dialog__title')?.dispatchEvent(event);
    };

    drag('dragenter');
    await until(async () => {
      expect(await zone.getLabel()).toBe('Release to import');
    });
    expect(await zone.isDragOver()).toBe(true);

    drag('drop', [bookmarks()]);
    await until(async () => {
      expect(await dialog.getTitle()).toBe('my-bookmarks.html');
    });
  });

  it('closes with Minimize while links are still being imported; the run goes on', async () => {
    const { loader, dialog, until, button, api, closed } = await setup();
    const batch = new Subject<ImportLinksResponse>();
    api.addLinks.mockReturnValue(batch);
    await (await loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await until(async () => {
      expect(await dialog.getTitle()).toBe('my-bookmarks.html');
    });
    await (await button('Import 3 links')).click();
    await until(async () => {
      expect(await dialog.getBodyText()).toContain('Importing links');
    });
    expect(await dialog.getBodyText()).toContain('You can keep working');

    await (await button('Minimize')).click();

    await vi.waitFor(() => expect(closed).toHaveBeenCalled());
    batch.next({ created: 3, replayed: 0, errors: [] });
    batch.complete();
  });

  describe('AI groups', () => {
    const USAGE: AiUsage = {
      linksUsed: 0,
      linksLimit: 100,
      resetsOn: '2026-12-01',
      backfillUsed: 0,
      backfillLimit: 5_000,
    };

    async function toReview() {
      const ctx = await setup();
      ctx.ai.isOn.set(true);
      ctx.ai.usage.set(USAGE);
      await (await ctx.loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
      await ctx.until(async () => {
        expect(await ctx.dialog.getTitle()).toBe('my-bookmarks.html');
      });
      return ctx;
    }

    it('offers the three folder choices, with the file as the default for a file with folders', async () => {
      await toReview();

      const labels = radioLabels();
      expect(labels).toHaveLength(3);
      expect(labels[0]).toContain('As in the file');
      expect(labels[0]).toContain('1 browser folder');
      expect(labels[1]).toContain('Let AI sort them by topic');
      expect(labels[1]).toContain('Uses 3 of 5,000 runs for existing links.');
      expect(labels[2]).toContain('No folders');
      expect(control('radio', 'As in the file').checked).toBe(true);
    });

    it('does not offer AI when it is off', async () => {
      const { ai, until } = await toReview();
      ai.isOn.set(false);

      await until(async () => {
        expect(radioLabels()).toHaveLength(2);
      });
      expect(radioLabels().join(' ')).not.toContain('Let AI');
    });

    it('groups, lets the user untick a group and imports with the ticked ones', async () => {
      const { dialog, until, button, api } = await toReview();
      control('radio', 'Let AI sort them by topic').click();
      await until(async () => {
        expect(await (await button('Group')).isDisabled()).toBe(false);
      });

      await (await button('Group')).click();

      await until(async () => {
        expect(await dialog.getBodyText()).toContain('2 groups for 3 links');
      });
      expect(api.groups).toHaveBeenCalledTimes(1);
      expect(await dialog.getBodyText()).toContain('already there');
      control('checkbox', 'Websites').click();
      await until(async () => {
        expect(await (await button('Import 3 links')).isDisabled()).toBe(false);
      });
      control('checkbox', 'Websites').click();
      await (await button('Import and create 1 folder')).click();

      await until(async () => {
        expect(await dialog.getBodyText()).toContain('3 links imported');
      });
      expect(api.start.mock.calls[0][0]).toMatchObject({
        aiPass: true,
        folders: [{ key: 'g1', parentKey: null, name: 'Websites' }],
      });
      expect(await dialog.getBodyText()).toContain('In 2 folders, 1 of them new.');
    });

    it('offers to import without groups after a failed grouping', async () => {
      const { dialog, until, button, api } = await toReview();
      api.groups.mockReturnValue(throwError(() => mockHttpError(503)));
      control('radio', 'Let AI sort them by topic').click();
      await until(async () => {
        expect(await (await button('Group')).isDisabled()).toBe(false);
      });
      await (await button('Group')).click();

      await until(async () => {
        expect(await dialog.getBodyText()).toContain('could not be grouped right now');
      });
      await (await button('Import 3 links')).click();

      await until(async () => {
        expect(await dialog.getBodyText()).toContain('3 links imported');
      });
      expect(api.start.mock.calls[0][0].aiPass).toBeUndefined();
    });

    async function toGroups() {
      const ctx = await toReview();
      control('radio', 'Let AI sort them by topic').click();
      await ctx.until(async () => {
        expect(await (await ctx.button('Group')).isDisabled()).toBe(false);
      });
      await (await ctx.button('Group')).click();
      await ctx.until(async () => {
        expect(await ctx.dialog.getBodyText()).toContain('2 groups for 3 links');
      });
      return ctx;
    }

    it('gives the grouping units back on Back', async () => {
      const { api, button } = await toGroups();

      await (await button('Back')).click();

      expect(api.releaseGroups).toHaveBeenCalledTimes(1);
    });

    it('gives the grouping units back when the dialog closes without an import', async () => {
      const { api, dialog, closed } = await toGroups();

      await dialog.close();

      await vi.waitFor(() => expect(closed).toHaveBeenCalled());
      expect(api.releaseGroups).toHaveBeenCalledTimes(1);
    });

    it('keeps the units once the import started with the groups', async () => {
      const { api, dialog, until, button } = await toGroups();
      await (await button('Import and create 1 folder')).click();
      await until(async () => {
        expect(await dialog.getBodyText()).toContain('3 links imported');
      });

      await dialog.close();

      expect(api.releaseGroups).not.toHaveBeenCalled();
    });

    it('gives the units back when the user imports without groups after a failed grouping', async () => {
      const { api, until, button, dialog } = await toReview();
      api.groups.mockReturnValue(throwError(() => mockHttpError(503)));
      control('radio', 'Let AI sort them by topic').click();
      await until(async () => {
        expect(await (await button('Group')).isDisabled()).toBe(false);
      });
      await (await button('Group')).click();
      await until(async () => {
        expect(await dialog.getBodyText()).toContain('could not be grouped right now');
      });

      await (await button('Import 3 links')).click();

      expect(api.releaseGroups).toHaveBeenCalledTimes(1);
    });
  });
});
