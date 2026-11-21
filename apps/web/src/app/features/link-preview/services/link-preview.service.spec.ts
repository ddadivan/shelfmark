import { DOCUMENT } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import {
  LIBRARY_SETTINGS_DEFAULT,
  LINK_FRAMING,
  type LibrarySettings,
  type LinkFrameCheckResponse,
  type LinkResponse,
} from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { LinksStore } from '../../../stores/links.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { stubClipboard } from '../../../../testing/stub-clipboard';
import { LibraryFeedService } from '../../library/services/library-feed.service';
import { LINKS_API } from '../../links/models/links-api.const';
import type { LinksApi } from '../../links/models/links-api.interface';
import { LinkActionsService } from '../../links/services/link-actions.service';
import { PREVIEW_BODY_KIND } from '../models/preview-body-kind.const';
import { PREVIEW_LIST_WIDTH } from '../models/preview-list-width.const';
import { LinkPreviewRoute } from './link-preview-route.service';
import { LinkPreviewService } from './link-preview.service';

const link = (n: number, url = `https://site${n}.example/page`): LinkResponse => ({
  ...MOCK_LINKS[0],
  id: `id-${n}`,
  title: `Link ${n}`,
  url,
});

function frameAnswer(patch: Partial<LinkFrameCheckResponse> = {}): LinkFrameCheckResponse {
  return {
    linkId: 'id-1',
    host: 'site1.example',
    framing: LINK_FRAMING.Allowed,
    checkedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  };
}

interface SetupOptions {
  links?: LinkResponse[];
  feed?: LinkResponse[];
  currentId?: string | null;
  library?: Partial<LibrarySettings>;
  get?: LinksApi['get'];
  frameCheck?: LinksApi['frameCheck'];
  setLibrary?: (change: Partial<LibrarySettings>) => Promise<boolean>;
  doc?: Partial<Document>;
}

function setup(options: SetupOptions = {}) {
  const links = options.links ?? [link(1), link(2), link(3)];
  const entityMap = signal<Record<string, LinkResponse>>(
    Object.fromEntries(links.map((item) => [item.id, item])),
  );
  const currentId = signal<string | null>(
    options.currentId === undefined ? 'id-1' : options.currentId,
  );
  const route = {
    currentId,
    split: signal(true),
    pushed: signal(false),
    open: vi.fn((id: string) => {
      currentId.set(id);
      return Promise.resolve();
    }),
    close: vi.fn(() => {
      currentId.set(null);
      return Promise.resolve();
    }),
  };
  const feed = { shownLinks: signal(options.feed ?? links) };
  const api = {
    get: vi.fn<LinksApi['get']>(options.get ?? (() => throwError(() => new Error('404')))),
    frameCheck: vi.fn<LinksApi['frameCheck']>(options.frameCheck ?? (() => of(frameAnswer()))),
  };
  const library = signal<LibrarySettings>({ ...LIBRARY_SETTINGS_DEFAULT, ...options.library });
  const settings = {
    libraryShown: library,
    setLibrary: vi.fn(options.setLibrary ?? (() => Promise.resolve(true))),
  };
  const actions = {
    open: vi.fn(),
    toggleFavorite: vi.fn(() => Promise.resolve()),
    edit: vi.fn(() => Promise.resolve()),
  };
  const toasts = { show: vi.fn() };
  const transloco = { translate: vi.fn((key: string) => key) };
  TestBed.configureTestingModule({
    providers: [
      LinkPreviewService,
      { provide: LinkPreviewRoute, useValue: route },
      { provide: LinksStore, useValue: { entityMap } },
      { provide: LibraryFeedService, useValue: feed },
      { provide: LINKS_API, useValue: api },
      { provide: UserSettingsStore, useValue: settings },
      { provide: LinkActionsService, useValue: actions },
      { provide: ToastService, useValue: toasts },
      { provide: TranslocoService, useValue: transloco },
      ...(options.doc ? [{ provide: DOCUMENT, useValue: options.doc }] : []),
    ],
  });
  const service = TestBed.inject(LinkPreviewService);
  return { service, route, feed, api, settings, actions, toasts, entityMap, currentId, library };
}

async function settle(): Promise<void> {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
  TestBed.tick();
}

describe('LinkPreviewService', () => {
  beforeEach(() => localStorage.removeItem(PREVIEW_LIST_WIDTH.StorageKey));
  afterAll(() => localStorage.removeItem(PREVIEW_LIST_WIDTH.StorageKey));

  describe('current link', () => {
    it('has no link and shows the loading body when nothing is open', async () => {
      const { service } = setup({ currentId: null });
      await settle();
      expect(service.link()).toBeNull();
      expect(service.host()).toBe('');
      expect(service.href()).toBeUndefined();
      expect(service.body()).toBe(PREVIEW_BODY_KIND.Loading);
    });

    it('takes the link from the store', async () => {
      const { service } = setup();
      await settle();
      expect(service.link()?.id).toBe('id-1');
      expect(service.host()).toBe('site1.example');
      expect(service.href()).toBe('https://site1.example/page');
    });

    it('reads a link the feed does not hold from the API', async () => {
      const other = link(9);
      const { service, api } = setup({
        links: [],
        currentId: 'id-9',
        get: () => of(other),
      });
      await settle();
      expect(api.get).toHaveBeenCalledWith('id-9');
      expect(service.link()).toEqual(other);
    });

    it('ignores an answer for a link that is no longer open', async () => {
      const { service, currentId, api } = setup({
        links: [],
        currentId: 'id-9',
        get: () => {
          currentId.set('id-8');
          return of(link(9));
        },
      });
      await settle();
      expect(api.get).toHaveBeenCalledWith('id-9');
      expect(service.link()).toBeNull();
    });

    it('closes the preview when the link cannot be read', async () => {
      const { route } = setup({ links: [], currentId: 'id-9' });
      await settle();
      await settle();
      expect(route.close).toHaveBeenCalledTimes(1);
    });

    it('does not close a preview that was switched while the read failed', async () => {
      const { route, currentId } = setup({
        links: [link(1)],
        currentId: 'id-9',
        get: () => {
          currentId.set('id-1');
          return throwError(() => new Error('gone'));
        },
      });
      await settle();
      expect(route.close).not.toHaveBeenCalled();
    });
  });

  describe('body', () => {
    it('shows the site for an https link that allows framing', async () => {
      const { service } = setup();
      await settle();
      expect(service.body()).toBe(PREVIEW_BODY_KIND.Site);
    });

    it('shows the player for a video link and runs no frame check', async () => {
      const { service, api } = setup({
        links: [link(1, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')],
      });
      await settle();
      expect(service.body()).toBe(PREVIEW_BODY_KIND.Video);
      expect(service.embedUrl()).toContain('youtube-nocookie.com');
      expect(api.frameCheck).not.toHaveBeenCalled();
    });

    it('is blocked for a plain http link without asking the server', async () => {
      const { service, api } = setup({ links: [link(1, 'http://site1.example/')] });
      await settle();
      expect(service.body()).toBe(PREVIEW_BODY_KIND.Blocked);
      expect(api.frameCheck).not.toHaveBeenCalled();
    });

    it('is blocked when the frame check says blocked', async () => {
      const { service, api } = setup({
        frameCheck: () => of(frameAnswer({ framing: LINK_FRAMING.Blocked })),
      });
      await settle();
      expect(api.frameCheck).toHaveBeenCalledWith('id-1');
      expect(service.body()).toBe(PREVIEW_BODY_KIND.Blocked);
    });

    it('stays on the site when the frame check fails', async () => {
      const { service } = setup({ frameCheck: () => throwError(() => new Error('offline')) });
      await settle();
      expect(service.body()).toBe(PREVIEW_BODY_KIND.Site);
    });

    it('is blocked when the frame sends no load in time, for that link only', async () => {
      const { service, route } = setup();
      await settle();
      service.frameTimedOut();
      expect(service.body()).toBe(PREVIEW_BODY_KIND.Blocked);
      await route.open('id-2');
      await settle();
      expect(service.body()).toBe(PREVIEW_BODY_KIND.Site);
    });
  });

  describe('recording an open', () => {
    it('records one open per link while it stays open', async () => {
      const { actions, entityMap } = setup();
      await settle();
      expect(actions.open).toHaveBeenCalledTimes(1);
      expect(actions.open).toHaveBeenCalledWith(expect.objectContaining({ id: 'id-1' }));
      // The link changes in the store (a favorite toggle): no second open.
      entityMap.update((all) => ({ ...all, 'id-1': { ...all['id-1'], isFavorite: true } }));
      await settle();
      expect(actions.open).toHaveBeenCalledTimes(1);
    });

    it('records again after another link, and after the preview was closed', async () => {
      const { actions, route } = setup();
      await settle();
      await route.open('id-2');
      await settle();
      expect(actions.open).toHaveBeenCalledTimes(2);
      await route.close();
      await settle();
      await route.open('id-2');
      await settle();
      expect(actions.open).toHaveBeenCalledTimes(3);
    });
  });

  describe('previous and next', () => {
    it('follow the feed order', async () => {
      const { service } = setup({ currentId: 'id-2' });
      await settle();
      expect(service.previousId()).toBe('id-1');
      expect(service.nextId()).toBe('id-3');
    });

    it('go opens the neighbour, and nothing at the ends', async () => {
      const { service, route } = setup({ currentId: 'id-1' });
      await settle();
      await service.go(-1);
      expect(route.open).not.toHaveBeenCalled();
      await service.go(1);
      expect(route.open).toHaveBeenCalledWith('id-2');
      await service.go(1);
      await service.go(1);
      expect(route.open).toHaveBeenLastCalledWith('id-3');
      await service.go(1);
      expect(route.open).toHaveBeenCalledTimes(2);
    });

    it('open asks the route for the link', async () => {
      const { service, route } = setup();
      await service.open({ id: 'id-3' });
      expect(route.open).toHaveBeenCalledWith('id-3');
    });
  });

  describe('close', () => {
    it('shows the list again and closes the route', async () => {
      const { service, route } = setup();
      service.toggleList();
      expect(service.listHidden()).toBe(true);
      await service.close();
      expect(service.listHidden()).toBe(false);
      expect(route.close).toHaveBeenCalledTimes(1);
    });

    it('toggleList flips the hidden state', () => {
      const { service } = setup();
      service.toggleList();
      service.toggleList();
      expect(service.listHidden()).toBe(false);
    });
  });

  describe('toolbar actions', () => {
    it('opens the link in a new tab without an opener, and records the open', async () => {
      const open = vi.fn();
      const { service, actions } = setup({
        doc: { defaultView: { open } } as unknown as Partial<Document>,
      });
      await settle();
      actions.open.mockClear();
      service.openInNewTab();
      expect(open).toHaveBeenCalledWith(
        'https://site1.example/page',
        '_blank',
        'noopener,noreferrer',
      );
      expect(actions.open).toHaveBeenCalledTimes(1);
    });

    it('opens nothing when the address is not safe to open', async () => {
      const open = vi.spyOn(window, 'open').mockReturnValue(null);
      const { service, actions } = setup({ links: [link(1, 'javascript:alert(1)')] });
      await settle();
      actions.open.mockClear();
      service.openInNewTab();
      expect(open).not.toHaveBeenCalled();
      expect(actions.open).not.toHaveBeenCalled();
      open.mockRestore();
    });

    it('does nothing for favorite, edit and open without a link', async () => {
      const { service, actions } = setup({ currentId: null });
      await settle();
      service.toggleFavorite();
      service.edit();
      service.openInNewTab();
      await service.copyLink();
      await service.share();
      expect(actions.toggleFavorite).not.toHaveBeenCalled();
      expect(actions.edit).not.toHaveBeenCalled();
    });

    it('hands the link to the favorite and edit flows', async () => {
      const { service, actions } = setup();
      await settle();
      service.toggleFavorite();
      service.edit();
      expect(actions.toggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 'id-1' }));
      expect(actions.edit).toHaveBeenCalledWith(expect.objectContaining({ id: 'id-1' }));
    });
  });

  describe('copy and share', () => {
    let restore: () => void = () => undefined;
    afterEach(() => restore());

    it('copies the address and confirms with a success toast', async () => {
      const writeText = vi.fn(() => Promise.resolve());
      restore = stubClipboard({ writeText });
      const { service, toasts } = setup();
      await settle();
      await service.copyLink();
      expect(writeText).toHaveBeenCalledWith('https://site1.example/page');
      expect(toasts.show).toHaveBeenCalledWith({
        kind: TOAST_KIND.Success,
        title: 'preview.copied',
      });
    });

    it('tells the person when the clipboard refuses', async () => {
      restore = stubClipboard({ writeText: () => Promise.reject(new Error('denied')) });
      const { service, toasts } = setup();
      await settle();
      await service.copyLink();
      expect(toasts.show).toHaveBeenCalledWith({
        kind: TOAST_KIND.Danger,
        title: 'preview.copyFailed',
      });
    });

    it('shares through the system sheet where there is one', async () => {
      const share = vi.fn(() => Promise.resolve());
      const writeText = vi.fn(() => Promise.resolve());
      restore = stubClipboard({ writeText });
      Object.defineProperty(navigator, 'share', { value: share, configurable: true });
      try {
        const { service, toasts } = setup();
        await settle();
        await service.share();
        expect(share).toHaveBeenCalledWith({ title: 'Link 1', url: 'https://site1.example/page' });
        expect(writeText).not.toHaveBeenCalled();
        expect(toasts.show).not.toHaveBeenCalled();
      } finally {
        Reflect.deleteProperty(navigator, 'share');
      }
    });

    it('says nothing when the share sheet is cancelled', async () => {
      Object.defineProperty(navigator, 'share', {
        value: () => Promise.reject(new Error('AbortError')),
        configurable: true,
      });
      try {
        const { service, toasts } = setup();
        await settle();
        await expect(service.share()).resolves.toBeUndefined();
        expect(toasts.show).not.toHaveBeenCalled();
      } finally {
        Reflect.deleteProperty(navigator, 'share');
      }
    });

    it('falls back to copying without a share sheet', async () => {
      const writeText = vi.fn(() => Promise.resolve());
      restore = stubClipboard({ writeText });
      const { service, toasts } = setup();
      await settle();
      await service.share();
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(toasts.show).toHaveBeenCalledTimes(1);
    });
  });

  describe('always open in a new tab', () => {
    it('reflects the host being in the setting', async () => {
      const { service, library } = setup({ library: { previewNewTabHosts: ['site1.example'] } });
      await settle();
      expect(service.alwaysNewTab()).toBe(true);
      library.update((value) => ({ ...value, previewNewTabHosts: [] }));
      expect(service.alwaysNewTab()).toBe(false);
    });

    it('adds the host', async () => {
      const { service, settings } = setup({ library: { previewNewTabHosts: ['other.example'] } });
      await settle();
      await service.setAlwaysNewTab(true);
      expect(settings.setLibrary).toHaveBeenCalledWith({
        previewNewTabHosts: ['other.example', 'site1.example'],
      });
    });

    it('removes the host', async () => {
      const { service, settings } = setup({
        library: { previewNewTabHosts: ['other.example', 'site1.example'] },
      });
      await settle();
      await service.setAlwaysNewTab(false);
      expect(settings.setLibrary).toHaveBeenCalledWith({ previewNewTabHosts: ['other.example'] });
    });

    it('saves nothing when the state already matches', async () => {
      const ticked = setup({ library: { previewNewTabHosts: ['site1.example'] } });
      await settle();
      await ticked.service.setAlwaysNewTab(true);
      expect(ticked.settings.setLibrary).not.toHaveBeenCalled();
    });

    it('saves nothing when removing a host that is not in the list', async () => {
      const { service, settings } = setup();
      await settle();
      await service.setAlwaysNewTab(false);
      expect(settings.setLibrary).not.toHaveBeenCalled();
    });

    it('saves nothing without a host', async () => {
      const { service, settings } = setup({ currentId: null });
      await settle();
      await service.setAlwaysNewTab(true);
      expect(settings.setLibrary).not.toHaveBeenCalled();
    });

    it('shows an error toast when the save fails', async () => {
      const { service, toasts } = setup({ setLibrary: () => Promise.resolve(false) });
      await settle();
      await service.setAlwaysNewTab(true);
      expect(toasts.show).toHaveBeenCalledWith({
        kind: TOAST_KIND.Danger,
        title: 'preview.saveFailed',
      });
    });
  });

  describe('list width', () => {
    it('starts at the default', () => {
      const { service } = setup();
      expect(service.listWidth()).toBe(PREVIEW_LIST_WIDTH.Default);
    });

    it('reads the stored width, clamped', () => {
      localStorage.setItem(PREVIEW_LIST_WIDTH.StorageKey, '9999');
      const { service } = setup();
      expect(service.listWidth()).toBe(PREVIEW_LIST_WIDTH.Max);
    });

    it('stores a new width within the limits', () => {
      const { service } = setup();
      service.setListWidth(500);
      expect(service.listWidth()).toBe(500);
      expect(localStorage.getItem(PREVIEW_LIST_WIDTH.StorageKey)).toBe('500');
      service.setListWidth(10);
      expect(service.listWidth()).toBe(PREVIEW_LIST_WIDTH.Min);
    });

    it('lets the list grow until the panel is at its smallest width (#555)', () => {
      const { service } = setup();
      expect(service.listMax()).toBe(PREVIEW_LIST_WIDTH.Max);
      service.setSplitWidth(1600);
      expect(service.listMax()).toBe(1600 - PREVIEW_LIST_WIDTH.PanelMin);
      service.setListWidth(5000);
      expect(service.listWidth()).toBe(1600 - PREVIEW_LIST_WIDTH.PanelMin);
      // A narrower window narrows the shown list, the chosen width comes back with the room.
      service.setSplitWidth(1000);
      expect(service.shownListWidth()).toBe(1000 - PREVIEW_LIST_WIDTH.PanelMin);
      service.setSplitWidth(1600);
      expect(service.shownListWidth()).toBe(1600 - PREVIEW_LIST_WIDTH.PanelMin);
      // A hidden split (0 wide) changes nothing; never below the list's own minimum.
      service.setSplitWidth(0);
      expect(service.listMax()).toBe(1600 - PREVIEW_LIST_WIDTH.PanelMin);
      service.setSplitWidth(400);
      expect(service.listMax()).toBe(PREVIEW_LIST_WIDTH.Min);
    });

    it('resets to the default', () => {
      const { service } = setup();
      service.setListWidth(500);
      service.resetListWidth();
      expect(service.listWidth()).toBe(PREVIEW_LIST_WIDTH.Default);
      expect(localStorage.getItem(PREVIEW_LIST_WIDTH.StorageKey)).toBe(
        String(PREVIEW_LIST_WIDTH.Default),
      );
    });

    it('keeps the width for the page when storage is blocked', () => {
      const blocked = {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
      };
      const { service } = setup({
        doc: { defaultView: { localStorage: blocked } } as unknown as Partial<Document>,
      });
      expect(service.listWidth()).toBe(PREVIEW_LIST_WIDTH.Default);
      service.setListWidth(450);
      expect(service.listWidth()).toBe(450);
    });
  });
});
