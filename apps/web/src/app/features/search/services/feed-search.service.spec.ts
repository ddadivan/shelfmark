import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FoldersStore } from '../../../stores/folders.store';
import { SEARCH_DEBOUNCE_MS } from '../models/search-debounce-ms.const';
import { FeedSearchService } from './feed-search.service';

@Component({ template: '' })
class BlankPage {}

async function setup(url: string) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: FoldersStore,
        useValue: {
          entityMap: signal({
            f1: { id: 'f1', name: 'Work', icon: 'briefcase', colour: 'amber' },
          }),
        },
      },
      provideRouter([
        { path: 'links', component: BlankPage },
        { path: 'folders/:id', component: BlankPage },
        { path: 'unsorted/tidy', component: BlankPage },
        { path: 'unsorted', component: BlankPage },
        { path: 'favorites', component: BlankPage },
        { path: 'today', component: BlankPage },
      ]),
    ],
  });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  return { router, service: TestBed.inject(FeedSearchService) };
}

const pause = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 30));

describe('FeedSearchService', () => {
  it('reads the search of the feed in the URL', async () => {
    const { service } = await setup('/links?q=signal%20forms');

    expect(service.text()).toBe('signal forms');
  });

  it('filters the feed in place after the pause, adding one history entry for the search', async () => {
    const { router, service } = await setup('/folders/f1?sort=oldest');
    const navigate = vi.spyOn(router, 'navigate');

    service.setText('ang');
    expect(router.url).toBe('/folders/f1?sort=oldest');
    await pause();
    expect(router.url).toBe('/folders/f1?sort=oldest&q=ang');
    expect(navigate.mock.calls[0]?.[1]).toMatchObject({ replaceUrl: false });

    service.setText('angular');
    await pause();
    expect(router.url).toBe('/folders/f1?sort=oldest&q=angular');
    expect(navigate.mock.calls[1]?.[1]).toMatchObject({ replaceUrl: true });
  });

  it('opens All links with the text from a page that is no feed', async () => {
    const { router, service } = await setup('/today');

    service.setText('jacket');
    await service.flush();

    expect(router.url).toBe('/links?q=jacket');
  });

  it('treats Tidy Unsorted as a page of its own', async () => {
    const { router, service } = await setup('/unsorted/tidy');

    service.setText('jacket');
    await service.flush();

    expect(router.url).toBe('/links?q=jacket');
  });

  it('clear() takes the search out of the feed', async () => {
    const { router, service } = await setup('/links?q=shoes');

    await service.clear();

    expect(service.text()).toBe('');
    expect(router.url).toBe('/links');
  });

  it('writes a search changed elsewhere (Back, a chip) into the field, and empties it off the feeds', async () => {
    const { router, service } = await setup('/links');

    await router.navigateByUrl('/unsorted?q=coat');
    expect(service.text()).toBe('coat');

    await router.navigateByUrl('/today');
    expect(service.text()).toBe('');
  });

  it('typing nothing new navigates nowhere', async () => {
    const { router, service } = await setup('/links?q=coat');
    const navigate = vi.spyOn(router, 'navigate');

    service.setText(' coat ');
    await service.flush();

    expect(navigate).not.toHaveBeenCalled();
  });

  describe('scope', () => {
    it('is null on All links and on pages that are no feed', async () => {
      const { router, service } = await setup('/links?q=a');
      expect(service.scope()).toBeNull();

      await router.navigateByUrl('/today');
      expect(service.scope()).toBeNull();
    });

    it('names Unsorted and Favorites by their scope label and sidebar icon', async () => {
      const { router, service } = await setup('/unsorted');
      expect(service.scope()).toEqual({
        labelKey: 'library.scope.unsorted',
        name: null,
        icon: 'inbox',
        colour: null,
      });

      await router.navigateByUrl('/favorites');
      expect(service.scope()).toEqual({
        labelKey: 'library.scope.favorites',
        name: null,
        icon: 'star',
        colour: null,
      });
    });

    it('is the folder with its icon and colour on a folder page, null for an unknown folder', async () => {
      const { router, service } = await setup('/folders/f1?q=x');
      expect(service.scope()).toEqual({
        labelKey: null,
        name: 'Work',
        icon: 'briefcase',
        colour: 'amber',
      });

      await router.navigateByUrl('/folders/missing');
      expect(service.scope()).toBeNull();
    });

    it('is null on Tidy Unsorted', async () => {
      const { service } = await setup('/unsorted/tidy');

      expect(service.scope()).toBeNull();
    });
  });

  describe('searchEverywhere', () => {
    it('opens All links with the text of the field and keeps the text', async () => {
      const { router, service } = await setup('/folders/f1');

      service.setText('  Angular   signals ');
      await service.searchEverywhere();

      expect(router.url).toBe('/links?q=Angular%20signals');
      // The URL holds the normalised text; the field shows it.
      expect(service.text()).toBe('Angular signals');
      await pause();
      expect(router.url).toBe('/links?q=Angular%20signals');
    });

    it('opens All links without q while the field is empty', async () => {
      const { router, service } = await setup('/favorites');

      await service.searchEverywhere();

      expect(router.url).toBe('/links');
    });
  });
});
