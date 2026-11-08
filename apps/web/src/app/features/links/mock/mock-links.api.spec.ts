import { Injector, runInInjectionContext } from '@angular/core';
import { LINK_SORT_FIELD, SORT_ORDER } from '@shelfmark/contracts';
import { MOCK_LINK_PREVIEW_DUPLICATE } from '@shelfmark/contracts/testing';
import { firstValueFrom } from 'rxjs';
import { MOCK_HOST } from '../models/mock-host.const';
import { MOCK_LINKS_COUNT } from '../models/mock-links-count.const';
import { MOCK_LINKS_SCENARIO } from '../models/mock-links-scenario.const';
import { MOCK_LINKS_SCENARIO_KEY } from '../models/mock-links-scenario-key.const';
import { MockLibraryData } from './mock-library-data';
import { MockLinksApi } from './mock-links.api';
import { normalizeUrl } from './normalize-url';

/** A links API over its own fresh library. */
function createApi(): MockLinksApi {
  return runInInjectionContext(Injector.create({ providers: [MockLibraryData] }), () => {
    return new MockLinksApi();
  });
}

describe('normalizeUrl', () => {
  it('lowercases the host and drops fragment, utm params and the trailing slash', () => {
    expect(normalizeUrl('https://Example.COM/a/?utm_source=x&b=1#top')).toBe(
      'https://example.com/a/?b=1',
    );
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
  });

  it('returns null for text that is not a URL', () => {
    expect(normalizeUrl('nope')).toBeNull();
  });
});

describe('MockLinksApi', () => {
  const api = createApi();

  it('answers the duplicate fixture for an already saved URL', async () => {
    const response = await firstValueFrom(
      api.preview(`${MOCK_LINK_PREVIEW_DUPLICATE.preview.url}/?utm_source=x#intro`),
    );
    expect(response.duplicate).toEqual(MOCK_LINK_PREVIEW_DUPLICATE.duplicate);
  });

  it('generates a preview without duplicate for any other URL', async () => {
    const response = await firstValueFrom(api.preview('https://www.example.org/post'));
    expect(response.duplicate).toBeNull();
    expect(response.preview.title).toContain('example.org');
  });

  it('fails the preview for the unreachable host', async () => {
    await expect(
      firstValueFrom(api.preview(`https://${MOCK_HOST.Unreachable}/doc`)),
    ).rejects.toThrow();
  });

  it('creates a link from the request', async () => {
    const link = await firstValueFrom(
      api.create({ url: 'https://example.org', title: 'T', tags: ['a'] }),
    );
    expect(link).toMatchObject({
      url: 'https://example.org',
      title: 'T',
      tags: ['a'],
      folderId: null,
    });
  });

  it('fails the save for the save-fails host', async () => {
    await expect(
      firstValueFrom(api.create({ url: `https://${MOCK_HOST.SaveFails}` })),
    ).rejects.toThrow();
  });

  describe('feed', () => {
    afterEach(() => sessionStorage.removeItem(MOCK_LINKS_SCENARIO_KEY));

    it('searches the title, the note and the URL, every word', async () => {
      const feed = createApi();
      const note = await firstValueFrom(feed.list({ q: 'note for article', limit: 100 }));
      expect(note.items.length).toBeGreaterThan(0);
      expect(note.items.every((link) => link.note !== null)).toBe(true);
      const url = await firstValueFrom(feed.list({ q: 'angular.dev', limit: 100 }));
      expect(url.items.some((link) => link.url.includes('angular.dev'))).toBe(true);
      const both = await firstValueFrom(feed.list({ q: 'saved zzz-none', limit: 100 }));
      expect(both.items).toEqual([]);
    });

    it('sorts by title ignoring case, ascending', async () => {
      const feed = createApi();
      const { items } = await firstValueFrom(
        feed.list({ sort: LINK_SORT_FIELD.Title, order: SORT_ORDER.Asc, limit: 100 }),
      );
      const titles = items.map((link) => link.title.toLowerCase());
      expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    });

    it('pages through every link with the cursor', async () => {
      const feed = createApi();
      const first = await firstValueFrom(feed.list({ limit: 25 }));
      expect(first.items).toHaveLength(25);
      expect(first.nextCursor).not.toBeNull();
      const second = await firstValueFrom(feed.list({ limit: 25, cursor: first.nextCursor ?? '' }));
      const third = await firstValueFrom(feed.list({ limit: 25, cursor: second.nextCursor ?? '' }));
      expect(third.items).toHaveLength(MOCK_LINKS_COUNT - 50);
      expect(third.nextCursor).toBeNull();
    });

    it('filters favorites and unsorted links', async () => {
      const feed = createApi();
      const favorites = await firstValueFrom(feed.list({ favorite: true, limit: 100 }));
      expect(favorites.items.every((link) => link.isFavorite)).toBe(true);
      const unsorted = await firstValueFrom(feed.list({ unsorted: true, limit: 100 }));
      expect(unsorted.items.every((link) => link.folderId === null)).toBe(true);
    });

    it('lists recently opened links, newest first', async () => {
      const { items } = await firstValueFrom(createApi().recent({ limit: 5 }));
      expect(items.length).toBeGreaterThan(0);
      const times = items.map((link) => link.lastOpenedAt ?? '');
      expect(times).toEqual([...times].sort().reverse());
    });

    it('updates, opens and removes a link in memory', async () => {
      const feed = createApi();
      const [target] = (await firstValueFrom(feed.list({ limit: 1 }))).items;
      const updated = await firstValueFrom(feed.update(target.id, { isFavorite: true }));
      expect(updated.isFavorite).toBe(true);
      const opened = await firstValueFrom(feed.open(target.id));
      expect(opened.lastOpenedAt).not.toBeNull();
      await firstValueFrom(feed.remove(target.id));
      const rest = await firstValueFrom(feed.list({ limit: 100 }));
      expect(rest.items.some((link) => link.id === target.id)).toBe(false);
    });

    it('gets one link by id and fails for an unknown id', async () => {
      const feed = createApi();
      const [target] = (await firstValueFrom(feed.list({ limit: 1 }))).items;
      expect(await firstValueFrom(feed.get(target.id))).toEqual(target);
      await expect(firstValueFrom(feed.get('missing'))).rejects.toThrow();
    });

    it('puts a created link at the top of the next list', async () => {
      const feed = createApi();
      const link = await firstValueFrom(feed.create({ url: 'https://new.example.org' }));
      const { items } = await firstValueFrom(feed.list({ limit: 100 }));
      expect(items.some((item) => item.id === link.id)).toBe(true);
    });

    it('fails update and delete for the failure hosts', async () => {
      const feed = createApi();
      const link = await firstValueFrom(feed.create({ url: `https://${MOCK_HOST.PatchFails}/a` }));
      await expect(firstValueFrom(feed.update(link.id, { isFavorite: true }))).rejects.toThrow();
      const doomed = await firstValueFrom(
        feed.create({ url: `https://${MOCK_HOST.DeleteFails}/a` }),
      );
      await expect(firstValueFrom(feed.remove(doomed.id))).rejects.toThrow();
    });

    it('follows the sessionStorage scenario', async () => {
      const feed = createApi();
      sessionStorage.setItem(MOCK_LINKS_SCENARIO_KEY, MOCK_LINKS_SCENARIO.Empty);
      expect((await firstValueFrom(feed.list())).items).toEqual([]);
      sessionStorage.setItem(MOCK_LINKS_SCENARIO_KEY, MOCK_LINKS_SCENARIO.Error);
      await expect(firstValueFrom(feed.list())).rejects.toThrow();
    });
  });
});
