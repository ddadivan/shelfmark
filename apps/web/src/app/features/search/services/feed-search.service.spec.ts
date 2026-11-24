import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SEARCH_DEBOUNCE_MS } from '../models/search-debounce-ms.const';
import { FeedSearchService } from './feed-search.service';

@Component({ template: '' })
class BlankPage {}

async function setup(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'links', component: BlankPage },
        { path: 'folders/:id', component: BlankPage },
        { path: 'unsorted/tidy', component: BlankPage },
        { path: 'unsorted', component: BlankPage },
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
});
