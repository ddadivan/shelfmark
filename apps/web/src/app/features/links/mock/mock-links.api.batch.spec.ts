import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { LINK_LIMIT } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { MockLibraryData } from './mock-library-data';
import { MockLinksApi } from './mock-links.api';

function createApi(): { api: MockLinksApi; data: MockLibraryData } {
  const injector = Injector.create({ providers: [MockLibraryData] });
  const api = runInInjectionContext(injector, () => new MockLinksApi());
  return { api, data: injector.get(MockLibraryData) };
}

async function status(call: Promise<unknown>): Promise<number | undefined> {
  try {
    await call;
    return undefined;
  } catch (error) {
    return error instanceof HttpErrorResponse ? error.status : -1;
  }
}

describe('MockLinksApi batch routes', () => {
  it('moves links to the mock Trash like the API, ignoring unknown ids', async () => {
    const { api, data } = createApi();
    const [a, b] = data.links;
    const response = await firstValueFrom(api.removeBatch([a?.id ?? '', b?.id ?? '', 'nope']));
    expect(response).toEqual({ deleted: 2 });
    expect(data.links.some((link) => link.id === a?.id)).toBe(false);
    expect(data.trash.map((entry) => entry.id)).toEqual(expect.arrayContaining([a?.id, b?.id]));
  });

  it('moves, tags, untags and favorites the matching links, in request order', async () => {
    const { api, data } = createApi();
    const folder = data.folderList[0]?.id ?? null;
    const [a, b] = data.links;
    const ids = [b?.id ?? '', a?.id ?? '', 'nope'];
    const response = await firstValueFrom(
      api.updateBatch({ ids, folderId: folder, addTags: ['Bulk tag'], isFavorite: true }),
    );
    expect(response.updated).toBe(2);
    expect(response.links.map((link) => link.id)).toEqual([b?.id, a?.id]);
    expect(response.links.every((link) => link.folderId === folder && link.isFavorite)).toBe(true);
    expect(response.links[0]?.tags).toContain('Bulk-tag');
    expect(data.tagsView().some((tag) => tag.name === 'Bulk-tag')).toBe(true);

    await firstValueFrom(api.updateBatch({ ids, removeTags: ['bulk-TAG'] }));
    expect(data.links.find((link) => link.id === a?.id)?.tags).not.toContain('Bulk-tag');
  });

  it('answers 404 for an unknown folder and 409 past the tag limit', async () => {
    const { api, data } = createApi();
    const id = data.links[0]?.id ?? '';
    expect(await status(firstValueFrom(api.updateBatch({ ids: [id], folderId: 'nope' })))).toBe(
      HttpStatusCode.NotFound,
    );
    const many = Array.from({ length: LINK_LIMIT.TagsMax + 1 }, (_, i) => `t${i}`);
    expect(await status(firstValueFrom(api.updateBatch({ ids: [id], addTags: many })))).toBe(
      HttpStatusCode.Conflict,
    );
  });
});
