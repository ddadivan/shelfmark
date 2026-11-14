import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import type { FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_ID, MOCK_TAGS } from '@shelfmark/contracts/testing';
import { ViewportService } from '../../../core/layout/viewport.service';
import { FoldersStore } from '../../../stores/folders.store';
import { TagsStore } from '../../../stores/tags.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import type { LinksFilter } from '../../links/models/links-filter.type';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { LibraryFilterService } from './library-filter.service';
import { SplitViewService } from './split-view.service';

const A = MOCK_ID.FolderReading;
const B = MOCK_ID.FolderAngular;

function setup({ wide = true, loaded = true } = {}) {
  const router = { navigate: vi.fn(() => Promise.resolve(true)) };
  const splitParam = signal<unknown>(undefined);
  const filter = signal<LinksFilter>({ scope: LINKS_SCOPE.All });
  const viewportWide = signal(wide);
  const foldersLoaded = signal(loaded);
  const entityMap: Record<string, FolderResponse> = Object.fromEntries(
    MOCK_FOLDERS.map((folder) => [folder.id, { ...folder }]),
  );
  TestBed.configureTestingModule({
    providers: [
      SplitViewService,
      { provide: Router, useValue: router },
      { provide: LibraryFilterService, useValue: { splitParam, filter } },
      { provide: ViewportService, useValue: { wide: viewportWide } },
      {
        provide: FoldersStore,
        useValue: {
          entityMap: () => entityMap,
          entities: () => MOCK_FOLDERS,
          loaded: foldersLoaded,
        },
      },
      { provide: TagsStore, useValue: { entities: () => MOCK_TAGS } },
      { provide: UserSettingsStore, useValue: { shownColour: (colour: string) => colour } },
      { provide: TranslocoService, useValue: { translate: (key: string) => key } },
    ],
  });
  return {
    service: TestBed.inject(SplitViewService),
    router,
    splitParam,
    filter,
    viewportWide,
    foldersLoaded,
  };
}

describe('SplitViewService', () => {
  it('is closed without ?split and open with any value from 80em', () => {
    const { service, splitParam } = setup();
    expect(service.open()).toBe(false);
    expect(service.rightTarget()).toBeUndefined();

    splitParam.set('');
    expect(service.open()).toBe(true);
    expect(service.rightTarget()).toBeUndefined();
  });

  it('ignores ?split below 80em', () => {
    const { service, splitParam, viewportWide } = setup({ wide: false });
    splitParam.set(B);

    expect(service.open()).toBe(false);
    expect(service.rightTarget()).toBeUndefined();
    expect(service.rightDropValue()).toBeNull();

    viewportWide.set(true);
    expect(service.rightTarget()).toBe(B);
  });

  it('resolves a folder, Unsorted and an invalid target', () => {
    const { service, splitParam } = setup();
    splitParam.set(B);
    expect(service.rightTarget()).toBe(B);
    expect(service.rightFolder()?.id).toBe(B);
    expect(service.rightDropValue()).toBe(B);

    splitParam.set('unsorted');
    expect(service.rightTarget()).toBeNull();
    expect(service.rightFolder()).toBeUndefined();
    expect(service.rightDropValue()).toBe('unsorted');

    splitParam.set(MOCK_ID.LinkPasta);
    expect(service.rightTarget()).toBeUndefined();
    expect(service.rightDropValue()).toBeNull();
  });

  it('shows the picker for the folder the left half shows, without rewriting the URL', () => {
    const { service, splitParam, filter, router } = setup();
    splitParam.set(A);
    filter.set({ scope: LINKS_SCOPE.Folder, folderId: A });

    expect(service.rightTarget()).toBeUndefined();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('waits for the folder list before it trusts a folder id', () => {
    const { service, splitParam, foldersLoaded } = setup({ loaded: false });
    splitParam.set(B);
    expect(service.resolving()).toBe(true);
    expect(service.rightTarget()).toBeUndefined();

    foldersLoaded.set(true);
    expect(service.resolving()).toBe(false);
    expect(service.rightTarget()).toBe(B);
  });

  it('gives the drop values of the left half', () => {
    const { service, filter } = setup();
    expect(service.leftDropValue()).toBeNull();

    filter.set({ scope: LINKS_SCOPE.Folder, folderId: A });
    expect(service.leftDropValue()).toBe(A);

    filter.set({ scope: LINKS_SCOPE.Unsorted });
    expect(service.leftDropValue()).toBe('unsorted');
  });

  it('can swap only for a folder or Unsorted on the left and a target on the right', () => {
    const { service, splitParam, filter } = setup();
    splitParam.set(B);
    expect(service.canSwap()).toBe(false);

    filter.set({ scope: LINKS_SCOPE.Unsorted });
    expect(service.canSwap()).toBe(true);

    splitParam.set('');
    expect(service.canSwap()).toBe(false);
  });

  it.each([
    ['Favorites', { scope: LINKS_SCOPE.Favorites }],
    ['all links', { scope: LINKS_SCOPE.All }],
    ['a tag', { scope: LINKS_SCOPE.All, tags: [MOCK_TAGS[0].id] }],
    ['search results', { scope: LINKS_SCOPE.All, q: 'pasta' }],
  ] as [string, LinksFilter][])('cannot swap while the left half shows %s', (_name, left) => {
    const { service, splitParam, filter } = setup();
    splitParam.set(B);
    filter.set(left);

    expect(service.canSwap()).toBe(false);
  });

  it('names the options, the current rows and the labels of both halves', () => {
    const { service, splitParam, filter } = setup();
    splitParam.set(B);
    filter.set({ scope: LINKS_SCOPE.Folder, folderId: A });

    expect(service.leftOptions()[0].id).toBe('scope:all');
    expect(service.rightOptions().map((option) => option.id)).toEqual([A]);
    expect(service.leftValue()).toBe(A);
    expect(service.rightValue()).toBe(B);
    expect(service.leftCurrentIds()).toEqual([B]);
    expect(service.rightCurrentIds()).toEqual([A]);
    expect(service.leftLabel()).toBe(MOCK_FOLDERS[0].name);
    expect(service.rightLabel()).toBe(MOCK_FOLDERS[1].name);

    splitParam.set('unsorted');
    expect(service.rightLabel()).toBe('library.scope.unsorted');
  });

  describe('navigation', () => {
    it('opens with the picker (pushed) only when wide', async () => {
      const { service, router, viewportWide } = setup();

      await service.openSplit();
      expect(router.navigate).toHaveBeenCalledWith([], {
        queryParams: { split: '' },
        queryParamsHandling: 'merge',
        replaceUrl: false,
      });

      router.navigate.mockClear();
      viewportWide.set(false);
      await service.openSplit();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('replaces the entry on the first choice from the picker, then pushes', async () => {
      const { service, router, splitParam } = setup();
      splitParam.set('');

      await service.chooseRight(B);
      expect(router.navigate).toHaveBeenLastCalledWith([], {
        queryParams: { split: B },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });

      splitParam.set(B);
      await service.chooseRight(null);
      expect(router.navigate).toHaveBeenLastCalledWith([], {
        queryParams: { split: 'unsorted' },
        queryParamsHandling: 'merge',
        replaceUrl: false,
      });
    });

    it('closes by removing the parameter', async () => {
      const { service, router, splitParam } = setup();
      splitParam.set(B);

      await service.close();

      expect(router.navigate).toHaveBeenCalledWith([], {
        queryParams: { split: null },
        queryParamsHandling: 'merge',
      });
    });

    it('changes the left feed and keeps the split', async () => {
      const { service, router, splitParam } = setup();
      splitParam.set(B);

      await service.chooseLeft(A);
      expect(router.navigate).toHaveBeenLastCalledWith(['/', 'folders', A], {
        queryParams: { split: B },
      });

      await service.chooseLeft('tag:docs');
      expect(router.navigate).toHaveBeenLastCalledWith(['/', 'links'], {
        queryParams: { tag: 'docs', split: B },
      });

      await service.chooseLeft(null);
      expect(router.navigate).toHaveBeenLastCalledWith(['/', 'unsorted'], {
        queryParams: { split: B },
      });
    });

    it('keeps an empty picker when the left feed changes', async () => {
      const { service, router, splitParam } = setup();
      splitParam.set('');

      await service.chooseLeft('scope:favorites');

      expect(router.navigate).toHaveBeenCalledWith(['/', 'favorites'], {
        queryParams: { split: '' },
      });
    });

    it('swaps the halves', async () => {
      const { service, router, splitParam, filter } = setup();
      splitParam.set(B);
      filter.set({ scope: LINKS_SCOPE.Folder, folderId: A });

      await service.swap();

      expect(router.navigate).toHaveBeenCalledWith(['/', 'folders', B], {
        queryParams: { split: A },
      });
    });

    it('swaps Unsorted on the left with the folder on the right', async () => {
      const { service, router, splitParam, filter } = setup();
      splitParam.set(B);
      filter.set({ scope: LINKS_SCOPE.Unsorted });

      await service.swap();

      expect(router.navigate).toHaveBeenCalledWith(['/', 'folders', B], {
        queryParams: { split: 'unsorted' },
      });
    });

    it('swaps a folder on the left with Unsorted on the right', async () => {
      const { service, router, splitParam, filter } = setup();
      splitParam.set('unsorted');
      filter.set({ scope: LINKS_SCOPE.Folder, folderId: A });

      await service.swap();

      expect(router.navigate).toHaveBeenCalledWith(['/', 'unsorted'], {
        queryParams: { split: A },
      });
    });

    it('does not swap while the left half shows Favorites', async () => {
      const { service, router, splitParam, filter } = setup();
      splitParam.set(B);
      filter.set({ scope: LINKS_SCOPE.Favorites });

      await service.swap();

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('does not swap when it cannot', async () => {
      const { service, router, splitParam } = setup();
      splitParam.set(B);

      await service.swap();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
