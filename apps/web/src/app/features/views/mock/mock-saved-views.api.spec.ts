import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { LINK_KIND, SAVED_VIEW_LIMIT, SAVED_VIEW_SCOPE } from '@shelfmark/contracts';
import { MOCK_ID } from '@shelfmark/contracts/testing';
import { firstValueFrom } from 'rxjs';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { normalizeViewQuery } from '../utils/saved-view-query';
import { MockSavedViewsApi } from './mock-saved-views.api';

function setup() {
  return { api: TestBed.inject(MockSavedViewsApi), data: TestBed.inject(MockLibraryData) };
}

async function status(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
    return 200;
  } catch (error) {
    return error instanceof HttpErrorResponse ? error.status : -1;
  }
}

describe('MockSavedViewsApi', () => {
  it('starts with the starter views, counted like the mock list', async () => {
    const { api, data } = setup();
    const body = await firstValueFrom(api.list());
    expect(body.items.map((item) => item.name)).toEqual(['Videos', 'Articles']);
    expect(body.total).toBe(data.links.length);
    expect(body.items[0]?.count).toBe(
      data.links.filter((link) => link.kind === LINK_KIND.Video).length,
    );
  });

  it('counts inside a feed (#335)', async () => {
    const { api, data } = setup();
    const unsorted = data.links.filter((link) => link.folderId === null);
    const body = await firstValueFrom(api.list({ scope: SAVED_VIEW_SCOPE.Unsorted }));
    expect(body.total).toBe(unsorted.length);
    expect(body.items[0]?.count).toBe(
      unsorted.filter((link) => link.kind === LINK_KIND.Video).length,
    );
  });

  it('creates normalized views and refuses like the API', async () => {
    const { api, data } = setup();
    const view = await firstValueFrom(
      api.create({ name: ' Mine ', query: { scope: SAVED_VIEW_SCOPE.All, tags: ['a b'] } }),
    );
    expect(view).toMatchObject({ name: 'Mine', position: 2, query: { tags: ['a-b'] } });
    expect(await status(firstValueFrom(api.create({ name: ' ', query: view.query })))).toBe(400);
    expect(
      await status(
        firstValueFrom(
          api.create({ name: 'x'.repeat(SAVED_VIEW_LIMIT.NameMax + 1), query: view.query }),
        ),
      ),
    ).toBe(400);
    expect(
      await status(
        firstValueFrom(
          api.create({ name: 'F', query: { scope: SAVED_VIEW_SCOPE.Folder, folderId: 'nope' } }),
        ),
      ),
    ).toBe(404);
    expect(
      await status(firstValueFrom(api.create({ name: 'Fails to save', query: view.query }))),
    ).toBe(500);
    data.views = Array.from({ length: SAVED_VIEW_LIMIT.PerUserMax }, (_, index) => ({
      id: `v${index}`,
      name: 'v',
      query: view.query,
    }));
    expect(await status(firstValueFrom(api.create({ name: 'one more', query: view.query })))).toBe(
      409,
    );
  });

  it('updates, deletes and reorders', async () => {
    const { api } = setup();
    const [videos, articles] = (await firstValueFrom(api.list())).items;
    const renamed = await firstValueFrom(api.update(videos?.id ?? '', { name: 'Clips' }));
    expect(renamed.name).toBe('Clips');
    const requeried = await firstValueFrom(
      api.update(videos?.id ?? '', {
        query: { scope: SAVED_VIEW_SCOPE.Folder, folderId: MOCK_ID.FolderReading },
      }),
    );
    expect(requeried).toMatchObject({ name: 'Clips', available: true });
    expect(await status(firstValueFrom(api.update('nope', { name: 'x' })))).toBe(404);

    const order = await firstValueFrom(api.reorder([articles?.id ?? '', videos?.id ?? '']));
    expect(order.items.map((item) => item.name)).toEqual(['Articles', 'Clips']);
    expect(await status(firstValueFrom(api.reorder([videos?.id ?? ''])))).toBe(400);

    await firstValueFrom(api.remove(videos?.id ?? ''));
    expect(await status(firstValueFrom(api.remove(videos?.id ?? '')))).toBe(404);
    expect((await firstValueFrom(api.list())).items).toHaveLength(1);
  });

  it('a view whose folder went away is unavailable and counts nothing', async () => {
    const { api, data } = setup();
    data.views = [
      {
        id: 'f',
        name: 'Reading',
        query: normalizeViewQuery({
          scope: SAVED_VIEW_SCOPE.Folder,
          folderId: MOCK_ID.FolderReading,
        }),
      },
    ];
    expect((await firstValueFrom(api.list())).items[0]?.available).toBe(true);
    data.setFolders(data.folderList.filter((folder) => folder.id !== MOCK_ID.FolderReading));
    expect((await firstValueFrom(api.list())).items[0]).toMatchObject({
      available: false,
      count: 0,
    });
  });
});
