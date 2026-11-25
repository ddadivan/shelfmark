import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import { UiMenuHarness } from '@shelfmark/ui/testing';
import axe from 'axe-core';
import { of } from 'rxjs';
import { FOLDERS_API } from '../links/models/folders-api.const';
import { LINKS_API } from '../links/models/links-api.const';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import type { LinksScope } from '../links/models/links-scope.type';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import LibraryPage from './library.page';

const COVER = `/api/links/${MOCK_LINKS[0].id}/image?v=0123456789abcdef`;
const RECIPES: FolderResponse = {
  ...MOCK_FOLDERS[0],
  id: 'f1',
  name: 'Recipes',
  colour: 'clay',
  icon: '🍋',
  description: 'Dishes worth cooking twice',
  coverLinkId: MOCK_LINKS[0].id,
  coverUrl: COVER,
  highlighted: true,
};
const PLAIN: FolderResponse = {
  ...MOCK_FOLDERS[0],
  id: 'f2',
  name: 'Plain',
  highlighted: true,
};
/** Styled like Recipes but not highlighted (#440): the plain title block. */
const QUIET: FolderResponse = { ...RECIPES, id: 'f3', name: 'Quiet', highlighted: false };

async function setup(scope: LinksScope, folderId?: string) {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      {
        provide: LINKS_API,
        useValue: {
          list: () =>
            of({
              items: [
                { ...MOCK_LINKS[0], folderId: 'f1' },
                { ...MOCK_LINKS[1], folderId: null },
              ],
              nextCursor: null,
              pinned: [],
            }),
          recent: () => of({ items: [] }),
        },
      },
      {
        provide: FOLDERS_API,
        useValue: {
          list: () => of({ items: [RECIPES, PLAIN, QUIET], counts: MOCK_LIBRARY_COUNTS }),
        },
      },
      { provide: DialogService, useValue: { confirm: vi.fn(() => Promise.resolve(false)) } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(LibraryPage);
  fixture.componentRef.setInput('scope', scope);
  if (folderId) {
    fixture.componentRef.setInput('folderId', folderId);
  }
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, banner: element.querySelector<HTMLElement>('ui-folder-banner') };
}

describe('LibraryPage folder header (Shelf 04-organise)', () => {
  it('puts the cover, title, counts and description in one header, without a band', async () => {
    const { element, banner } = await setup(LINKS_SCOPE.Folder, 'f1');

    expect(banner).toBeNull();
    const heading = element.querySelector('.library__heading--folder') as HTMLElement;
    expect(heading.querySelector('h1')?.textContent?.trim()).toBe('Recipes');
    expect(heading.querySelector('.library__description')?.textContent?.trim()).toBe(
      'Dishes worth cooking twice',
    );
    expect(heading.querySelector('app-folder-cover img')?.getAttribute('src')).toBe(COVER);
    expect(heading.querySelector('ui-folder-icon')).toBeNull();
    expect(heading.querySelector('.library__count')).not.toBeNull();
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('shows the 40px folder tile when the folder has no cover', async () => {
    const { element } = await setup(LINKS_SCOPE.Folder, 'f2');

    const tile = element.querySelector('.library__heading--folder ui-folder-icon');
    expect(tile?.classList).toContain('ui-folder-icon--lg');
    expect(element.querySelector('.library__description')).toBeNull();
    expect(element.querySelector('app-folder-cover')).toBeNull();
  });

  it('draws the same header whether or not the folder is highlighted (#440: the sidebar row)', async () => {
    const { element } = await setup(LINKS_SCOPE.Folder, 'f3');

    expect(element.querySelector('.library__heading--folder h1')?.textContent?.trim()).toBe(
      'Quiet',
    );
    expect(element.querySelector('app-folder-cover img')?.getAttribute('src')).toBe(COVER);
  });

  it('offers "Add link here" and the folder actions in the menu of a folder page', async () => {
    const { element } = await setup(LINKS_SCOPE.Folder, 'f2');

    const buttons = [...element.querySelectorAll('ui-button')].map((b) => b.textContent?.trim());
    expect(buttons).toContain('Add link here');
    expect(
      element.querySelector('.library__toolbar button[aria-label^="Actions for "]'),
    ).not.toBeNull();
    expect(element.querySelector('button[aria-label="Sort: Newest first"]')).not.toBeNull();
    expect(element.querySelector('button[aria-label="Export this view…"]')).not.toBeNull();
    // Sort and Export are buttons of their own: no ⋯ menu is left.
    expect(element.querySelector('button[aria-label="More view options"]')).toBeNull();
  });

  it('splits the menus: folder actions by the title, sort, filter and export in the toolbar ⋯', async () => {
    const { fixture, element } = await setup(LINKS_SCOPE.Folder, 'f2');
    const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    const texts = async (label: RegExp) => {
      const menu = await loader.getHarness(UiMenuHarness.with({ label }));
      await menu.open();
      return Promise.all((await menu.getItems()).map((item) => item.getText()));
    };

    expect(await texts(/^Actions for Plain$/)).toEqual([
      'New subfolder',
      'Add link here',
      'Rename',
      'Folder settings…',
      'Move to…',
      'Pin to sidebar',
      'Share…',
      'Delete folder…',
    ]);
    TestBed.tick();
    const sort = await texts(/^Sort by$/);
    expect(sort).toEqual([
      'Newest first',
      'Oldest first',
      'Recently opened',
      'Recently edited',
      'Title A–Z',
      'Title Z–A',
      'Site A–Z',
      'Favorites first',
    ]);
    // Filter, Select, Side by side and Save view are toolbar buttons now.
    const toolbar = [...element.querySelectorAll('.library__actions ui-button')].map((button) =>
      button.querySelector('button')?.getAttribute('aria-label'),
    );
    expect(toolbar).toEqual(
      expect.arrayContaining(['Filter', 'Select links', 'Save view', 'Sort: Newest first']),
    );
  });

  it('keeps a plain header outside a folder', async () => {
    const { banner, element } = await setup(LINKS_SCOPE.All);

    expect(banner).toBeNull();
    expect(element.querySelector('.library__heading--folder')).toBeNull();
    expect(element.querySelector('app-folder-cover')).toBeNull();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('All links');
    expect(
      element.querySelector('.library__toolbar button[aria-label^="Actions for "]'),
    ).toBeNull();
  });
});

describe('LibraryPage card folders (#418)', () => {
  it('names the folder of each link in a mixed feed, none for an unsorted link', async () => {
    const { element } = await setup(LINKS_SCOPE.All);

    const folders = [...element.querySelectorAll('app-link-card .link-card__folder')];
    expect(folders).toHaveLength(1);
    expect(folders[0]?.textContent?.replace(/\s+/g, ' ').trim()).toBe('RecipesIn folder');
    expect(folders[0]?.getAttribute('slot')).toBe('meta');
    expect(element.querySelector('app-link-card ui-folder-chip')).toBeNull();
  });

  it('shows no folder in the meta line inside a folder or Unsorted', async () => {
    const inFolder = await setup(LINKS_SCOPE.Folder, 'f1');
    expect(inFolder.element.querySelector('.link-card__folder')).toBeNull();
    TestBed.resetTestingModule();
    const unsorted = await setup(LINKS_SCOPE.Unsorted);
    expect(unsorted.element.querySelector('.link-card__folder')).toBeNull();
  });
});
