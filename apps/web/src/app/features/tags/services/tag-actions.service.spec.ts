import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MOCK_ID, MOCK_NAME } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import { TagsStore } from '../../../stores/tags.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { LINKS_API } from '../../links/models/links-api.const';
import { TAGS_API } from '../../links/models/tags-api.const';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockLinksApi } from '../../links/mock/mock-links.api';
import { MockTagsApi } from '../../links/mock/mock-tags.api';
import type { UndoToastOptions } from '../../../core/undo/models/undo-toast-options.interface';
import { UndoToastService } from '../../../core/undo/undo-toast.service';
import { TagActionsService } from './tag-actions.service';

async function setup(confirmed = true) {
  const shown: UndoToastOptions[] = [];
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([{ path: 'links', children: [] }]),
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      { provide: UndoToastService, useValue: { show: (o: UndoToastOptions) => shown.push(o) } },
    ],
  });
  await loadEnglish();
  const confirm = vi.fn(() => Promise.resolve(confirmed));
  vi.spyOn(TestBed.inject(DialogService), 'confirm').mockImplementation(confirm);
  const store = TestBed.inject(TagsStore);
  await store.load();
  return {
    store,
    shown,
    confirm,
    router: TestBed.inject(Router),
    data: TestBed.inject(MockLibraryData),
    actions: TestBed.inject(TagActionsService),
  };
}

const tagById = (store: InstanceType<typeof TagsStore>, id: string) => {
  const tag = store.entityMap()[id];
  if (!tag) {
    throw new Error(`no tag ${id}`);
  }
  return tag;
};
const docs = (store: InstanceType<typeof TagsStore>) => tagById(store, MOCK_ID.TagDocs);

describe('TagActionsService', () => {
  it('shows the links of a tag through the tag query on the links page', async () => {
    const { actions, router } = await setup();

    await actions.showLinks('winter sale');

    expect(router.url).toBe('/links?tag=winter%20sale');
  });

  describe('delete', () => {
    it('does nothing when the confirmation is declined', async () => {
      const { actions, store, shown } = await setup(false);

      await actions.delete(docs(store));

      expect(store.entityMap()[MOCK_ID.TagDocs]).toBeDefined();
      expect(shown).toHaveLength(0);
    });

    it('asks with the link count, hides the tag and offers Undo', async () => {
      const { actions, store, shown, confirm } = await setup();

      await actions.delete(docs(store));

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: `Delete tag “${MOCK_NAME.TagDocs}”?`,
          destructive: true,
        }),
      );
      expect(store.entityMap()[MOCK_ID.TagDocs]).toBeUndefined();
      expect(shown).toHaveLength(1);
      expect(shown[0].actionLabel).toBe('Undo');
    });

    it('brings the tag back on Undo and never sends the delete', async () => {
      const { actions, store, shown, data } = await setup();
      await actions.delete(docs(store));

      shown[0].onUndo();

      expect(store.entityMap()[MOCK_ID.TagDocs]).toBeDefined();
      expect(data.tagList.some((tag) => tag.id === MOCK_ID.TagDocs)).toBe(true);
    });

    it('deletes on the server when the Undo window ends, and leaves the filter of that tag', async () => {
      const { actions, store, shown, data, router } = await setup();
      await router.navigateByUrl('/links?tag=docs&tag=recipes');
      await actions.delete(docs(store));

      shown[0].onExpire();
      await vi.waitFor(() => {
        expect(data.tagList.some((tag) => tag.id === MOCK_ID.TagDocs)).toBe(false);
        expect(router.url).toBe('/links?tag=recipes');
      });
    });
  });

  describe('merge offer after a rename conflict', () => {
    it('merges into the existing tag and points the filter at it', async () => {
      const { actions, store, router, data } = await setup();
      await router.navigateByUrl('/links?tag=docs');

      const merged = await actions.mergeInto(docs(store), tagById(store, MOCK_ID.TagRecipes));

      expect(merged).toBe(true);
      expect(data.tagList.some((tag) => tag.id === MOCK_ID.TagDocs)).toBe(false);
      await vi.waitFor(() => expect(router.url).toBe('/links?tag=recipes'));
    });
  });

  describe('merge dialog', () => {
    it('updates the filter in submit, so closing the dialog mid-merge loses nothing', async () => {
      const { actions, store, router, data } = await setup();
      await router.navigateByUrl('/links?tag=docs');
      const dialogs = TestBed.inject(DialogService);
      let submit: ((targetId: string) => Promise<boolean>) | undefined;
      vi.spyOn(dialogs, 'open').mockImplementation(((_component: unknown, config: unknown) => {
        submit = (config as { data: { submit: typeof submit } }).data.submit;
        return { result: Promise.resolve(undefined) };
      }) as unknown as typeof dialogs.open);

      await actions.merge(docs(store));
      const merged = await submit?.(MOCK_ID.TagRecipes);

      expect(merged).toBe(true);
      expect(data.tagList.some((tag) => tag.id === MOCK_ID.TagDocs)).toBe(false);
      await vi.waitFor(() => expect(router.url).toBe('/links?tag=recipes'));
    });

    it('reads the filter from the URL the way the page does (spaces, case)', async () => {
      const { actions, router } = await setup();
      await router.navigateByUrl('/links?tag=Winter%20Sale');

      actions.renamed('winter-sale', 'summer');

      await vi.waitFor(() => expect(router.url).toBe('/links?tag=summer'));
    });
  });

  it('follows a renamed tag in the open filter and collapses duplicates', async () => {
    const { actions, router } = await setup();
    await router.navigateByUrl('/links?tag=docs&tag=recipes');

    actions.renamed('docs', 'recipes');

    await vi.waitFor(() => expect(router.url).toBe('/links?tag=recipes'));
  });
});
