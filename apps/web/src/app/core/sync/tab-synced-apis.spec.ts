import { MOCK_FOLDERS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { FoldersApi } from '../../features/links/models/folders-api.interface';
import type { LinksApi } from '../../features/links/models/links-api.interface';
import type { TagsApi } from '../../features/links/models/tags-api.interface';
import { TAB_SYNC_KIND } from './models/tab-sync-kind.const';
import { tabSyncedFoldersApi, tabSyncedLinksApi, tabSyncedTagsApi } from './tab-synced-apis';
import type { TabSyncService } from './tab-sync.service';

const link = MOCK_LINKS[0];

function sync() {
  const post = vi.fn();
  return { post, service: { post } as unknown as TabSyncService };
}

describe('tab-synced APIs', () => {
  it('posts a saved, changed and removed link after the request succeeds', async () => {
    const { post, service } = sync();
    const inner = {
      create: vi.fn(() => of(link)),
      update: vi.fn(() => of(link)),
      remove: vi.fn(() => of(undefined)),
      list: vi.fn(() => of({ items: [], nextCursor: null })),
    } as unknown as LinksApi;
    const api = tabSyncedLinksApi(inner, service);

    await firstValueFrom(api.create({ url: link.url }));
    await firstValueFrom(api.update(link.id, { title: 'x' }));
    await firstValueFrom(api.remove(link.id));
    await firstValueFrom(api.list());

    expect(post.mock.calls).toEqual([
      [{ kind: TAB_SYNC_KIND.LinkSaved, link }],
      [{ kind: TAB_SYNC_KIND.LinkChanged, link }],
      [{ kind: TAB_SYNC_KIND.LinkRemoved, id: link.id }],
    ]);
  });

  it('posts nothing when the request fails', async () => {
    const { post, service } = sync();
    const inner = { remove: vi.fn(() => throwError(() => new Error('offline'))) };
    const api = tabSyncedLinksApi(inner as unknown as LinksApi, service);

    await expect(firstValueFrom(api.remove(link.id))).rejects.toThrow('offline');

    expect(post).not.toHaveBeenCalled();
  });

  it('posts library-changed for folder and tag writes, not for reads', async () => {
    const { post, service } = sync();
    const folder = MOCK_FOLDERS[0];
    const folders = tabSyncedFoldersApi(
      {
        list: vi.fn(() => of({ items: [] })),
        create: vi.fn(() => of(folder)),
        update: vi.fn(() => of(folder)),
        remove: vi.fn(() => of(undefined)),
      } as unknown as FoldersApi,
      service,
    );
    const tags = tabSyncedTagsApi(
      {
        list: vi.fn(() => of([])),
        create: vi.fn(() => of({})),
        update: vi.fn(() => of({})),
        remove: vi.fn(() => of(undefined)),
        merge: vi.fn(() => of({})),
      } as unknown as TagsApi,
      service,
    );

    await firstValueFrom(folders.list());
    await firstValueFrom(tags.list());
    expect(post).not.toHaveBeenCalled();

    await firstValueFrom(folders.create({ name: 'A' }));
    await firstValueFrom(folders.update('f', { name: 'B' }));
    await firstValueFrom(folders.remove('f', 'delete-links'));
    await firstValueFrom(tags.create({ name: 't' }));
    await firstValueFrom(tags.update('t', { name: 'u' }));
    await firstValueFrom(tags.remove('t'));
    await firstValueFrom(tags.merge('t', 'u'));

    expect(post).toHaveBeenCalledTimes(7);
    expect(post).toHaveBeenCalledWith({ kind: TAB_SYNC_KIND.LibraryChanged });
  });
});
