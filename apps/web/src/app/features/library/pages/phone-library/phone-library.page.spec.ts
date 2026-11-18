import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { REDISCOVER_MODE } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import { of } from 'rxjs';
import { REDISCOVER_API } from '../../../rediscover/models/rediscover-api.const';
import axe from 'axe-core';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { MockFoldersApi } from '../../../links/mock/mock-folders.api';
import { MockLinksApi } from '../../../links/mock/mock-links.api';
import { MockTagsApi } from '../../../links/mock/mock-tags.api';
import { FOLDERS_API } from '../../../links/models/folders-api.const';
import { LINKS_API } from '../../../links/models/links-api.const';
import { TAGS_API } from '../../../links/models/tags-api.const';
import { MockTrashApi } from '../../../trash/mock/mock-trash.api';
import { TRASH_API } from '../../../trash/models/trash-api.const';
import { RecentSheetComponent } from '../../../links/components/recent-sheet/recent-sheet.component';
import { aiSettingsResponse, fakeAiApi, type FakeAiApi } from '../../../../../testing/fake-ai-api';
import { AI_API } from '../../../ai/models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../../ai/models/ai-settings-default.const';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import PhoneLibraryPage from './phone-library.page';

async function setup(phone = true, ai?: FakeAiApi, forgotten = 0) {
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
      { provide: ViewportService, useValue: { phone: signal(phone), compact: signal(phone) } },
      ...(ai ? [{ provide: AI_API, useValue: ai }] : []),
      {
        provide: REDISCOVER_API,
        useValue: {
          getBlock: () =>
            of({
              week: '2026-W47',
              mode: REDISCOVER_MODE.Forgotten,
              theme: null,
              items: MOCK_LINKS.slice(0, forgotten),
            }),
        },
      },
    ],
  });
  await loadEnglish();
  if (ai) {
    await TestBed.inject(AiSettingsStore).load();
  }
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
  it('has the title, six tiles with their routes and the folder tree', async () => {
    const { element } = await setup();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Library');
    const tiles = [...element.querySelectorAll<HTMLAnchorElement>('a.library-tile')];
    expect(
      tiles.map((tile) => tile.querySelector('.library-tile__label')?.textContent?.trim()),
    ).toEqual(['All links', 'Unsorted', 'Favorites', 'Recently opened', 'Reminders', 'Trash']);
    expect(tiles.map((tile) => tile.getAttribute('href'))).toEqual([
      '/links',
      '/unsorted',
      '/favorites',
      '/recent',
      '/reminders',
      '/trash',
    ]);
    expect(element.querySelector('nav[aria-label="Folders"] [role="tree"]')).not.toBeNull();
    // Folders only: no fixed rows and no tags inside the card.
    expect(element.querySelector('app-sidebar-tags')).toBeNull();
  });

  it('orders Pinned, Folders, then the tiles (#512)', async () => {
    const { element } = await setup();
    const pinned = element.querySelector('app-sidebar-pinned');
    const folders = element.querySelector('app-sidebar');
    const tiles = element.querySelector('.phone-library__tiles');
    const follows = (a: Element | null, b: Element | null): boolean =>
      !!a && !!b && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(pinned, folders)).toBe(true);
    expect(follows(folders, tiles)).toBe(true);
  });

  it('shows the tags under the folders while Ask has the Tags tab (#499)', async () => {
    const ai = fakeAiApi(
      aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT, enabled: true, ask: true } }),
    );
    const { element } = await setup(true, ai);
    const tags = element.querySelector('app-sidebar-tags');
    expect(tags?.querySelector('h2')?.textContent?.trim()).toBe('Tags');
    // After the folder tree.
    const tree = element.querySelector('app-sidebar');
    expect(
      tree && tags ? tree.compareDocumentPosition(tags) & Node.DOCUMENT_POSITION_FOLLOWING : 0,
    ).toBeTruthy();
  });

  it('captions Recently opened with the forgotten count in the accent tone (#512)', async () => {
    const { element } = await setup(true, undefined, 2);
    await vi.waitFor(() => {
      TestBed.tick();
      const meta = [...element.querySelectorAll('.library-tile')]
        .find((tile) => tile.textContent?.includes('Recently opened'))
        ?.querySelector('.library-tile__meta');
      expect(meta?.textContent?.trim()).toBe('2 forgotten');
      expect(meta?.classList.contains('library-tile__meta--attention')).toBe(true);
    });
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
