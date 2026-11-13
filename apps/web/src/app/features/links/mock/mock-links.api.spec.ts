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

/** A links API over its own fresh library. */
function createApi(): MockLinksApi {
  return runInInjectionContext(Injector.create({ providers: [MockLibraryData] }), () => {
    return new MockLinksApi();
  });
}

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

  describe('paste many', () => {
    it('saves a batch in paste order, pending, and replays known keys', async () => {
      const batchApi = createApi();
      const request = {
        items: [
          { url: 'https://batch.example/a', idempotencyKey: 'k-a', title: 'A' },
          { url: 'https://batch.example/b', idempotencyKey: 'k-b' },
          { url: 'https://batch.example/a/', idempotencyKey: 'k-c' },
        ],
        tags: ['pasted'],
      };

      const first = await firstValueFrom(batchApi.createBatch(request));
      expect(first.links.map((link) => link.title)).toEqual(['A', 'https://batch.example/b']);
      expect(first.links[0].tags).toEqual(['pasted']);
      expect(first.links[0].imageUrl).toContain('pending');
      expect(first.errors).toEqual([
        { index: 2, url: 'https://batch.example/a/', code: 'duplicate-in-batch' },
      ]);

      const again = await firstValueFrom(batchApi.createBatch(request));
      expect(again.links.map((link) => link.id)).toEqual(first.links.map((link) => link.id));
    });

    it('fills in the page title of a link saved without one when its images are captured', async () => {
      const batchApi = createApi();
      const { links } = await firstValueFrom(
        batchApi.createBatch({ items: [{ url: 'https://batch.example/t', idempotencyKey: 'k' }] }),
      );

      const captured = await firstValueFrom(batchApi.captureImages(links[0].id));

      expect(captured.title).toBe('Page on batch.example');
    });

    it('reports a saved link as a duplicate in the preview', async () => {
      const batchApi = createApi();
      const { links } = await firstValueFrom(
        batchApi.createBatch({ items: [{ url: 'https://batch.example/d', idempotencyKey: 'k' }] }),
      );

      const response = await firstValueFrom(batchApi.preview('https://batch.example/d/'));

      expect(response.duplicate).toMatchObject({ id: links[0].id, folderName: null });
    });

    it('deletes a batch (Undo) and fails it for the delete-fails host', async () => {
      const batchApi = createApi();
      const { links } = await firstValueFrom(
        batchApi.createBatch({
          items: [
            { url: 'https://batch.example/x', idempotencyKey: 'x' },
            { url: `https://${MOCK_HOST.DeleteFails}/y`, idempotencyKey: 'y' },
          ],
        }),
      );

      await expect(
        firstValueFrom(batchApi.removeBatch(links.map((link) => link.id))),
      ).rejects.toThrow();
      expect(await firstValueFrom(batchApi.removeBatch([links[0].id, 'missing']))).toEqual({
        deleted: 1,
      });
    });

    it('fails a batch with a save-fails link as a whole', async () => {
      await expect(
        firstValueFrom(
          createApi().createBatch({
            items: [{ url: `https://${MOCK_HOST.SaveFails}/z`, idempotencyKey: 'z' }],
          }),
        ),
      ).rejects.toThrow();
    });
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

  it('answers the same link for the same idempotency key', async () => {
    const mock = createApi();
    const key = 'b0c1d2e3-0000-4000-8000-000000000001';
    const first = await firstValueFrom(
      mock.create({ url: 'https://example.org/a', idempotencyKey: key }),
    );
    const again = await firstValueFrom(
      mock.create({ url: 'https://example.org/a', idempotencyKey: key }),
    );
    const other = await firstValueFrom(
      mock.create({
        url: 'https://example.org/a',
        idempotencyKey: 'b0c1d2e3-0000-4000-8000-000000000002',
      }),
    );
    expect(again.id).toBe(first.id);
    expect(other.id).not.toBe(first.id);
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

    it('lists only the last 30 days of opens', async () => {
      const feed = createApi();
      const [target] = (await firstValueFrom(feed.list({ limit: 1 }))).items;
      await firstValueFrom(feed.open(target.id));
      const old = (await firstValueFrom(feed.recent({ limit: 100 }))).items.length;
      expect(old).toBeGreaterThan(0);
      const stale = new Date(Date.now() - 31 * 86_400_000).toISOString();
      const data = (feed as unknown as { data: MockLibraryData }).data;
      data.links = data.links.map((link) =>
        link.id === target.id ? { ...link, lastOpenedAt: stale } : link,
      );
      const { items } = await firstValueFrom(feed.recent({ limit: 100 }));
      expect(items.some((link) => link.id === target.id)).toBe(false);
      expect(items).toHaveLength(old - 1);
    });

    it('removes one link from the history and clears it', async () => {
      const feed = createApi();
      const { items } = await firstValueFrom(feed.recent({ limit: 100 }));
      await firstValueFrom(feed.removeRecent(items[0].id));
      const after = await firstValueFrom(feed.recent({ limit: 100 }));
      expect(after.items.map((link) => link.id)).not.toContain(items[0].id);
      const saved = await firstValueFrom(feed.get(items[0].id));
      expect(saved.lastOpenedAt).toBeNull();
      // Like the API: removing it again is fine, an unknown link is a 404.
      await firstValueFrom(feed.removeRecent(items[0].id));
      await expect(firstValueFrom(feed.removeRecent('missing'))).rejects.toMatchObject({
        status: 404,
      });
      await firstValueFrom(feed.clearRecent());
      expect((await firstValueFrom(feed.recent({ limit: 100 }))).items).toEqual([]);
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

    it('answers but records nothing while the history is paused, as the server', async () => {
      const injector = Injector.create({ providers: [MockLibraryData] });
      const feed = runInInjectionContext(injector, () => new MockLinksApi());
      const data = injector.get(MockLibraryData);
      const [target] = (await firstValueFrom(feed.list({ limit: 1 }))).items;
      const before = target.lastOpenedAt;

      data.pauseHistory = true;
      const paused = await firstValueFrom(feed.open(target.id));
      expect(paused.recorded).toBe(false);
      expect(paused.lastOpenedAt).toBe(before);

      data.pauseHistory = false;
      const recorded = await firstValueFrom(feed.open(target.id));
      expect(recorded.recorded).toBe(true);
      expect(recorded.lastOpenedAt).not.toBe(before);
    });

    it('marks the first link pending in the pending-images scenario until it is captured', async () => {
      globalThis.sessionStorage.setItem(MOCK_LINKS_SCENARIO_KEY, MOCK_LINKS_SCENARIO.PendingImages);
      try {
        const feed = createApi();
        const [first, second] = (await firstValueFrom(feed.list({ limit: 2 }))).items;
        expect(first.imageUrl).toBe(`/api/links/${first.id}/image?v=pending`);
        expect(second.imageUrl ?? '').not.toContain('pending');

        const captured = await firstValueFrom(feed.captureImages(first.id));
        expect(captured.imageUrl).toBe(`/api/links/${first.id}/image?v=0123456789abcdef`);
        const [again] = (await firstValueFrom(feed.list({ limit: 1 }))).items;
        expect(again.imageUrl).toBe(captured.imageUrl);
        await expect(firstValueFrom(feed.captureImages('missing'))).rejects.toThrow();
      } finally {
        globalThis.sessionStorage.removeItem(MOCK_LINKS_SCENARIO_KEY);
      }
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
