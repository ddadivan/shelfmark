import { LiveAnnouncer } from '@angular/cdk/a11y';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MOCK_ID, MOCK_NAME } from '@shelfmark/contracts/testing';
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
import { ViewportService } from '../../core/layout/viewport.service';
import { FeedbackDialogService } from '../../features/feedback/services/feedback-dialog.service';
import { SidebarComponent } from './sidebar.component';

async function setup(url = '/links', waitForFolders = true) {
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

describe('SidebarComponent', () => {
  afterEach(() => localStorage.removeItem(MOCK_LIBRARY_SETTINGS_STORAGE_KEY));

  it('has a "Send feedback" row above Trash that opens the dialog (#335)', async () => {
    const { element, fixture } = await setup();
    const open = vi.spyOn(TestBed.inject(FeedbackDialogService), 'open').mockImplementation(() => {
      // The dialog itself is covered by the feedback specs.
    });
    const names = rows(element).map((item) => item.querySelector('.ui-tree__name')?.textContent);

    expect(names.slice(-2)).toEqual(['Send feedback', 'Trash']);
    row(element, 'Send feedback').click();
    await fixture.whenStable();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('leaves the "Send feedback" row out on a phone (it is in the You list)', async () => {
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
    const { element } = await setup();

    expect(rows(element).map((item) => item.textContent)).not.toContain('Send feedback');
    expect(element.textContent).not.toContain('Send feedback');
  });

  it('drops the link counts when "Show folder counts" is off (#284)', async () => {
    localStorage.setItem(
      MOCK_LIBRARY_SETTINGS_STORAGE_KEY,
      JSON.stringify({ showFolderCounts: false }),
    );
    const { element, fixture } = await setup();
    await vi.waitFor(async () => {
      expect(TestBed.inject(UserSettingsStore).countsShown()).toBe(false);
      await fixture.whenStable();
      expect(row(element, 'All links').querySelector('.ui-tree__count')).toBeNull();
    });
    expect(row(element, MOCK_NAME.FolderReading).querySelector('.ui-tree__count')).toBeNull();
    expect(element.querySelector('.ui-tree__count')).toBeNull();
  });

  it('shows no empty Folders or Tags section before the first answer', async () => {
    const { element, fixture } = await setup('/links', false);
    expect(element.querySelector('.ui-tree__section')).toBeNull();
    expect(element.querySelector('app-sidebar-tags')).toBeNull();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(element.querySelector('.ui-tree__section')?.textContent?.trim()).toBe('Folders');
      expect(element.querySelector('app-sidebar-tags')).not.toBeNull();
    });
  });

  it('lists the fixed rows with their counts, then the folders', async () => {
    const { element } = await setup();

    const names = rows(element).map((item) => item.querySelector('.ui-tree__name')?.textContent);
    expect(names.slice(0, 4)).toEqual(['All links', 'Unsorted', 'Favorites', 'Recently opened']);
    // Trash is the last row, alone under a divider (its own tree), and has no count while empty.
    expect(names.at(-1)).toBe('Trash');
    expect(element.querySelector('.sidebar__footer [role="tree"]')).not.toBeNull();
    expect(element.textContent).not.toContain('Pinned');
    expect(names).toContain(MOCK_NAME.FolderReading);
    const counts = rows(element)
      .slice(0, 3)
      .map((item) => Number(item.querySelector('.ui-tree__count')?.textContent));
    expect(counts.every((count) => count > 0)).toBe(true);
    expect(element.querySelector('.ui-tree__section')?.textContent?.trim()).toBe('Folders');
  });

  it('shows folders as graphite tiles', async () => {
    const { element } = await setup();

    const tile = row(element, MOCK_NAME.FolderReading).querySelector('ui-folder-icon');
    expect(tile?.classList).toContain('ui-folder-icon--graphite');
  });

  it('opens the Recently opened page from its row and marks it', async () => {
    const { element, fixture, router } = await setup();

    row(element, 'Recently opened').click();
    await fixture.whenStable();

    expect(router.url).toBe('/recent');
    expect(row(element, 'Recently opened').getAttribute('aria-current')).toBe('page');
  });

  it('opens Trash from its row, marks it on /trash and counts what is in it', async () => {
    const { element, fixture, router } = await setup();
    expect(row(element, 'Trash').querySelector('.ui-tree__count')).toBeNull();

    row(element, 'Trash').click();
    await fixture.whenStable();

    expect(router.url).toBe('/trash');
    expect(row(element, 'Trash').getAttribute('aria-current')).toBe('page');
    expect(row(element, 'All links').getAttribute('aria-current')).toBeNull();
  });

  it('shows the number of items in Trash on its row', async () => {
    const { element, fixture } = await setup();
    const data = TestBed.inject(MockLibraryData);
    const trash = TestBed.inject(TrashStore);
    await trash.load();

    data.trashLink(data.links[0]);
    data.trashLink(data.links[0]);
    await trash.refresh();
    await fixture.whenStable();

    expect(row(element, 'Trash').querySelector('.ui-tree__count')?.textContent?.trim()).toBe('2');
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
    const { element } = await setup('/unsorted');

    expect(row(element, 'Unsorted').getAttribute('aria-current')).toBe('page');
    expect(row(element, 'All links').getAttribute('aria-current')).toBeNull();
  });

  it('opens the folders above the current folder', async () => {
    const { element } = await setup(`/folders/${MOCK_ID.FolderAngular}`);

    expect(row(element, MOCK_NAME.FolderReading).getAttribute('aria-expanded')).toBe('true');
    expect(row(element, MOCK_NAME.FolderAngular).getAttribute('aria-current')).toBe('page');
  });

  it('navigates when a row is chosen', async () => {
    const { element, fixture, router } = await setup();

    row(element, 'Favorites').click();
    await fixture.whenStable();
    expect(router.url).toBe('/favorites');

    row(element, MOCK_NAME.FolderReading).click();
    await fixture.whenStable();
    expect(router.url).toBe(`/folders/${MOCK_ID.FolderReading}`);
  });

  it('offers the folder actions in a menu from the "..." button', async () => {
    const { element, fixture } = await setup();

    element
      .querySelector<HTMLButtonElement>(
        `button[aria-label="Actions for ${MOCK_NAME.FolderReading}"]`,
      )
      ?.click();
    await fixture.whenStable();

    const items = [...document.querySelectorAll('[role="menuitem"]')].map((item) =>
      item.textContent?.trim(),
    );
    expect(items).toEqual([
      'Pin to sidebar',
      'Colour and icon…',
      'New subfolder',
      'Add link here',
      'Rename',
      'Move to…',
      'Share…',
      'Delete folder…',
    ]);
  });

  it('has a "New folder" "+" icon button in the Folders heading row, and no such row', async () => {
    const { element } = await setup();

    const button = element.querySelector<HTMLElement>('.ui-tree__action button');
    expect(button?.getAttribute('aria-label')).toBe('New folder');
    expect(button?.textContent?.trim()).toBe('');
    expect(element.textContent).not.toContain('New folder');
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
