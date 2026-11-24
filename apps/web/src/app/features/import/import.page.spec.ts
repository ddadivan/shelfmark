import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Router } from '@angular/router';
import { type AiUsage, type ImportLinksResponse } from '@shelfmark/contracts';
import { ToastService } from '@shelfmark/ui';
import { UiButtonHarness, UiDropZoneHarness } from '@shelfmark/ui/testing';
import { of, throwError } from 'rxjs';
import { axeViolations } from '../../../testing/axe';
import { mockHttpError } from '../../core/api/mock-http-error';
import { TabSyncService } from '../../core/sync/tab-sync.service';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { PinsStore } from '../../stores/pins.store';
import { TagsStore } from '../../stores/tags.store';
import { TrashStore } from '../../stores/trash.store';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { AiSettingsStore } from '../ai/services/ai-settings.store';
import ImportPage from './import.page';
import { IMPORT_API } from './models/import-api.const';
import type { ImportApi } from './models/import-api.interface';
import { RecentImportsStore } from './services/recent-imports.store';

const BOOKMARKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
<DT><H3>Dev</H3>
<DL><p>
<DT><A HREF="https://a.example/">A</A>
<DT><A HREF="https://b.example/">B</A>
</DL><p>
<DT><A HREF="https://c.example/">C</A>
</DL><p>`;

const USAGE: AiUsage = {
  linksUsed: 0,
  linksLimit: 100,
  resetsOn: '2026-12-01',
  backfillUsed: 0,
  backfillLimit: 5_000,
};

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
  const fixture: ComponentFixture<ImportPage> = TestBed.createComponent(ImportPage);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const element = fixture.nativeElement as HTMLElement;
  const button = (text: string) => loader.getHarness(UiButtonHarness.with({ text }));
  const text = () => element.textContent?.replace(/\s+/g, ' ') ?? '';
  const current = () =>
    element.querySelector('[aria-current="step"] .ui-stepper__name')?.textContent;
  const until = (check: () => void | Promise<void>) =>
    vi.waitFor(async () => {
      fixture.detectChanges();
      await check();
    });
  const control = (kind: 'radio' | 'checkbox', label: string): HTMLInputElement => {
    const found = [...element.querySelectorAll('label')].find(
      (item) => item.textContent?.includes(label) && item.querySelector(`input[type="${kind}"]`),
    );
    const input = found?.querySelector<HTMLInputElement>(`input[type="${kind}"]`);
    if (!input) throw new Error(`No ${kind} "${label}"`);
    return input;
  };
  return {
    api,
    recent,
    ai,
    navigate,
    fixture,
    loader,
    element,
    button,
    text,
    current,
    until,
    control,
  };
}

describe('ImportPage', () => {
  it('opens on Choose file with the steps, the drop zone and the help of one browser', async () => {
    const { loader, element, current, text } = await setup();
    expect(element.querySelector('h1')?.textContent).toContain('Import bookmarks');
    expect(text()).toContain('Nothing is saved until you confirm.');
    expect(current()).toBe('Choose file');
    const zone = await loader.getHarness(UiDropZoneHarness);
    expect(await zone.getActionLabel()).toBe('Choose file');
    expect(text()).toContain('How to get the file from');
    expect(element.querySelectorAll('app-import-help li')).toHaveLength(1);
    expect(await axeViolations(element)).toEqual([]);
  });

  it('checks a dropped file, goes back, and imports to the done card with Undo', async () => {
    const { loader, until, button, api, navigate, recent, current, text } = await setup();
    await (await loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await until(() => expect(current()).toBe('Check'));
    expect(text()).toContain('my-bookmarks.html');
    expect(api.check).toHaveBeenCalledTimes(1);

    await (await button('Back')).click();
    await until(() => expect(current()).toBe('Choose file'));

    await (await loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await until(() => expect(current()).toBe('Check'));
    await (await button('Import 3 links')).click();
    await until(() => expect(text()).toContain('3 links imported'));
    expect(api.start).toHaveBeenCalledTimes(1);

    await (await button('Open the folder')).click();
    expect(navigate).toHaveBeenCalledWith(['/', 'folders', 'target1']);

    await (await button('Undo import')).click();
    await until(() => expect(recent.undo).toHaveBeenCalledWith('imp1', 3));
    await until(() => expect(current()).toBe('Choose file'));
  });

  it('shows the problem of a file that is not bookmarks', async () => {
    const { loader, until, text } = await setup();
    await (await loader.getHarness(UiDropZoneHarness)).dropFile(new File(['{}'], 'data.html'));
    await until(() => expect(text()).toContain('There are no bookmarks in this file.'));
  });

  it('goes through the AI folders step and imports with the ticked groups', async () => {
    const ctx = await setup();
    ctx.ai.isOn.set(true);
    ctx.ai.usage.set(USAGE);
    await (await ctx.loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await ctx.until(() => expect(ctx.current()).toBe('Check'));
    ctx.control('radio', 'Let AI sort them by topic').click();
    await ctx.until(async () => {
      expect(await (await ctx.button('Group')).isDisabled()).toBe(false);
    });
    await (await ctx.button('Group')).click();
    await ctx.until(() => expect(ctx.current()).toBe('Folders'));
    await ctx.until(() => expect(ctx.text()).toContain('2 groups for 3 links'));

    await (await ctx.button('Import and create 1 folder')).click();
    await ctx.until(() => expect(ctx.text()).toContain('3 links imported'));
    expect(ctx.api.start.mock.calls[0]?.[0]).toMatchObject({ aiPass: true });

    ctx.fixture.destroy();
    expect(ctx.api.releaseGroups).not.toHaveBeenCalled();
  });

  it('gives the grouping units back when the page is left without an import', async () => {
    const ctx = await setup();
    ctx.ai.isOn.set(true);
    ctx.ai.usage.set(USAGE);
    await (await ctx.loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await ctx.until(() => expect(ctx.current()).toBe('Check'));
    ctx.control('radio', 'Let AI sort them by topic').click();
    await ctx.until(async () => {
      expect(await (await ctx.button('Group')).isDisabled()).toBe(false);
    });
    await (await ctx.button('Group')).click();
    await ctx.until(() => expect(ctx.text()).toContain('2 groups for 3 links'));

    ctx.fixture.destroy();
    expect(ctx.api.releaseGroups).toHaveBeenCalledTimes(1);
  });

  it('offers to import without groups after a failed grouping', async () => {
    const ctx = await setup();
    ctx.ai.isOn.set(true);
    ctx.ai.usage.set(USAGE);
    ctx.api.groups.mockReturnValue(throwError(() => mockHttpError(503)));
    await (await ctx.loader.getHarness(UiDropZoneHarness)).dropFile(bookmarks());
    await ctx.until(() => expect(ctx.current()).toBe('Check'));
    ctx.control('radio', 'Let AI sort them by topic').click();
    await ctx.until(async () => {
      expect(await (await ctx.button('Group')).isDisabled()).toBe(false);
    });
    await (await ctx.button('Group')).click();
    await ctx.until(() => expect(ctx.text()).toContain('could not be grouped right now'));
    await (await ctx.button('Import 3 links')).click();
    await ctx.until(() => expect(ctx.text()).toContain('3 links imported'));
    expect(ctx.api.start.mock.calls[0]?.[0].aiPass).toBeUndefined();
  });
});
