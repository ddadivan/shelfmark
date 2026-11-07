import { TestBed } from '@angular/core/testing';
import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import {
  DialogService,
  TOAST_CLOSE_REASON,
  TOAST_KIND,
  ToastService,
  type ToastCloseReason,
  type ToastOptions,
} from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { LinksStore } from '../../stores/links.store';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { AddLinkDialogService } from './add-link/add-link-dialog.service';
import { LinkActionsService } from './link-actions.service';
import { ADD_LINK_ACTION } from './models/add-link-action.const';
import { DELETE_UNDO_MS } from '../../core/undo/models/delete-undo.const';
import { LINKS_API } from './models/links-api.const';
import type { LinksApi } from './models/links-api.interface';
import { LINKS_SCOPE } from './models/links-scope.const';

function link(n: number): LinkResponse {
  return { ...MOCK_LINKS[0], id: `id-${n}`, title: `Link ${n}`, isFavorite: false };
}

async function setup(confirmed = true) {
  const toasts: ToastOptions[] = [];
  const api = {
    list: vi.fn<LinksApi['list']>(() => of({ items: [link(1), link(2)], nextCursor: null })),
    get: vi.fn<LinksApi['get']>((id) => of(link(Number(id.slice(3))))),
    update: vi.fn<LinksApi['update']>((id) =>
      of({ ...link(Number(id.slice(3))), isFavorite: true }),
    ),
    remove: vi.fn<LinksApi['remove']>(() => of(undefined)),
    open: vi.fn<LinksApi['open']>((id) => of(link(Number(id.slice(3))))),
  };
  const confirm = vi.fn(() => Promise.resolve(confirmed));
  const addLinkOpen = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: DialogService, useValue: { confirm } },
      {
        provide: ToastService,
        useValue: {
          // Behaves like the real toast: closes by timeout, or with "action" when Undo runs.
          show: (options: ToastOptions) => {
            let close: (reason: ToastCloseReason) => void = () => undefined;
            const closed = new Promise<ToastCloseReason>((resolve) => {
              close = resolve;
            });
            const timer = setTimeout(
              () => close(TOAST_CLOSE_REASON.Timeout),
              options.duration ?? 4000,
            );
            const run = options.action?.run;
            toasts.push(
              options.action && run
                ? {
                    ...options,
                    action: {
                      label: options.action.label,
                      run: () => {
                        run();
                        clearTimeout(timer);
                        close(TOAST_CLOSE_REASON.Action);
                      },
                    },
                  }
                : options,
            );
            return { dismiss: () => close(TOAST_CLOSE_REASON.Dismissed), closed };
          },
        },
      },
      { provide: AddLinkDialogService, useValue: { open: addLinkOpen } },
    ],
  });
  await loadEnglish();
  const store = TestBed.inject(LinksStore);
  store.setFilter({ scope: LINKS_SCOPE.All });
  return { api, confirm, addLinkOpen, toasts, store, actions: TestBed.inject(LinkActionsService) };
}

const ids = (store: InstanceType<typeof LinksStore>) => store.entities().map((item) => item.id);

describe('LinkActionsService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe('delete', () => {
    it('does nothing when the confirmation is declined', async () => {
      const { actions, store, toasts, confirm } = await setup(false);

      await actions.delete(link(1));

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ destructive: true, message: '“Link 1” will be deleted.' }),
      );
      expect(ids(store)).toEqual(['id-1', 'id-2']);
      expect(toasts).toEqual([]);
    });

    it('hides the link at once and offers Undo', async () => {
      const { actions, store, toasts, api } = await setup();

      await actions.delete(link(1));

      expect(ids(store)).toEqual(['id-2']);
      expect(toasts[0].text).toBe('Link deleted');
      expect(toasts[0].action?.label).toBe('Undo');
      expect(api.remove).not.toHaveBeenCalled();
    });

    it('brings the link back on Undo and never sends the delete', async () => {
      const { actions, store, toasts, api } = await setup();
      await actions.delete(link(1));

      toasts[0].action?.run();
      await vi.advanceTimersByTimeAsync(DELETE_UNDO_MS);

      expect(ids(store)).toEqual(['id-1', 'id-2']);
      expect(api.remove).not.toHaveBeenCalled();
    });

    it('sends the delete when the window ends', async () => {
      const { actions, api } = await setup();
      await actions.delete(link(1));

      await vi.advanceTimersByTimeAsync(DELETE_UNDO_MS);

      expect(api.remove).toHaveBeenCalledWith('id-1');
    });

    it('restores the link and tells the user when the delete fails', async () => {
      const { actions, api, store, toasts } = await setup();
      api.remove.mockReturnValue(throwError(() => new Error('boom')));
      await actions.delete(link(1));

      await vi.advanceTimersByTimeAsync(DELETE_UNDO_MS);

      expect(ids(store)).toEqual(['id-1', 'id-2']);
      expect(toasts[1]).toMatchObject({ kind: TOAST_KIND.Error });
      expect(toasts[1].text).toContain('back in your list');
    });
  });

  describe('favorite', () => {
    it('keeps the new state when the request succeeds', async () => {
      const { actions, store, toasts } = await setup();

      await actions.toggleFavorite(link(1));

      expect(store.entityMap()['id-1']?.isFavorite).toBe(true);
      expect(toasts).toEqual([]);
    });

    it('rolls back and offers Retry when the request fails', async () => {
      const { actions, api, store, toasts } = await setup();
      api.update.mockReturnValueOnce(throwError(() => new Error('boom')));

      await actions.toggleFavorite(link(1));

      expect(store.entityMap()['id-1']?.isFavorite).toBe(false);
      expect(toasts[0]).toMatchObject({ kind: TOAST_KIND.Error });
      expect(toasts[0].action?.label).toBe('Retry');

      toasts[0].action?.run();
      await vi.advanceTimersByTimeAsync(0);
      expect(store.entityMap()['id-1']?.isFavorite).toBe(true);
    });
  });

  it('records an open', async () => {
    const { actions, api } = await setup();

    actions.open(link(2));

    expect(api.open).toHaveBeenCalledWith('id-2');
  });

  describe('edit', () => {
    it('opens the dialog in edit mode and puts the saved link into the feed', async () => {
      const { actions, addLinkOpen, store, toasts } = await setup();
      addLinkOpen.mockResolvedValue({
        action: ADD_LINK_ACTION.Saved,
        link: { ...link(1), title: 'Renamed' },
      });

      await actions.edit(link(1));

      expect(addLinkOpen).toHaveBeenCalledWith({ link: link(1) });
      expect(store.entityMap()['id-1']?.title).toBe('Renamed');
      expect(toasts[0]).toMatchObject({ kind: TOAST_KIND.Success, text: 'Changes saved' });
    });

    it('does nothing when the dialog is dismissed', async () => {
      const { actions, addLinkOpen, store, toasts } = await setup();
      addLinkOpen.mockResolvedValue(undefined);

      await actions.edit(link(1));

      expect(store.entityMap()['id-1']?.title).toBe('Link 1');
      expect(toasts).toEqual([]);
    });

    it('runs the confirm and Undo delete flow when Delete was chosen', async () => {
      const { actions, addLinkOpen, confirm, store, toasts } = await setup();
      addLinkOpen.mockResolvedValue({ action: ADD_LINK_ACTION.Delete, link: link(1) });

      await actions.edit(link(1));

      expect(confirm).toHaveBeenCalled();
      expect(ids(store)).toEqual(['id-2']);
      expect(toasts[0].text).toBe('Link deleted');
    });
  });

  describe('open saved', () => {
    it('opens the edit dialog of a link that is in the feed', async () => {
      const { actions, addLinkOpen, api } = await setup();
      addLinkOpen
        .mockResolvedValueOnce({
          action: ADD_LINK_ACTION.OpenExisting,
          existing: { id: 'id-2', title: 'Link 2', folderId: null, folderName: null },
        })
        .mockResolvedValueOnce(undefined);

      await actions.addLink();

      expect(addLinkOpen).toHaveBeenLastCalledWith({ link: link(2) });
      expect(api.get).not.toHaveBeenCalled();
    });

    it('fetches a link that is not in the feed', async () => {
      const { actions, addLinkOpen, api } = await setup();
      addLinkOpen
        .mockResolvedValueOnce({
          action: ADD_LINK_ACTION.OpenExisting,
          existing: { id: 'id-7', title: 'Link 7', folderId: null, folderName: null },
        })
        .mockResolvedValueOnce(undefined);

      await actions.addLink();

      expect(api.get).toHaveBeenCalledWith('id-7');
      expect(addLinkOpen).toHaveBeenLastCalledWith({ link: link(7) });
    });

    it('tells the user when the link cannot be loaded', async () => {
      const { actions, addLinkOpen, api, toasts } = await setup();
      api.get.mockReturnValue(throwError(() => new Error('boom')));
      addLinkOpen.mockResolvedValueOnce({
        action: ADD_LINK_ACTION.OpenExisting,
        existing: { id: 'id-7', title: 'Link 7', folderId: null, folderName: null },
      });

      await actions.addLink();

      expect(toasts[0]).toMatchObject({ kind: TOAST_KIND.Error, text: "Couldn't open the link." });
    });
  });

  describe('add link', () => {
    it('shows a saved link and confirms with a toast', async () => {
      const { actions, addLinkOpen, store, toasts } = await setup();
      addLinkOpen.mockResolvedValue({ action: ADD_LINK_ACTION.Saved, link: link(9) });

      await actions.addLink();

      expect(ids(store)[0]).toBe('id-9');
      expect(toasts[0]).toMatchObject({ kind: TOAST_KIND.Success, text: 'Link saved' });
    });

    it('does nothing when the dialog is dismissed', async () => {
      const { actions, addLinkOpen, store, toasts } = await setup();
      addLinkOpen.mockResolvedValue(undefined);

      await actions.addLink();

      expect(ids(store)).toEqual(['id-1', 'id-2']);
      expect(toasts).toEqual([]);
    });
  });
});
