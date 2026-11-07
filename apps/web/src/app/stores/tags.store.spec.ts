import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TAG_LIMIT, type LinkResponse, type TagResponse } from '@shelfmark/contracts';
import { MOCK_LINKS, MOCK_TAGS } from '@shelfmark/contracts/testing';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { LINKS_API } from '../features/links/models/links-api.const';
import type { LinksApi } from '../features/links/models/links-api.interface';
import { TAGS_API } from '../features/links/models/tags-api.const';
import type { TagsApi } from '../features/links/models/tags-api.interface';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import { LinksStore } from './links.store';
import { TAG_OUTCOME } from './models/tag-outcome.const';
import { TagsStore } from './tags.store';

function tag(name: string, linkCount = 0): TagResponse {
  return { ...MOCK_TAGS[0], id: `tag-${name}`, name, linkCount };
}

function link(id: string, tags: string[]): LinkResponse {
  return { ...MOCK_LINKS[0], id, tags };
}

const conflict = () =>
  throwError(
    () => new HttpErrorResponse({ status: HttpStatusCode.Conflict, statusText: 'Conflict' }),
  );

const LIST = [tag('docs', 5), tag('video', 3), tag('clothes', 3), tag('winter', 1)];

function setup(overrides: Partial<TagsApi> = {}, links: LinkResponse[] = []) {
  const api = {
    list: vi.fn<TagsApi['list']>(() => of(LIST)),
    create: vi.fn<TagsApi['create']>((request) => of(tag(request.name))),
    update: vi.fn<TagsApi['update']>((id, request) =>
      of({ ...tag(request.name), id, updatedAt: 'later' }),
    ),
    remove: vi.fn<TagsApi['remove']>(() => of(undefined)),
    merge: vi.fn<TagsApi['merge']>((_id, targetTagId) =>
      of({ ...tag('merged', 9), id: targetTagId }),
    ),
    ...overrides,
  };
  const linksApi = {
    list: vi.fn<LinksApi['list']>(() => of({ items: links, nextCursor: null })),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: TAGS_API, useValue: api },
      { provide: LINKS_API, useValue: linksApi },
    ],
  });
  return { api, store: TestBed.inject(TagsStore), linksStore: TestBed.inject(LinksStore) };
}

const names = (store: InstanceType<typeof TagsStore>) => store.entities().map((item) => item.name);

describe('TagsStore', () => {
  describe('load', () => {
    it('lists the tags most used first, then by name', async () => {
      const { store } = setup();

      await store.load();

      expect(names(store)).toEqual(['docs', 'clothes', 'video', 'winter']);
      expect(store.loaded()).toBe(true);
    });

    it('shares one request between callers and skips it once loaded', async () => {
      const { api, store } = setup();

      await Promise.all([store.load(), store.load()]);
      await store.load();

      expect(api.list).toHaveBeenCalledTimes(1);
    });

    it('flags a failed first load and retries on the next call', async () => {
      const list = vi
        .fn<TagsApi['list']>()
        .mockReturnValueOnce(throwError(() => new Error('down')))
        .mockReturnValue(of(LIST));
      const { store } = setup({ list });

      await store.load();
      expect(store.error()).toBe(true);
      await store.load();

      expect(store.error()).toBe(false);
      expect(store.count()).toBe(4);
    });

    it('does not refresh before the first load', async () => {
      const { api, store } = setup();

      await store.refresh();

      expect(api.list).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('adds the created tag in order', async () => {
      const { store } = setup();
      await store.load();

      const result = await store.create('new-tag');

      expect(result.outcome).toBe(TAG_OUTCOME.Done);
      expect(names(store)).toContain('new-tag');
    });

    it('answers a name that exists, ignoring case, without a request', async () => {
      const { api, store } = setup();
      await store.load();

      const result = await store.create('DOCS');

      expect(result).toEqual({ outcome: TAG_OUTCOME.Conflict, tag: LIST[0] });
      expect(api.create).not.toHaveBeenCalled();
    });

    it('reports a 409 from the server as a conflict', async () => {
      const { store } = setup({ create: vi.fn(() => conflict()) });
      await store.load();

      const result = await store.create('fresh');

      expect(result.outcome).toBe(TAG_OUTCOME.Conflict);
      expect(names(store)).not.toContain('fresh');
    });

    it('reports another failure as failed', async () => {
      const { store } = setup({ create: vi.fn(() => throwError(() => new Error('down'))) });
      await store.load();

      expect((await store.create('fresh')).outcome).toBe(TAG_OUTCOME.Failed);
    });

    it('knows when the per-user limit is reached', async () => {
      const many = Array.from({ length: TAG_LIMIT.PerUserMax }, (_, n) => tag(`t${n}`));
      const { store } = setup({ list: vi.fn(() => of(many)) });

      await store.load();

      expect(store.atLimit()).toBe(true);
    });
  });

  describe('rename', () => {
    it('shows the new name at once and keeps it when the server agrees', async () => {
      const reply = new Subject<TagResponse>();
      const { store } = setup({ update: vi.fn(() => reply) });
      await store.load();

      const pending = store.rename('tag-winter', 'summer');
      expect(names(store)).toContain('summer');
      reply.next({ ...tag('summer', 1), updatedAt: 'later' });
      reply.complete();

      expect((await pending).outcome).toBe(TAG_OUTCOME.Done);
      expect(names(store)).toContain('summer');
    });

    it('offers a merge: the name of another tag is a conflict that names the owner', async () => {
      const { api, store } = setup();
      await store.load();

      const result = await store.rename('tag-winter', 'Clothes');

      expect(result).toEqual({ outcome: TAG_OUTCOME.Conflict, tag: tag('clothes', 3) });
      expect(api.update).not.toHaveBeenCalled();
      expect(names(store)).toContain('winter');
    });

    it('rolls back on a 409 from the server and names the owner', async () => {
      const { store } = setup({ update: vi.fn(() => conflict()) });
      await store.load();
      // The list does not have it yet: only the server knows.
      const result = await store.rename('tag-winter', 'late-arrival');

      expect(result.outcome).toBe(TAG_OUTCOME.Conflict);
      expect(names(store)).toContain('winter');
      expect(names(store)).not.toContain('late-arrival');
    });

    it('allows changing only the case of the own name', async () => {
      const { api, store } = setup();
      await store.load();

      const result = await store.rename('tag-winter', 'Winter');

      expect(result.outcome).toBe(TAG_OUTCOME.Done);
      expect(api.update).toHaveBeenCalledWith('tag-winter', { name: 'Winter' });
    });

    it('puts the old name back when the request fails', async () => {
      const { store } = setup({ update: vi.fn(() => throwError(() => new Error('down'))) });
      await store.load();

      expect((await store.rename('tag-winter', 'summer')).outcome).toBe(TAG_OUTCOME.Failed);

      expect(names(store)).toContain('winter');
      expect(names(store)).not.toContain('summer');
    });

    it('does not undo a later rename when an older one fails', async () => {
      const first = new Subject<TagResponse>();
      const update = vi
        .fn<TagsApi['update']>()
        .mockReturnValueOnce(first)
        .mockImplementation((id, request) => of({ ...tag(request.name), id }));
      const { store } = setup({ update });
      await store.load();

      const older = store.rename('tag-winter', 'summer');
      await store.rename('tag-winter', 'autumn');
      first.error(new Error('down'));
      await older;

      expect(names(store)).toContain('autumn');
    });

    it('renames the tag in loaded links once the server accepted it', async () => {
      const { store, linksStore } = setup({}, [link('l1', ['winter', 'docs'])]);
      await store.load();
      linksStore.setFilter({ scope: LINKS_SCOPE.All });

      await store.rename('tag-winter', 'summer');

      expect(linksStore.entities()[0].tags).toEqual(['summer', 'docs']);
    });

    it('leaves the links alone when the rename fails', async () => {
      const { store, linksStore } = setup(
        { update: vi.fn(() => throwError(() => new Error('down'))) },
        [link('l1', ['winter'])],
      );
      await store.load();
      linksStore.setFilter({ scope: LINKS_SCOPE.All });

      await store.rename('tag-winter', 'summer');

      expect(linksStore.entities()[0].tags).toEqual(['winter']);
    });
  });

  describe('merge', () => {
    it('removes the source, takes the count of the target and retags the links', async () => {
      const { api, store, linksStore } = setup(
        { merge: vi.fn((_id, target) => of({ ...tag('clothes', 4), id: target })) },
        [link('l1', ['winter', 'clothes']), link('l2', ['winter'])],
      );
      await store.load();
      linksStore.setFilter({ scope: LINKS_SCOPE.All });

      const result = await store.merge('tag-winter', 'tag-clothes');

      expect(api.merge).toHaveBeenCalledWith('tag-winter', 'tag-clothes');
      expect(result.outcome).toBe(TAG_OUTCOME.Done);
      expect(names(store)).not.toContain('winter');
      expect(store.entityMap()['tag-clothes']?.linkCount).toBe(4);
      expect(linksStore.entities().map((item) => item.tags)).toEqual([['clothes'], ['clothes']]);
    });

    it('keeps everything when the request fails', async () => {
      const { store } = setup({ merge: vi.fn(() => throwError(() => new Error('down'))) });
      await store.load();

      expect((await store.merge('tag-winter', 'tag-clothes')).outcome).toBe(TAG_OUTCOME.Failed);

      expect(names(store)).toContain('winter');
    });

    it('refuses a merge into itself or an unknown tag without a request', async () => {
      const { api, store } = setup();
      await store.load();

      expect((await store.merge('tag-winter', 'tag-winter')).outcome).toBe(TAG_OUTCOME.Failed);
      expect((await store.merge('tag-winter', 'nope')).outcome).toBe(TAG_OUTCOME.Failed);
      expect(api.merge).not.toHaveBeenCalled();
    });
  });

  describe('delete with Undo', () => {
    it('hides the tag and sends nothing until committed', async () => {
      const { api, store } = setup();
      await store.load();

      expect(store.hide('tag-winter')).toBe(true);

      expect(names(store)).not.toContain('winter');
      expect(api.remove).not.toHaveBeenCalled();
    });

    it('brings a hidden tag back in place on Undo, without a request', async () => {
      const { api, store } = setup();
      await store.load();
      store.hide('tag-docs');

      store.undoRemove('tag-docs');

      expect(names(store)).toEqual(['docs', 'clothes', 'video', 'winter']);
      expect(api.remove).not.toHaveBeenCalled();
    });

    it('sends the delete on commit and drops the tag from the loaded links', async () => {
      const { api, store, linksStore } = setup({}, [link('l1', ['winter', 'docs'])]);
      await store.load();
      linksStore.setFilter({ scope: LINKS_SCOPE.All });
      store.hide('tag-winter');

      expect(await store.commitRemove('tag-winter')).toBe(true);

      expect(api.remove).toHaveBeenCalledWith('tag-winter');
      expect(linksStore.entities()[0].tags).toEqual(['docs']);
    });

    it('also drops the tag from links waiting in their own Undo window', async () => {
      const { store, linksStore } = setup({}, [link('l1', ['winter', 'docs'])]);
      await store.load();
      linksStore.setFilter({ scope: LINKS_SCOPE.All });
      linksStore.remove('l1');
      store.hide('tag-winter');

      await store.commitRemove('tag-winter');
      linksStore.undoRemove('l1');

      expect(linksStore.entities()[0].tags).toEqual(['docs']);
    });

    it('restores the tag when the delete fails', async () => {
      const { store } = setup({ remove: vi.fn(() => throwError(() => new Error('down'))) });
      await store.load();
      store.hide('tag-winter');

      expect(await store.commitRemove('tag-winter')).toBe(false);

      expect(names(store)).toContain('winter');
    });

    it('does not show a hidden tag again when a list arrives meanwhile', async () => {
      const { store } = setup();
      await store.load();
      store.hide('tag-winter');

      await store.refresh();

      expect(names(store)).not.toContain('winter');
    });

    it('sends deletes still waiting on flush, and ignores a second commit', async () => {
      const { api, store } = setup();
      await store.load();
      store.hide('tag-winter');

      await store.flushPending();
      await store.commitRemove('tag-winter');

      expect(api.remove).toHaveBeenCalledTimes(1);
    });

    it('refuses to hide an unknown or an already hidden tag', async () => {
      const { store } = setup();
      await store.load();

      expect(store.hide('nope')).toBe(false);
      expect(store.hide('tag-winter')).toBe(true);
      expect(store.hide('tag-winter')).toBe(false);
    });
  });

  describe('races and reset', () => {
    it('drops a list that started before a mutation and asks again afterwards', async () => {
      const first = new Subject<readonly TagResponse[]>();
      const list = vi
        .fn<TagsApi['list']>()
        .mockReturnValueOnce(of(LIST))
        .mockReturnValueOnce(first)
        .mockReturnValue(of([...LIST, tag('new-tag')]));
      const { store } = setup({ list });
      await store.load();

      const refreshing = store.refresh();
      await store.create('new-tag');
      first.next(LIST);
      first.complete();
      await refreshing;

      expect(names(store)).toContain('new-tag');
    });

    it('lets only the newest list write', async () => {
      const old = new Subject<readonly TagResponse[]>();
      const list = vi
        .fn<TagsApi['list']>()
        .mockReturnValueOnce(of(LIST))
        .mockReturnValueOnce(old)
        .mockReturnValue(of([tag('latest')]));
      const { store } = setup({ list });
      await store.load();

      const stale = store.refresh();
      await store.refresh();
      old.next(LIST);
      old.complete();
      await stale;

      expect(names(store)).toEqual(['latest']);
    });

    it('forgets everything on reset, including pending deletes', async () => {
      const { api, store } = setup();
      await store.load();
      store.hide('tag-winter');

      store.reset();
      await store.flushPending();

      expect(store.count()).toBe(0);
      expect(store.loaded()).toBe(false);
      expect(api.remove).not.toHaveBeenCalled();
    });

    it('drops a list that arrives after sign-out', async () => {
      const slow = new Subject<readonly TagResponse[]>();
      const { store } = setup({ list: vi.fn(() => slow) });

      const loading = store.load();
      store.reset();
      slow.next(LIST);
      slow.complete();
      await loading;

      expect(store.count()).toBe(0);
      expect(store.loaded()).toBe(false);
    });

    it('drops a created tag that arrives after sign-out', async () => {
      const slow = new Subject<TagResponse>();
      const { store } = setup({ create: vi.fn(() => slow) });
      await store.load();

      const creating = store.create('late');
      store.reset();
      slow.next(tag('late'));
      slow.complete();

      expect((await creating).outcome).toBe(TAG_OUTCOME.Failed);
      expect(store.count()).toBe(0);
    });

    it('does not load again while the first request runs', () => {
      const { api, store } = setup({ list: vi.fn(() => NEVER) });

      void store.load();
      void store.load();

      expect(api.list).toHaveBeenCalledTimes(1);
    });
  });
});
