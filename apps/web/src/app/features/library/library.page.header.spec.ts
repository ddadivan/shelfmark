import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
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

describe('LibraryPage folder header (#418, #440)', () => {
  it('puts the heading, big tile and description on the band with the cover', async () => {
    const { element, banner: found } = await setup(LINKS_SCOPE.Folder, 'f1');
    const banner = found as HTMLElement;

    expect(banner.hasAttribute('data-ui-folder-colour')).toBe(true);
    expect(banner.querySelector('h1')?.textContent?.trim()).toBe('Recipes');
    expect(banner.querySelector('.library__description')?.textContent?.trim()).toBe(
      'Dishes worth cooking twice',
    );
    const tile = banner.querySelector('ui-folder-icon');
    expect(tile?.classList).toContain('ui-folder-icon--xl');
    expect(tile?.textContent).toContain('🍋');
    expect(banner.querySelector('.ui-folder-banner__cover')?.getAttribute('src')).toBe(COVER);
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('shows a graphite folder without band, cover or description', async () => {
    const { banner: found } = await setup(LINKS_SCOPE.Folder, 'f2');
    const banner = found as HTMLElement;

    expect(banner.hasAttribute('data-ui-folder-colour')).toBe(false);
    expect(banner.querySelector('.ui-folder-banner__cover')).toBeNull();
    expect(banner.querySelector('.library__description')).toBeNull();
    expect(banner.querySelector('ui-folder-icon')).not.toBeNull();
  });

  it('shows the plain title block for a folder that is not highlighted (#440)', async () => {
    const { element, banner } = await setup(LINKS_SCOPE.Folder, 'f3');

    expect(banner).toBeNull();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Quiet');
    expect(element.querySelector('.library__heading ui-folder-icon')).toBeNull();
    expect(element.querySelector('.library__count')).not.toBeNull();
  });

  it('keeps the description and the cover of a folder that is not highlighted, in plain form (#440)', async () => {
    const { element } = await setup(LINKS_SCOPE.Folder, 'f3');

    expect(element.querySelector('.library__description')?.textContent?.trim()).toBe(
      'Dishes worth cooking twice',
    );
    expect(element.querySelector('app-folder-cover img')?.getAttribute('src')).toBe(COVER);
    expect(element.querySelector('.library__heading--cover')).not.toBeNull();
    expect((await axe.run(element)).violations).toEqual([]);
  });

  it('shows no cover block for a plain folder without a cover (#440)', async () => {
    const { element } = await setup(LINKS_SCOPE.Folder, 'f3');
    TestBed.resetTestingModule();
    const none = await setup(LINKS_SCOPE.All);
    expect(none.element.querySelector('app-folder-cover')).toBeNull();
    expect(element.querySelector('app-folder-cover')).not.toBeNull();
  });

  it('keeps a plain header outside a folder', async () => {
    const { banner, element } = await setup(LINKS_SCOPE.All);

    expect(banner).toBeNull();
    expect(element.querySelector('.library__heading ui-folder-icon')).toBeNull();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('All links');
  });
});

describe('LibraryPage folder chips (#418)', () => {
  it('names the folder of each link in a mixed feed, none for an unsorted link', async () => {
    const { element } = await setup(LINKS_SCOPE.All);

    const chips = [...element.querySelectorAll('app-link-card ui-folder-chip')];
    expect(chips).toHaveLength(1);
    expect(
      chips[0]?.querySelector('.ui-folder-chip__label')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('In folder Recipes');
    expect(chips[0]?.getAttribute('style')).toContain('--ui-folder-tint');
  });

  it('shows no chip inside a folder or Unsorted', async () => {
    const inFolder = await setup(LINKS_SCOPE.Folder, 'f1');
    expect(inFolder.element.querySelector('ui-folder-chip')).toBeNull();
    TestBed.resetTestingModule();
    const unsorted = await setup(LINKS_SCOPE.Unsorted);
    expect(unsorted.element.querySelector('ui-folder-chip')).toBeNull();
  });
});
