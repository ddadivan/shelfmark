import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LINK_KIND, SAVED_VIEW_LIMIT, SAVED_VIEW_SCOPE } from '@shelfmark/contracts';
import { MOCK_ID } from '@shelfmark/contracts/testing';
import { VIEW_OUTCOME } from '../../../stores/models/view-outcome.const';
import { SavedViewsStore } from '../../../stores/saved-views.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { MockSavedViewsApi } from '../mock/mock-saved-views.api';
import { SAVED_VIEWS_API } from '../models/saved-views-api.const';
import { SavedViewActionsService } from './saved-view-actions.service';
import { normalizeViewQuery } from '../utils/saved-view-query';

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([
        { path: 'links', children: [] },
        { path: 'unsorted', children: [] },
        { path: 'favorites', children: [] },
        { path: 'folders/:folderId', children: [] },
      ]),
      { provide: SAVED_VIEWS_API, useClass: MockSavedViewsApi },
    ],
  });
  await loadEnglish();
  const store = TestBed.inject(SavedViewsStore);
  await store.load();
  return {
    store,
    router: TestBed.inject(Router),
    data: TestBed.inject(MockLibraryData),
    actions: TestBed.inject(SavedViewActionsService),
  };
}

function root(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-dialog-container');
}

function dialog(): HTMLElement {
  const element = root();
  if (!element) {
    throw new Error('no dialog open');
  }
  return element;
}

async function until(check: () => void): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.tick();
      check();
    },
    { timeout: 3000 },
  );
}

async function opened(): Promise<HTMLElement> {
  await until(() => {
    expect(root()).not.toBeNull();
  });
  return dialog();
}

async function closed(): Promise<void> {
  await until(() => {
    expect(root()).toBeNull();
  });
}

function button(label: string): HTMLButtonElement {
  const found = [...dialog().querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!found) {
    throw new Error(`no button ${label}`);
  }
  return found;
}

function type(value: string): void {
  const field = dialog().querySelector<HTMLInputElement>('input');
  if (!field) {
    throw new Error('no name field');
  }
  field.value = value;
  field.dispatchEvent(new Event('input'));
  field.dispatchEvent(new Event('blur'));
  TestBed.tick();
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container > *').forEach((node) => {
    node.remove();
  });
});

describe('SavedViewActionsService', () => {
  it('applies a view through the router, and All', async () => {
    const { actions, store, router } = await setup();
    await actions.apply(store.items()[0]);
    expect(router.url).toBe('/links?kind=video');
    await actions.applyAll();
    expect(router.url).toBe('/links');
  });

  it('applies a view and All inside the feed it is opened on (#335)', async () => {
    const { actions, store, router } = await setup();
    const folder = { scope: LINKS_SCOPE.Folder, folderId: 'f1' } as const;
    await actions.apply(store.items()[0], folder, store.items());
    expect(router.url).toBe('/folders/f1?kind=video');
    await actions.applyAll({ ...folder, kind: 'video' }, store.items());
    expect(router.url).toBe('/folders/f1');
    await actions.apply(store.items()[1], { scope: LINKS_SCOPE.Favorites }, store.items());
    expect(router.url).toBe('/favorites?kind=article');
  });

  it('does not apply a view whose folder is gone, and says why', async () => {
    const { actions, store, router, data } = await setup();
    data.views = [
      ...data.views,
      {
        id: 'gone',
        name: 'Old work',
        query: normalizeViewQuery({ scope: SAVED_VIEW_SCOPE.Folder, folderId: 'missing' }),
      },
    ];
    await store.refresh();
    const view = store.items().find((item) => item.id === 'gone');
    expect(view?.available).toBe(false);
    await actions.apply(view ?? store.items()[0]);
    expect(router.url).toBe('/');
    await until(() => {
      expect(document.body.textContent).toContain('This view is waiting for its folder');
    });
  });

  it('saves the current filter under a name and says so', async () => {
    const { actions, store } = await setup();
    const done = actions.saveCurrent({ scope: LINKS_SCOPE.Unsorted, kind: LINK_KIND.Article });
    await opened();
    expect(dialog().textContent).toContain('Save this view');
    button('Save view').click();
    await until(() => {
      expect(dialog().textContent).toContain('Enter a name');
    });
    type('Inbox articles');
    button('Save view').click();
    await closed();
    await done;
    expect(store.items().at(-1)).toMatchObject({
      name: 'Inbox articles',
      // Saved on a feed other than All links: only the type, so it works on every feed (#335).
      query: { scope: SAVED_VIEW_SCOPE.All, tags: [], q: '', kind: LINK_KIND.Article },
    });
    await until(() => {
      expect(document.body.textContent).toContain('View saved');
    });
  });

  it('keeps the dialog open with the reason when the save fails', async () => {
    const { actions, store } = await setup();
    const done = actions.saveCurrent({ scope: LINKS_SCOPE.All });
    await opened();
    type('Fails to save');
    button('Save view').click();
    await until(() => {
      expect(dialog().textContent).toContain("Couldn't save the view");
    });
    expect(store.items()).toHaveLength(2);
    button('Cancel').click();
    await closed();
    await done;
  });

  it('explains a missing folder in the dialog', async () => {
    const { actions, store } = await setup();
    vi.spyOn(store, 'create').mockResolvedValue(VIEW_OUTCOME.Missing);
    const done = actions.saveCurrent({ scope: LINKS_SCOPE.All });
    await opened();
    type('Gone');
    button('Save view').click();
    await until(() => {
      expect(dialog().textContent).toContain('The folder of this view is gone');
    });
    button('Cancel').click();
    await closed();
    await done;
  });

  it('refuses a new view at the limit with a toast, without a dialog', async () => {
    const { actions, store, data } = await setup();
    data.views = Array.from({ length: SAVED_VIEW_LIMIT.PerUserMax }, (_, index) => ({
      id: `v${index}`,
      name: `v${index}`,
      query: normalizeViewQuery({ scope: SAVED_VIEW_SCOPE.All }),
    }));
    await store.refresh();
    await actions.saveCurrent({ scope: LINKS_SCOPE.All });
    expect(root()).toBeNull();
    await until(() => {
      expect(document.body.textContent).toContain('Saved views are full');
    });
  });

  it('renames, and puts the old name back with a toast when it fails', async () => {
    const { actions, store } = await setup();
    let done = actions.rename(store.items()[0]);
    await opened();
    expect(dialog().querySelector('input')?.value).toBe('Videos');
    type('Clips');
    button('Rename').click();
    await closed();
    await done;
    await until(() => {
      expect(store.items()[0]?.name).toBe('Clips');
    });

    done = actions.rename(store.items()[0]);
    await opened();
    type('Fails to save');
    button('Rename').click();
    await closed();
    await done;
    await until(() => {
      expect(store.items()[0]?.name).toBe('Clips');
      expect(document.body.textContent).toContain("Couldn't rename the view");
    });
  });

  it('deletes after a confirmation only', async () => {
    const { actions, store } = await setup();
    let done = actions.delete(store.items()[1]);
    await opened();
    expect(dialog().textContent).toContain('Delete view Articles?');
    button('Cancel').click();
    await closed();
    await done;
    expect(store.items()).toHaveLength(2);

    done = actions.delete(store.items()[1]);
    await opened();
    button('Delete view').click();
    await closed();
    await done;
    expect(store.items().map((item) => item.name)).toEqual(['Videos']);
    await until(() => {
      expect(document.body.textContent).toContain('View deleted');
    });
  });

  it('moves a view left and right', async () => {
    const { actions, store } = await setup();
    await actions.move(store.items()[0], 1);
    expect(store.items().map((item) => item.name)).toEqual(['Articles', 'Videos']);
    await actions.move(store.items()[1], -1);
    expect(store.items().map((item) => item.name)).toEqual(['Videos', 'Articles']);
    await actions.move({ ...store.items()[0], id: 'missing' }, 1);
    expect(store.items().map((item) => item.name)).toEqual(['Videos', 'Articles']);
  });

  it('a folder view leads to its folder', async () => {
    const { actions, store, router, data } = await setup();
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
    await store.refresh();
    await actions.apply(store.items()[0]);
    expect(router.url).toBe(`/folders/${MOCK_ID.FolderReading}`);
  });
});
