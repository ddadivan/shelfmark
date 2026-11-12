import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TRASH_ITEM_KIND, type ListTrashResponse, type TrashItem } from '@shelfmark/contracts';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { of, Subject, throwError } from 'rxjs';
import { axeViolations } from '../../../testing/axe';
import { ViewportService } from '../../core/layout/viewport.service';
import { MS_PER_DAY } from '../../core/models/ms-per-day.const';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { TAGS_API } from '../links/models/tags-api.const';
import { USER_SETTINGS_API } from '../settings/models/user-settings-api.const';
import { TRASH_API } from './models/trash-api.const';
import type { TrashApi } from './models/trash-api.interface';
import TrashPage from './trash.page';

type Toast = Parameters<ToastService['show']>[0];

function entry(
  id: string,
  kind: TrashItem['kind'],
  changes: Partial<TrashItem> = {},
  daysLeft = 30,
): TrashItem {
  const now = Date.now();
  return {
    kind,
    id,
    title: id,
    url: kind === TRASH_ITEM_KIND.Link ? `https://${id}.example.com/a` : null,
    faviconUrl: null,
    imageUrl: null,
    fromFolderName: null,
    linkCount: kind === TRASH_ITEM_KIND.Folder ? 9 : null,
    deletedAt: new Date(now - 3 * MS_PER_DAY).toISOString(),
    expiresAt: new Date(now + daysLeft * MS_PER_DAY).toISOString(),
    ...changes,
  };
}

const HOUR_MS = 3_600_000;
const at = (hoursAfter: number) =>
  new Date(Date.now() - 3 * MS_PER_DAY + hoursAfter * HOUR_MS).toISOString();
// Newest delete first, as the API lists them.
const COAT = entry('Coat', TRASH_ITEM_KIND.Link, { fromFolderName: 'Clothes', deletedAt: at(0) });
const COURSES = entry('Old courses', TRASH_ITEM_KIND.Folder, {
  fromFolderName: 'Work',
  deletedAt: at(-1),
});
const RAMEN = entry('Ramen', TRASH_ITEM_KIND.Link, { deletedAt: at(-2) }, 2);

interface Options {
  items?: TrashItem[];
  phone?: boolean;
  confirm?: boolean;
  list?: Subject<ListTrashResponse>;
  failList?: boolean;
}

async function setup(options: Options = {}) {
  const items = options.items ?? [COAT, COURSES, RAMEN];
  // The server's Trash: what the list answers follows the writes.
  let current = [...items];
  const drop = (refs: readonly { kind: string; id: string }[]) => {
    current = current.filter(
      (item) => !refs.some((ref) => ref.kind === item.kind && ref.id === item.id),
    );
    return of({ count: refs.length });
  };
  const api = {
    list: vi.fn<TrashApi['list']>(() =>
      options.failList
        ? throwError(() => new Error('down'))
        : (options.list ??
          of({ items: current, total: current.length, retentionDays: 30 as const })),
    ),
    restore: vi.fn<TrashApi['restore']>(drop),
    deleteForever: vi.fn<TrashApi['deleteForever']>(drop),
    empty: vi.fn<TrashApi['empty']>(() => {
      const count = current.length;
      current = [];
      return of({ count });
    }),
  };
  const toasts: Toast[] = [];
  const confirm = vi.fn((config: { message: string }) => {
    void config;
    return Promise.resolve(options.confirm ?? true);
  });
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: TRASH_API, useValue: api },
      { provide: TAGS_API, useValue: { list: vi.fn(() => of([])) } },
      {
        provide: USER_SETTINGS_API,
        useValue: { get: vi.fn(() => of({ trashRetentionDays: 30 })), update: vi.fn() },
      },
      { provide: ToastService, useValue: { show: (toast: Toast) => toasts.push(toast) } },
      { provide: DialogService, useValue: { confirm } },
      {
        provide: ViewportService,
        useValue: {
          phone: signal(options.phone ?? false),
          compact: signal(options.phone ?? false),
          desktop: signal(!options.phone),
        },
      },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(TrashPage);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { api, toasts, confirm, fixture, element };
}

const rows = (element: HTMLElement) => [...element.querySelectorAll('app-trash-row')];
const rowTitles = (element: HTMLElement) =>
  rows(element).map((row) => row.querySelector('.ui-history-row__title')?.textContent?.trim());

function button(element: Element, text: string): HTMLButtonElement {
  const found = [...element.querySelectorAll('button')].find((candidate) =>
    candidate.textContent?.trim().includes(text),
  );
  if (!found) {
    throw new Error(`no button "${text}"`);
  }
  return found;
}

async function settle(fixture: { whenStable(): Promise<unknown> }): Promise<void> {
  await fixture.whenStable();
  await Promise.resolve();
  await fixture.whenStable();
}

describe('TrashPage', () => {
  it('shows the title, the count with the retention and the entries grouped as recently deleted', async () => {
    const { element } = await setup();

    expect(element.querySelector('h1')?.textContent).toBe('Trash');
    expect(element.querySelector('.trash-page__count')?.textContent?.trim()).toBe(
      '3 items, kept for 30 days',
    );
    expect(element.querySelector('ui-history-group h2')?.textContent?.trim()).toBe(
      'Recently deleted',
    );
    expect(rowTitles(element)).toEqual(['Coat', 'Old courses', 'Ramen']);
    expect(element.querySelector('.trash-page__note')?.textContent).toContain(
      'Items are deleted for good after 30 days.',
    );
  });

  it('puts where it came from, the link count and the delete time in separate elements, never chained', async () => {
    const { element } = await setup();
    const [coat, courses, ramen] = rows(element);

    const parts = (row: Element) =>
      [...row.querySelectorAll('.trash-row__part')].map((part) => part.textContent?.trim());
    expect(parts(coat)).toEqual(['From Clothes', 'Deleted 3 days ago']);
    expect(parts(courses)).toEqual(['From Work', '9 links', 'Deleted 3 days ago']);
    expect(parts(ramen)).toEqual(['From Unsorted', 'Deleted 3 days ago']);
    expect(element.textContent).not.toContain('·');
  });

  it('shows the days left as a badge, warning at three days or fewer', async () => {
    const { element } = await setup();
    const badges = [...element.querySelectorAll('ui-badge')];

    expect(badges.map((badge) => badge.textContent?.trim())).toEqual([
      '30 days left',
      '30 days left',
      '2 days left',
    ]);
    expect(badges.map((badge) => badge.classList.contains('ui-badge--warning'))).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('falls back to a folder tile for a folder and the site letter for a link', async () => {
    const { element } = await setup();
    const [coat, courses] = rows(element);

    expect(coat.querySelector('.trash-row__letter')?.textContent?.trim()).toBe('C');
    expect(courses.querySelector('ui-folder-icon')).not.toBeNull();
  });

  it('filters All, Links and Folders with their counts', async () => {
    const { element, fixture } = await setup();
    const radios = [...element.querySelectorAll<HTMLInputElement>('ui-segmented-control input')];

    expect(radios.map((radio) => radio.closest('label')?.textContent?.trim())).toEqual([
      'All 3',
      'Links 2',
      'Folders 1',
    ]);

    radios[2].click();
    await settle(fixture);
    expect(rowTitles(element)).toEqual(['Old courses']);

    radios[1].click();
    await settle(fixture);
    expect(rowTitles(element)).toEqual(['Coat', 'Ramen']);
  });

  it('shows the empty state with the retention when Trash is empty', async () => {
    const { element } = await setup({ items: [] });

    expect(element.querySelector('ui-empty-state h2')?.textContent?.trim()).toBe('Trash is empty');
    expect(element.querySelector('ui-empty-state')?.textContent).toContain('wait here for 30 days');
    expect(element.querySelector('.trash-page__count')?.textContent?.trim()).toBe('Nothing here');
    expect(element.querySelector('app-trash-row')).toBeNull();
    expect(
      [...element.querySelectorAll('button')].some((b) => b.textContent?.includes('Empty trash')),
    ).toBe(false);
  });

  it('offers a retry when the list cannot be loaded', async () => {
    const { element, api, fixture } = await setup({ failList: true });

    expect(element.querySelector('ui-empty-state h2')?.textContent).toContain(
      "Couldn't load Trash",
    );
    api.list.mockImplementation(() => of({ items: [COAT], total: 1, retentionDays: 30 }));
    button(element, 'Try again').click();
    await settle(fixture);

    expect(rowTitles(element)).toEqual(['Coat']);
  });

  it('restores one entry with its button: gone from the list at once, a toast says so', async () => {
    const { element, api, toasts, fixture } = await setup();

    button(rows(element)[0], 'Restore').click();
    await settle(fixture);

    expect(api.restore).toHaveBeenCalledWith([{ kind: TRASH_ITEM_KIND.Link, id: 'Coat' }]);
    expect(rowTitles(element)).not.toContain('Coat');
    expect(toasts[0]).toMatchObject({
      kind: TOAST_KIND.Success,
      title: 'Restored',
      detail: 'Coat',
    });
  });

  it('puts the entry back and says so when the restore fails', async () => {
    const { element, api, toasts, fixture } = await setup();
    api.restore.mockImplementation(() => throwError(() => new Error('boom')));

    button(rows(element)[0], 'Restore').click();
    await settle(fixture);
    // The failed list keeps showing, with the entry back where it was.
    api.list.mockImplementation(() =>
      of({ items: [COAT, COURSES, RAMEN], total: 3, retentionDays: 30 }),
    );
    await settle(fixture);

    expect(rowTitles(element)).toEqual(['Coat', 'Old courses', 'Ramen']);
    expect(toasts[0]).toMatchObject({ kind: TOAST_KIND.Danger, title: "Couldn't restore" });
  });

  it('deletes one entry for good from its menu after a confirmation', async () => {
    const { element, api, confirm, toasts, fixture } = await setup();

    element.querySelector<HTMLButtonElement>('button[aria-label="More for Coat"]')?.click();
    await settle(fixture);
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .find((item) => item.textContent?.includes('Delete forever'))
      ?.click();
    await settle(fixture);

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        destructive: true,
        title: 'Delete forever?',
        message: '“Coat” will be deleted for good. This can’t be undone.',
      }),
    );
    expect(api.deleteForever).toHaveBeenCalledWith([{ kind: TRASH_ITEM_KIND.Link, id: 'Coat' }]);
    expect(toasts[0]).toMatchObject({ kind: TOAST_KIND.Success, title: 'Deleted for good' });
  });

  it('deletes nothing when the confirmation is declined', async () => {
    const { element, api, fixture } = await setup({ confirm: false });

    element.querySelector<HTMLButtonElement>('button[aria-label="More for Coat"]')?.click();
    await settle(fixture);
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .find((item) => item.textContent?.includes('Delete forever'))
      ?.click();
    await settle(fixture);

    expect(api.deleteForever).not.toHaveBeenCalled();
    expect(rowTitles(element)).toContain('Coat');
  });

  it('empties Trash after a confirmation that counts the links inside folders', async () => {
    const { element, api, confirm, toasts, fixture } = await setup();

    button(element, 'Empty trash').click();
    await settle(fixture);

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        destructive: true,
        title: 'Empty trash?',
        message:
          '3 items will be deleted for good, including the folder “Old courses” and its 9 links. This can’t be undone.',
        confirmLabel: 'Delete 3 items',
      }),
    );
    expect(api.empty).toHaveBeenCalledTimes(1);
    expect(element.querySelector('ui-empty-state h2')?.textContent?.trim()).toBe('Trash is empty');
    expect(toasts[0]).toMatchObject({ kind: TOAST_KIND.Success, title: 'Trash emptied' });
  });

  it('does not empty Trash when declined', async () => {
    const { element, api, fixture } = await setup({ confirm: false });

    button(element, 'Empty trash').click();
    await settle(fixture);

    expect(api.empty).not.toHaveBeenCalled();
    expect(rows(element)).toHaveLength(3);
  });

  describe('selection', () => {
    function checkbox(element: Element, label: string): HTMLInputElement {
      const found = [...element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(
        (input) => input.closest('label')?.textContent?.includes(label),
      );
      if (!found) {
        throw new Error(`no checkbox "${label}"`);
      }
      return found;
    }

    it('selects entries, shows the bar with the count and restores them together', async () => {
      const { element, api, fixture } = await setup();
      expect(element.querySelector('[role="toolbar"]')).toBeNull();

      checkbox(element, 'Select Coat').click();
      checkbox(element, 'Select Ramen').click();
      await settle(fixture);

      const bar = element.querySelector('[role="toolbar"]') as HTMLElement;
      expect(bar.textContent).toContain('2 selected');
      button(bar, 'Restore').click();
      await settle(fixture);

      expect(api.restore).toHaveBeenCalledWith([
        { kind: TRASH_ITEM_KIND.Link, id: 'Coat' },
        { kind: TRASH_ITEM_KIND.Link, id: 'Ramen' },
      ]);
      expect(element.querySelector('[role="toolbar"]')).toBeNull();
      expect(rowTitles(element)).toEqual(['Old courses']);
    });

    it('selects all, then clears the selection', async () => {
      const { element, fixture } = await setup();

      checkbox(element, 'Select all').click();
      await settle(fixture);
      expect(element.querySelector('[role="toolbar"]')?.textContent).toContain('3 selected');

      element.querySelector<HTMLButtonElement>('button[aria-label="Clear selection"]')?.click();
      await settle(fixture);
      expect(element.querySelector('[role="toolbar"]')).toBeNull();
    });

    it('a click on the row selects it, and select all follows the filter', async () => {
      const { element, fixture } = await setup();

      element.querySelector<HTMLButtonElement>('app-trash-row .ui-history-row__link')?.click();
      await settle(fixture);
      expect(element.querySelector('[role="toolbar"]')?.textContent).toContain('1 selected');

      [...element.querySelectorAll<HTMLInputElement>('ui-segmented-control input')][2].click();
      await settle(fixture);
      checkbox(element, 'Select all').click();
      await settle(fixture);
      expect(element.querySelector('[role="toolbar"]')?.textContent).toContain('1 selected');
    });

    it('deletes the selection for good after a confirmation naming the number', async () => {
      const { element, api, confirm, fixture } = await setup();
      checkbox(element, 'Select Coat').click();
      checkbox(element, 'Select Old courses').click();
      await settle(fixture);

      button(element.querySelector('[role="toolbar"]') as HTMLElement, 'Delete forever').click();
      await settle(fixture);

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '2 items will be deleted for good. This can’t be undone.',
        }),
      );
      expect(api.deleteForever).toHaveBeenCalledTimes(1);
    });
  });

  describe('phone', () => {
    it('shows the way back, Empty, the swipe hint and Restore / Delete behind each row', async () => {
      const { element } = await setup({ phone: true });
      const router = TestBed.inject(Router);
      const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      expect(element.querySelector('.trash-page__top')?.textContent).toContain('Library');
      expect(button(element, 'Empty')).toBeDefined();
      expect(element.textContent).toContain('Swipe left to restore or delete for good');
      const first = rows(element)[0];
      const actions = first.querySelector('.trash-row__actions') as HTMLElement;
      expect(actions.getAttribute('role')).toBe('group');
      expect(button(actions, 'Restore').getAttribute('aria-label')).toBe('Restore Coat');
      expect(button(actions, 'Delete').getAttribute('aria-label')).toBe('Delete Coat forever');
      // No checkboxes until a selection starts.
      expect(element.querySelector('input[type="checkbox"]')).toBeNull();

      element.querySelector<HTMLAnchorElement>('.trash-page__top a')?.click();
      expect(navigate).toHaveBeenCalledWith('/library');
    });

    it('restores from the buttons behind the row without a swipe', async () => {
      const { element, api, fixture } = await setup({ phone: true });

      button(
        rows(element)[1].querySelector('.trash-row__actions') as HTMLElement,
        'Restore',
      ).click();
      await settle(fixture);

      expect(api.restore).toHaveBeenCalledWith([
        { kind: TRASH_ITEM_KIND.Folder, id: 'Old courses' },
      ]);
    });

    it('slides the row aside when a hidden button gets focus, and back when focus leaves', async () => {
      const { element, fixture } = await setup({ phone: true });
      const row = rows(element)[0];
      const surface = row.querySelector<HTMLElement>('.trash-row__surface') as HTMLElement;
      const actions = row.querySelector<HTMLElement>('.trash-row__actions') as HTMLElement;
      Object.defineProperty(actions, 'offsetWidth', { value: 200 });

      actions.querySelector('button')?.focus();
      await settle(fixture);
      expect(surface.style.translate).toBe('-200px');

      (actions.querySelector('button') as HTMLElement).blur();
      await settle(fixture);
      expect(surface.style.translate).toMatch(/^(0px)?$/);
    });

    it('starts the selection with a long press and then shows checkboxes and the bar', async () => {
      {
        const { element, fixture } = await setup({ phone: true });
        const surface = rows(element)[0].querySelector<HTMLElement>(
          '.trash-row__surface',
        ) as HTMLElement;

        surface.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            isPrimary: true,
            pointerType: 'touch',
            button: 0,
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 600));
        await settle(fixture);

        expect(element.querySelector('[role="toolbar"]')?.textContent).toContain('1 selected');
        expect(element.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(1);
      }
    });
  });

  it('has no axe violations on desktop', async () => {
    const { element, fixture } = await setup();
    await settle(fixture);
    expect(await axeViolations(element)).toEqual([]);
  });

  it('has no axe violations on a phone', async () => {
    const { element, fixture } = await setup({ phone: true });
    await settle(fixture);
    expect(await axeViolations(element)).toEqual([]);
  });
});
