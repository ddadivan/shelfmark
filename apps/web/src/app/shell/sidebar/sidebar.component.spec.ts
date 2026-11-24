import { LiveAnnouncer } from '@angular/cdk/a11y';
import { signal, type Provider } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideRouter, Router } from '@angular/router';
import { REDISCOVER_MODE, THEME_PREFERENCE } from '@shelfmark/contracts';
import { THEME } from '@shelfmark/ui';
import { ThemeService } from '../../core/theme/theme.service';
import { THEME_STORAGE_KEY } from '../../core/theme/models/theme-storage-key.const';
import { MOCK_ID, MOCK_LINKS, MOCK_NAME } from '@shelfmark/contracts/testing';
import { UiButtonHarness, UiMenuHarness, UiTreeItemHarness } from '@shelfmark/ui/testing';
import axe from 'axe-core';
import { FoldersStore } from '../../stores/folders.store';
import { TrashStore } from '../../stores/trash.store';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { MockLibraryData } from '../../features/links/mock/mock-library-data';
import { MockFoldersApi } from '../../features/links/mock/mock-folders.api';
import { MockLinksApi } from '../../features/links/mock/mock-links.api';
import { MockTagsApi } from '../../features/links/mock/mock-tags.api';
import { FOLDERS_API } from '../../features/links/models/folders-api.const';
import { LINKS_API } from '../../features/links/models/links-api.const';
import { TAGS_API } from '../../features/links/models/tags-api.const';
import { MockTrashApi } from '../../features/trash/mock/mock-trash.api';
import { TRASH_API } from '../../features/trash/models/trash-api.const';
import { MockUserSettingsApi } from '../../features/settings/mock/mock-user-settings.api';
import { MOCK_LIBRARY_SETTINGS_STORAGE_KEY } from '../../features/settings/models/mock-library-settings-storage-key.const';
import { USER_SETTINGS_API } from '../../features/settings/models/user-settings-api.const';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { ExportDialogService } from '../../features/export/services/export-dialog.service';
import { ImportDialogService } from '../../features/import/services/import-dialog.service';
import { WhatsNewStore } from '../../features/changelog/services/whats-new.store';
import { ViewportService } from '../../core/layout/viewport.service';
import { FeedbackDialogService } from '../../features/feedback/services/feedback-dialog.service';
import { ExtensionBannerService } from '../../core/browser-extension/extension-banner.service';
import { REDISCOVER_API } from '../../features/rediscover/models/rediscover-api.const';
import { of } from 'rxjs';
import { SidebarComponent } from './sidebar.component';
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from './models/sidebar-collapsed-storage-key.const';

async function setup(url = '/links', waitForFolders = true, extra: Provider[] = []) {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([
        { path: 'links', children: [] },
        { path: 'unsorted', children: [] },
        { path: 'favorites', children: [] },
        { path: 'recent', children: [] },
        { path: 'trash', children: [] },
        { path: 'folders/:folderId', children: [] },
      ]),
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      { provide: TRASH_API, useClass: MockTrashApi },
      { provide: USER_SETTINGS_API, useClass: MockUserSettingsApi },
      ...extra,
    ],
  });
  await loadEnglish();
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  const fixture = TestBed.createComponent(SidebarComponent);
  if (!waitForFolders) {
    fixture.detectChanges();
    return { fixture, router, element: fixture.nativeElement as HTMLElement };
  }
  await fixture.whenStable();
  await vi.waitFor(() => {
    TestBed.tick();
    expect(TestBed.inject(FoldersStore).loaded()).toBe(true);
  });
  await fixture.whenStable();
  return { fixture, router, element: fixture.nativeElement as HTMLElement };
}

function rows(element: HTMLElement): HTMLElement[] {
  return [...element.querySelectorAll<HTMLElement>('[role="treeitem"]')];
}

function row(element: HTMLElement, name: string): HTMLElement {
  const found = rows(element).find((item) => item.textContent?.includes(name));
  if (!found) {
    throw new Error(`no row ${name}`);
  }
  return found;
}

/** Every tree row of the sidebar (the main tree and the Trash tree in the footer), in order. */
async function treeRows(fixture: ComponentFixture<unknown>): Promise<UiTreeItemHarness[]> {
  return TestbedHarnessEnvironment.loader(fixture).getAllHarnesses(UiTreeItemHarness);
}

async function rowNames(fixture: ComponentFixture<unknown>): Promise<string[]> {
  return Promise.all((await treeRows(fixture)).map((item) => item.getName()));
}

async function treeRow(
  fixture: ComponentFixture<unknown>,
  name: string,
): Promise<UiTreeItemHarness> {
  return TestbedHarnessEnvironment.loader(fixture).getHarness(UiTreeItemHarness.with({ name }));
}

/** The "Folders" section heading, `null` before the section shows. */
function foldersHeading(element: HTMLElement): string | null {
  return element.querySelector('#sidebar-folders-heading')?.textContent?.trim() ?? null;
}

async function foldersToggle(fixture: ComponentFixture<unknown>): Promise<UiButtonHarness> {
  return TestbedHarnessEnvironment.loader(fixture).getHarness(
    UiButtonHarness.with({ label: 'Show or hide folders' }),
  );
}

describe('SidebarComponent', () => {
  afterEach(() => {
    localStorage.removeItem(MOCK_LIBRARY_SETTINGS_STORAGE_KEY);
    localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  });

  it('shows "N forgotten" on the Recently opened row while some wait (#512)', async () => {
    const block = {
      week: '2026-W47',
      mode: REDISCOVER_MODE.Forgotten,
      theme: null,
      items: [MOCK_LINKS[0], MOCK_LINKS[1], MOCK_LINKS[2]],
    };
    const { element } = await setup('/links', true, [
      { provide: REDISCOVER_API, useValue: { getBlock: () => of(block) } },
    ]);
    await vi.waitFor(() => {
      TestBed.tick();
      expect(row(element, 'Recently opened').textContent).toContain('3 forgotten');
    });
    expect(row(element, 'Recently opened').querySelector('.ui-tree__count--note')).not.toBeNull();
  });

  it('shows no note on Recently opened without forgotten links', async () => {
    const { element } = await setup();
    expect(row(element, 'Recently opened').querySelector('.ui-tree__count')).toBeNull();
  });

  describe('the "Data & help" row (#387)', () => {
    async function openMenu(fixture: ComponentFixture<unknown>): Promise<UiMenuHarness> {
      await (await treeRow(fixture, 'Data & help')).select();
      await fixture.whenStable();
      return TestbedHarnessEnvironment.documentRootLoader(fixture).getHarness(
        UiMenuHarness.with({ label: 'Data and help' }),
      );
    }

    function stubWhatsNew(pending: boolean) {
      const open = vi.fn(() => Promise.resolve());
      TestBed.overrideProvider(WhatsNewStore, { useValue: { pending: signal(pending), open } });
      return open;
    }

    it('replaces "What\'s new" and "Send feedback"; Trash stays its own row below', async () => {
      stubWhatsNew(false);
      const { fixture } = await setup();
      const names = await rowNames(fixture);

      expect(names.slice(-2)).toEqual(['Data & help', 'Trash']);
      expect(names).not.toContain('Send feedback');
      expect(names).not.toContain("What's new");
    });

    it("opens a menu with Import links, Export, What's new and Send feedback", async () => {
      stubWhatsNew(false);
      const { fixture } = await setup();
      const menu = await openMenu(fixture);

      expect(await menu.isOpen()).toBe(true);
      const items = await Promise.all((await menu.getItems()).map((item) => item.getText()));
      expect(items).toEqual(['Import links', 'Export', "What's new", 'Send feedback']);
    });

    it("opens the import dialog, the export dialog, What's new and the feedback dialog", async () => {
      const whatsNew = stubWhatsNew(false);
      const { fixture } = await setup();
      const importOpen = vi.spyOn(TestBed.inject(ImportDialogService), 'open').mockReturnValue();
      const exportOpen = vi.spyOn(TestBed.inject(ExportDialogService), 'open').mockReturnValue();
      const feedbackOpen = vi
        .spyOn(TestBed.inject(FeedbackDialogService), 'open')
        .mockReturnValue();

      await (await openMenu(fixture)).clickItem({ text: 'Import links' });
      await vi.waitFor(() => {
        expect(importOpen).toHaveBeenCalledTimes(1);
      });
      await (await openMenu(fixture)).clickItem({ text: 'Export' });
      await vi.waitFor(() => {
        expect(exportOpen).toHaveBeenCalledTimes(1);
      });
      await (await openMenu(fixture)).clickItem({ text: /What's new/ });
      expect(whatsNew).toHaveBeenCalledTimes(1);
      await (await openMenu(fixture)).clickItem({ text: 'Send feedback' });
      expect(feedbackOpen).toHaveBeenCalledTimes(1);
    });

    it('shows the dot on the row and the badge on "What\'s new" while a release is unseen', async () => {
      stubWhatsNew(true);
      const { fixture, element } = await setup();

      expect(element.querySelector('[data-ui-tree-id="data"] .ui-tree__dot')).not.toBeNull();
      const menu = await openMenu(fixture);
      const item = (await menu.getItems({ text: /What's new/ }))[0];
      expect(await item.getText()).toContain('new');
    });

    it('shows no dot and no badge when everything is seen', async () => {
      stubWhatsNew(false);
      const { fixture, element } = await setup();

      expect(element.querySelector('[data-ui-tree-id="data"] .ui-tree__dot')).toBeNull();
      const menu = await openMenu(fixture);
      const item = (await menu.getItems({ text: /What's new/ }))[0];
      expect((await item.getText()).trim()).toBe("What's new");
    });

    it('opens on ArrowUp with the last item focused, and Escape gives focus back to the row', async () => {
      stubWhatsNew(false);
      const { fixture, element } = await setup();
      const dataRow = element.querySelector<HTMLElement>('[data-ui-tree-id="data"]');
      dataRow?.focus();
      dataRow?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await fixture.whenStable();
      const menu = await TestbedHarnessEnvironment.documentRootLoader(fixture).getHarness(
        UiMenuHarness.with({ label: 'Data and help' }),
      );

      expect(await menu.isOpen()).toBe(true);
      await vi.waitFor(async () => {
        expect(await menu.getFocusedItemText()).toBe('Send feedback');
      });
      await menu.sendKeys(TestKey.ESCAPE);
      expect(await menu.isOpen()).toBe(false);
      expect(document.activeElement).toBe(dataRow);
    });
  });

  it('offers "Get the extension" once the library banner was closed, opening the store (#455)', async () => {
    const entryShown = signal(false);
    TestBed.overrideProvider(ExtensionBannerService, {
      useValue: { entryShown, storeUrl: 'https://store.example/shelfmark' },
    });
    const { fixture } = await setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    expect(await rowNames(fixture)).not.toContain('Get the extension');

    entryShown.set(true);
    await fixture.whenStable();
    await (await treeRow(fixture, 'Get the extension')).select();

    expect(open).toHaveBeenCalledWith(
      'https://store.example/shelfmark',
      '_blank',
      'noopener,noreferrer',
    );
    open.mockRestore();
  });

  describe('Theme row (Shelf)', () => {
    afterEach(() => {
      localStorage.removeItem(THEME_STORAGE_KEY);
    });

    it('is the first row of the footer, above Data & help', async () => {
      const { fixture } = await setup();
      const names = await rowNames(fixture);
      expect(names).toContain('Theme');
      expect(names.indexOf('Theme')).toBeLessThan(names.indexOf('Data & help'));
    });

    it('switches to Dark and saves it on the account when the theme is light', async () => {
      const { fixture } = await setup();
      const save = vi.spyOn(TestBed.inject(UserSettingsStore), 'setAppearance');
      vi.spyOn(TestBed.inject(ThemeService), 'resolved').mockReturnValue(THEME.Light);
      await (await treeRow(fixture, 'Theme')).select();
      expect(save).toHaveBeenCalledExactlyOnceWith({ theme: THEME_PREFERENCE.Dark });
    });

    it('switches to Light when the theme is dark', async () => {
      const { fixture } = await setup();
      const save = vi.spyOn(TestBed.inject(UserSettingsStore), 'setAppearance');
      vi.spyOn(TestBed.inject(ThemeService), 'resolved').mockReturnValue(THEME.Dark);
      await (await treeRow(fixture, 'Theme')).select();
      expect(save).toHaveBeenCalledExactlyOnceWith({ theme: THEME_PREFERENCE.Light });
    });

    it('is left out on a phone (the You page has Appearance)', async () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: ViewportService,
            useValue: {
              phone: signal(true),
              compact: signal(true),
              desktop: signal(false),
              wide: signal(false),
            },
          },
        ],
      });
      const { fixture } = await setup();
      expect(await rowNames(fixture)).not.toContain('Theme');
    });
  });

  it('leaves the "Data & help" row out on a phone (the You list has the entries)', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ViewportService,
          useValue: {
            phone: signal(true),
            compact: signal(true),
            desktop: signal(false),
            wide: signal(false),
          },
        },
      ],
    });
    const { element, fixture } = await setup();

    expect(await rowNames(fixture)).not.toContain('Data & help');
    expect(element.textContent).not.toContain('Data & help');
    // The sections never fold there (#556), whatever this device stored.
    expect(
      await TestbedHarnessEnvironment.loader(fixture).getAllHarnesses(
        UiButtonHarness.with({ label: /^Show or hide/ }),
      ),
    ).toEqual([]);
  });

  it('drops the link counts when "Show folder counts" is off (#284)', async () => {
    localStorage.setItem(
      MOCK_LIBRARY_SETTINGS_STORAGE_KEY,
      JSON.stringify({ showFolderCounts: false }),
    );
    const { fixture } = await setup();
    await vi.waitFor(async () => {
      expect(TestBed.inject(UserSettingsStore).countsShown()).toBe(false);
      expect(await (await treeRow(fixture, 'All links')).getCount()).toBeNull();
    });
    expect(await (await treeRow(fixture, MOCK_NAME.FolderReading)).getCount()).toBeNull();
    const counts = await Promise.all((await treeRows(fixture)).map((item) => item.getCount()));
    expect(counts.every((count) => count === null)).toBe(true);
  });

  it('shows no empty Folders or Tags section before the first answer', async () => {
    const { element, fixture } = await setup('/links', false);
    expect(foldersHeading(element)).toBeNull();
    expect(element.querySelector('app-sidebar-tags')).toBeNull();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(foldersHeading(element)).toBe('Folders');
      expect(element.querySelector('app-sidebar-tags')).not.toBeNull();
    });
  });

  it('lists the fixed rows with their counts, then the folders', async () => {
    const { element, fixture } = await setup();

    const names = await rowNames(fixture);
    expect(names.slice(0, 5)).toEqual([
      'All links',
      'Unsorted',
      'Favorites',
      'Today',
      'Recently opened',
    ]);
    // Trash is the last row, alone under a divider (its own tree), and has no count while empty.
    expect(names.at(-1)).toBe('Trash');
    expect(element.querySelector('.sidebar__footer [role="tree"]')).not.toBeNull();
    expect(element.textContent).not.toContain('Pinned');
    expect(names).toContain(MOCK_NAME.FolderReading);
    const counts = await Promise.all(
      (await treeRows(fixture)).slice(0, 3).map((item) => item.getCount()),
    );
    expect(counts.every((count) => (count ?? 0) > 0)).toBe(true);
    expect(foldersHeading(element)).toBe('Folders');
  });

  it('shows folders with the filled folder glyph, graphite without a colour (Shelf)', async () => {
    const { element } = await setup();

    const reading = row(element, MOCK_NAME.FolderReading);
    expect(reading.querySelector('ui-folder-icon')).toBeNull();
    expect(reading.querySelector('ui-icon.ui-tree__folder')).not.toBeNull();
    expect(reading.hasAttribute('data-ui-folder-colour')).toBe(false);
  });

  it('tints only the rows of highlighted coloured folders, and the open one too (#440)', async () => {
    const { element, router } = await setup();
    const store = TestBed.inject(FoldersStore);
    const id = MOCK_ID.FolderReading;

    expect(row(element, MOCK_NAME.FolderReading).hasAttribute('data-ui-folder-highlight')).toBe(
      false,
    );
    await store.setStyle(id, { colour: 'rose', highlighted: true });
    TestBed.tick();
    const lit = row(element, MOCK_NAME.FolderReading);
    expect(lit.hasAttribute('data-ui-folder-highlight')).toBe(true);
    expect(lit.hasAttribute('data-ui-folder-colour')).toBe(true);
    expect(lit.hasAttribute('aria-current')).toBe(false);
    expect(row(element, 'All links').hasAttribute('data-ui-folder-highlight')).toBe(false);

    await router.navigateByUrl(`/folders/${id}`);
    TestBed.tick();
    expect(row(element, MOCK_NAME.FolderReading).hasAttribute('aria-current')).toBe(true);
    expect(row(element, MOCK_NAME.FolderReading).hasAttribute('data-ui-folder-highlight')).toBe(
      true,
    );

    await store.setStyle(id, { highlighted: false });
    TestBed.tick();
    expect(row(element, MOCK_NAME.FolderReading).hasAttribute('data-ui-folder-highlight')).toBe(
      false,
    );
  });

  it('opens the Recently opened page from its row and marks it', async () => {
    const { fixture, router } = await setup();

    await (await treeRow(fixture, 'Recently opened')).select();

    expect(router.url).toBe('/recent');
    expect(await (await treeRow(fixture, 'Recently opened')).isCurrent()).toBe(true);
  });

  it('opens Trash from its row, marks it on /trash and counts what is in it', async () => {
    const { fixture, router } = await setup();
    const trash = await treeRow(fixture, 'Trash');
    expect(await trash.getCount()).toBeNull();

    await trash.select();

    expect(router.url).toBe('/trash');
    expect(await trash.isCurrent()).toBe(true);
    expect(await (await treeRow(fixture, 'All links')).isCurrent()).toBe(false);
  });

  it('shows the number of items in Trash on its row', async () => {
    const { fixture } = await setup();
    const data = TestBed.inject(MockLibraryData);
    const trash = TestBed.inject(TrashStore);
    await trash.load();

    data.trashLink(data.links[0]);
    data.trashLink(data.links[0]);
    await trash.refresh();

    expect(await (await treeRow(fixture, 'Trash')).getCount()).toBe(2);
  });

  it('heads the card with the logo only when asked', async () => {
    const { fixture, element } = await setup();
    expect(element.querySelector('.sidebar__logo')).toBeNull();

    fixture.componentRef.setInput('showLogo', true);
    await fixture.whenStable();
    expect(element.querySelector('.sidebar__logo ui-logo')).not.toBeNull();
  });

  it('sends the logo to All links through the router, with no page reload', async () => {
    const { fixture, router, element } = await setup('/unsorted');
    fixture.componentRef.setInput('showLogo', true);
    await fixture.whenStable();
    const logo = element.querySelector<HTMLAnchorElement>('a.sidebar__logo');

    // A router link renders a real href and handles the click itself.
    expect(logo?.getAttribute('href')).toBe('/links');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    logo?.dispatchEvent(click);
    await fixture.whenStable();

    expect(click.defaultPrevented).toBe(true);
    expect(router.url).toBe('/links');
  });

  it('marks the row of the current URL', async () => {
    const { fixture } = await setup('/unsorted');

    expect(await (await treeRow(fixture, 'Unsorted')).isCurrent()).toBe(true);
    expect(await (await treeRow(fixture, 'All links')).isCurrent()).toBe(false);
  });

  it('opens the folders above the current folder', async () => {
    const { fixture } = await setup(`/folders/${MOCK_ID.FolderAngular}`);

    expect(await (await treeRow(fixture, MOCK_NAME.FolderReading)).isExpanded()).toBe(true);
    expect(await (await treeRow(fixture, MOCK_NAME.FolderAngular)).isCurrent()).toBe(true);
  });

  it('navigates when a row is chosen', async () => {
    const { fixture, router } = await setup();

    await (await treeRow(fixture, 'Favorites')).select();
    expect(router.url).toBe('/favorites');

    await (await treeRow(fixture, MOCK_NAME.FolderReading)).select();
    expect(router.url).toBe(`/folders/${MOCK_ID.FolderReading}`);
  });

  it('moves through the rows with the arrow keys and opens the focused row with Enter', async () => {
    const { fixture, router } = await setup();

    const all = await treeRow(fixture, 'All links');
    await all.focus();
    await all.sendKeys(TestKey.DOWN_ARROW);
    const unsorted = await treeRow(fixture, 'Unsorted');
    expect(await unsorted.isFocused()).toBe(true);

    await unsorted.sendKeys(TestKey.ENTER);
    await fixture.whenStable();
    expect(router.url).toBe('/unsorted');
  });

  it('offers the folder actions in a menu from the "..." button', async () => {
    const { fixture } = await setup();

    const reading = await treeRow(fixture, MOCK_NAME.FolderReading);
    expect(await reading.getMenuButtonLabel()).toBe(`Actions for ${MOCK_NAME.FolderReading}`);
    await reading.openMenu();

    const menu = await TestbedHarnessEnvironment.documentRootLoader(fixture).getHarness(
      UiMenuHarness.with({ label: 'Folder actions' }),
    );
    expect(await menu.isOpen()).toBe(true);
    const items = await Promise.all((await menu.getItems()).map((item) => item.getText()));
    expect(items).toEqual([
      'New subfolder',
      'Add link here',
      'Rename',
      'Folder settings…',
      'Move to…',
      'Pin to sidebar',
      'Share…',
      'Delete folder…',
    ]);
  });

  it('has a "New folder" "+" icon button in the Folders heading row, and no such row', async () => {
    const { element, fixture } = await setup();

    const button = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      UiButtonHarness.with({ label: 'New folder' }),
    );
    expect(await button.getText()).toBe('');
    expect(element.textContent).not.toContain('New folder');
  });

  it('folds the folder tree under its heading and remembers it on this device (#556)', async () => {
    const { element, fixture } = await setup();
    const toggle = await foldersToggle(fixture);
    const body = element.querySelector('#sidebar-folders-body');
    expect(await toggle.isExpanded()).toBe(true);
    expect(body?.classList).not.toContain('is-collapsed');

    await toggle.click();
    expect(await toggle.isExpanded()).toBe(false);
    expect(body?.classList).toContain('is-collapsed');
    // Tags start folded (Shelf), so they stay in the list.
    expect(JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) ?? '[]')).toEqual([
      'tags',
      'folders',
    ]);
    // The rows stay rendered (they keep their open folders) and the "+" stays.
    expect(row(element, MOCK_NAME.FolderReading)).toBeTruthy();

    await toggle.click();
    expect(await toggle.isExpanded()).toBe(true);
    expect(JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) ?? '[]')).toEqual([
      'tags',
    ]);
  });

  it('starts folded from the stored choice and "New folder" opens it again (#556)', async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, JSON.stringify(['folders', 'tags']));
    const { element, fixture } = await setup();
    expect(await (await foldersToggle(fixture)).isExpanded()).toBe(false);
    expect(element.querySelector('#sidebar-folders-body')?.classList).toContain('is-collapsed');

    await (
      await TestbedHarnessEnvironment.loader(fixture).getHarness(
        UiButtonHarness.with({ label: 'New folder' }),
      )
    ).click();
    expect(await (await foldersToggle(fixture)).isExpanded()).toBe(true);
    expect(JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) ?? '[]')).toEqual([
      'tags',
    ]);
  });

  it('moves a folder among its siblings with Alt+ArrowUp, says so and saves it (#314)', async () => {
    const { element, fixture } = await setup();
    const folders = TestBed.inject(FoldersStore);
    await folders.create('Zeta', null);
    await fixture.whenStable();
    const announce = vi.spyOn(TestBed.inject(LiveAnnouncer), 'announce');
    const zeta = row(element, 'Zeta');
    zeta.focus();
    zeta.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(announce).toHaveBeenLastCalledWith('Moved up, position 1 of 2', 'polite');
    await vi.waitFor(() => {
      TestBed.tick();
      expect(folders.tree().map((node) => node.folder.name)).toEqual([
        'Zeta',
        MOCK_NAME.FolderReading,
      ]);
    });
    // The mock API kept the order: a reload shows it too.
    await folders.refresh();
    expect(folders.tree()[0].folder.name).toBe('Zeta');
  });

  it('has no axe violations', async () => {
    const { element } = await setup();
    document.body.append(element);

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false } },
    });
    element.remove();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
