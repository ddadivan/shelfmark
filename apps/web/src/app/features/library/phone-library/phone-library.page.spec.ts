import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DialogService } from '@shelfmark/ui';
import axe from 'axe-core';
import { ViewportService } from '../../../core/layout/viewport.service';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { MockFoldersApi } from '../../links/mock/mock-folders.api';
import { MockLinksApi } from '../../links/mock/mock-links.api';
import { MockTagsApi } from '../../links/mock/mock-tags.api';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { LINKS_API } from '../../links/models/links-api.const';
import { TAGS_API } from '../../links/models/tags-api.const';
import { MockTrashApi } from '../../trash/mock/mock-trash.api';
import { TRASH_API } from '../../trash/models/trash-api.const';
import { RecentSheetComponent } from '../../links/recent/recent-sheet.component';
import PhoneLibraryPage from './phone-library.page';

async function setup(phone = true) {
  const open = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([
        { path: 'links', children: [] },
        { path: 'recent', children: [] },
        { path: 'folders/:id', children: [] },
      ]),
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      { provide: TRASH_API, useClass: MockTrashApi },
      { provide: DialogService, useValue: { open } },
      { provide: ViewportService, useValue: { phone: signal(phone) } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(PhoneLibraryPage);
  await vi.waitFor(() => {
    TestBed.tick();
    expect(
      fixture.nativeElement.querySelector('.library-tile__meta')?.textContent?.trim(),
    ).toBeTruthy();
  });
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement, open };
}

describe('PhoneLibraryPage', () => {
  it('has the title, five tiles with their routes and the folder tree', async () => {
    const { element } = await setup();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Library');
    const tiles = [...element.querySelectorAll<HTMLAnchorElement>('a.library-tile')];
    expect(
      tiles.map((tile) => tile.querySelector('.library-tile__label')?.textContent?.trim()),
    ).toEqual(['All links', 'Unsorted', 'Favorites', 'Recently opened', 'Trash']);
    expect(tiles.map((tile) => tile.getAttribute('href'))).toEqual([
      '/links',
      '/unsorted',
      '/favorites',
      '/recent',
      '/trash',
    ]);
    expect(element.querySelector('nav[aria-label="Folders"] [role="tree"]')).not.toBeNull();
    // Folders only: no fixed rows and no tags inside the card.
    expect(element.querySelector('app-sidebar-tags')).toBeNull();
  });

  it('opens Recently opened in a sheet and does not navigate', async () => {
    const { element, open } = await setup();
    const router = TestBed.inject(Router);
    const tile = element.querySelector<HTMLAnchorElement>('a[aria-haspopup="dialog"]');

    tile?.click();

    expect(open).toHaveBeenCalledWith(RecentSheetComponent, expect.anything());
    expect(router.url).toBe('/');
  });

  it('leaves for All links when the viewport is not a phone', async () => {
    await setup(false);
    const router = TestBed.inject(Router);
    await vi.waitFor(() => expect(router.url).toBe('/links'));
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
