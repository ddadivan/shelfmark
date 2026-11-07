import { MOCK_LINK_PREVIEW_DUPLICATE } from '@shelfmark/contracts/testing';
import { firstValueFrom } from 'rxjs';
import { MOCK_HOST } from '../models/mock-host.const';
import { MOCK_LINKS_COUNT } from '../models/mock-links-count.const';
import { MOCK_LINKS_SCENARIO } from '../models/mock-links-scenario.const';
import { MOCK_LINKS_SCENARIO_KEY } from '../models/mock-links-scenario-key.const';
import { MockLinksApi } from './mock-links.api';
import { normalizeUrl } from './normalize-url';

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
  const api = new MockLinksApi();

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

    it('pages through every link with the cursor', async () => {
      const feed = new MockLinksApi();
      const first = await firstValueFrom(feed.list({ limit: 25 }));
      expect(first.items).toHaveLength(25);
      expect(first.nextCursor).not.toBeNull();
      const second = await firstValueFrom(feed.list({ limit: 25, cursor: first.nextCursor ?? '' }));
      const third = await firstValueFrom(feed.list({ limit: 25, cursor: second.nextCursor ?? '' }));
      expect(third.items).toHaveLength(MOCK_LINKS_COUNT - 50);
      expect(third.nextCursor).toBeNull();
    });

    it('filters favorites and unsorted links', async () => {
      const feed = new MockLinksApi();
      const favorites = await firstValueFrom(feed.list({ favorite: true, limit: 100 }));
      expect(favorites.items.every((link) => link.isFavorite)).toBe(true);
      const unsorted = await firstValueFrom(feed.list({ unsorted: true, limit: 100 }));
      expect(unsorted.items.every((link) => link.folderId === null)).toBe(true);
    });

    it('lists recently opened links, newest first', async () => {
      const { items } = await firstValueFrom(new MockLinksApi().recent({ limit: 5 }));
      expect(items.length).toBeGreaterThan(0);
      const times = items.map((link) => link.lastOpenedAt ?? '');
      expect(times).toEqual([...times].sort().reverse());
    });

    it('updates, opens and removes a link in memory', async () => {
      const feed = new MockLinksApi();
      const [target] = (await firstValueFrom(feed.list({ limit: 1 }))).items;
      const updated = await firstValueFrom(feed.update(target.id, { isFavorite: true }));
      expect(updated.isFavorite).toBe(true);
      const opened = await firstValueFrom(feed.open(target.id));
      expect(opened.lastOpenedAt).not.toBeNull();
      await firstValueFrom(feed.remove(target.id));
      const rest = await firstValueFrom(feed.list({ limit: 100 }));
      expect(rest.items.some((link) => link.id === target.id)).toBe(false);
    });

    it('puts a created link at the top of the next list', async () => {
      const feed = new MockLinksApi();
      const link = await firstValueFrom(feed.create({ url: 'https://new.example.org' }));
      const { items } = await firstValueFrom(feed.list({ limit: 100 }));
      expect(items.some((item) => item.id === link.id)).toBe(true);
    });

    it('fails update and delete for the failure hosts', async () => {
      const feed = new MockLinksApi();
      const link = await firstValueFrom(feed.create({ url: `https://${MOCK_HOST.PatchFails}/a` }));
      await expect(firstValueFrom(feed.update(link.id, { isFavorite: true }))).rejects.toThrow();
      const doomed = await firstValueFrom(
        feed.create({ url: `https://${MOCK_HOST.DeleteFails}/a` }),
      );
      await expect(firstValueFrom(feed.remove(doomed.id))).rejects.toThrow();
    });

    it('follows the sessionStorage scenario', async () => {
      const feed = new MockLinksApi();
      sessionStorage.setItem(MOCK_LINKS_SCENARIO_KEY, MOCK_LINKS_SCENARIO.Empty);
      expect((await firstValueFrom(feed.list())).items).toEqual([]);
      sessionStorage.setItem(MOCK_LINKS_SCENARIO_KEY, MOCK_LINKS_SCENARIO.Error);
      await expect(firstValueFrom(feed.list())).rejects.toThrow();
    });
  });
});
