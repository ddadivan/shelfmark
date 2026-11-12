import { LIBRARY_SETTINGS_DEFAULT } from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  LINK_KIND,
  type FolderResponse,
  type LinkResponse,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import axe from 'axe-core';
import { of, Subject, throwError } from 'rxjs';
import { ViewportService } from '../../../core/layout/viewport.service';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { USER_SETTINGS_API } from '../../settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../../settings/models/user-settings-api.interface';
import { LinkActionsService } from '../link-actions.service';
import { FOLDERS_API } from '../models/folders-api.const';
import type { FoldersApi } from '../models/folders-api.interface';
import { LINKS_API } from '../models/links-api.const';
import type { LinksApi } from '../models/links-api.interface';
import RecentPage from './recent.page';

const DAY_MS = 86_400_000;

function opened(n: number, daysAgo: number, changes: Partial<LinkResponse> = {}): LinkResponse {
  const at = new Date();
  at.setHours(12, 0, 0, 0);
  return {
    ...MOCK_LINKS[0],
    id: `id-${n}`,
    title: `Link ${n}`,
    url: `https://site${n}.example.com/a`,
    folderId: null,
    imageUrl: null,
    lastOpenedAt: new Date(at.getTime() - daysAgo * DAY_MS).toISOString(),
    ...changes,
  };
}

async function setup(
  items: LinkResponse[] = [],
  options: {
    recent?: Subject<{ items: LinkResponse[] }>;
    confirm?: boolean;
    paused?: boolean;
    failUpdate?: boolean;
    phone?: boolean;
  } = {},
) {
  const folder: FolderResponse = { ...MOCK_FOLDERS[0], id: 'f-1', name: 'Reading' };
  const api = {
    recent: vi.fn<LinksApi['recent']>(() => options.recent ?? of({ items })),
    removeRecent: vi.fn<LinksApi['removeRecent']>(() => of(undefined)),
    clearRecent: vi.fn<LinksApi['clearRecent']>(() => of(undefined)),
  };
  const folders = {
    list: vi.fn<FoldersApi['list']>(() => of({ items: [folder], counts: MOCK_LIBRARY_COUNTS })),
  };
  const settings: UserSettingsResponse = {
    trashRetentionDays: 30,
    folderColours: true,
    pauseHistory: options.paused ?? false,
    ...MOCK_APPEARANCE_DEFAULTS,
    ...LIBRARY_SETTINGS_DEFAULT,
  };
  const settingsApi = {
    get: vi.fn<UserSettingsApi['get']>(() => of(settings)),
    update: vi.fn<UserSettingsApi['update']>((request) =>
      options.failUpdate
        ? throwError(() => new Error('down'))
        : of({ ...settings, pauseHistory: request.pauseHistory ?? settings.pauseHistory }),
    ),
  };
  const toast = { show: vi.fn() };
  const actions = { open: vi.fn() };
  const confirm = vi.fn(() => Promise.resolve(options.confirm ?? true));
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: FOLDERS_API, useValue: folders },
      { provide: LinkActionsService, useValue: actions },
      { provide: ToastService, useValue: toast },
      { provide: DialogService, useValue: { confirm } },
      { provide: USER_SETTINGS_API, useValue: settingsApi },
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
  const fixture = TestBed.createComponent(RecentPage);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { api, settingsApi, toast, actions, confirm, fixture, element };
}

/** Opens the "More for <title>" menu of a row and presses one of its items. */
async function pressMenuItem(
  fixture: ComponentFixture<unknown>,
  title: string,
  label: string,
): Promise<void> {
  const element = fixture.nativeElement as HTMLElement;
  element.querySelector<HTMLButtonElement>(`button[aria-label="More for ${title}"]`)?.click();
  await fixture.whenStable();
  const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((candidate) =>
    candidate.textContent?.includes(label),
  );
  expect(item, `menu item "${label}"`).toBeDefined();
  item?.click();
  await fixture.whenStable();
}

const button = (root: HTMLElement, label: string): HTMLButtonElement => {
  const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  expect(found, `button "${label}"`).toBeDefined();
  return found as HTMLButtonElement;
};

const rowTitles = (element: HTMLElement) =>
  [...element.querySelectorAll('app-link-history-row [slot="title"]')].map((title) =>
    title.textContent?.trim(),
  );

/** Types into the search field and waits for the debounce. */
async function search(fixture: ComponentFixture<unknown>, text: string): Promise<void> {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
    'input[type="search"]',
  ) as HTMLInputElement;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 250));
  await fixture.whenStable();
}

const titles = (element: HTMLElement) =>
  [...element.querySelectorAll('ui-history-group h2')].map((h) => h.textContent?.trim());

describe('RecentPage', () => {
  it('filters the history by kind with chips that count each kind', async () => {
    const { element, fixture } = await setup([
      opened(1, 0, { kind: LINK_KIND.Video }),
      opened(2, 0, { kind: LINK_KIND.Article }),
      opened(3, 1, { kind: LINK_KIND.Article }),
      opened(4, 1, { kind: LINK_KIND.Other }),
    ]);
    const toolbar = element.querySelector('[role="toolbar"]');
    expect(toolbar?.getAttribute('aria-label')).toBe('Filter by type');
    const chips = () => [...element.querySelectorAll<HTMLButtonElement>('.ui-saved-views__body')];
    expect(chips().map((chip) => chip.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'All 4',
      'Videos 1',
      'Articles 2',
      'Shopping 0',
    ]);
    expect(chips()[0]?.getAttribute('aria-pressed')).toBe('true');
    const rows = () => element.querySelectorAll('app-link-history-row').length;
    expect(rows()).toBe(4);

    chips()[2]?.click();
    await fixture.whenStable();
    expect(chips()[2]?.getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toBe(2);

    chips()[3]?.click();
    await fixture.whenStable();
    expect(rows()).toBe(0);
    expect(element.textContent).toContain('Nothing of this type');
    [...element.querySelectorAll<HTMLButtonElement>('ui-empty-state button')]
      .find((button) => button.textContent?.includes('Show all'))
      ?.click();
    await fixture.whenStable();
    expect(rows()).toBe(4);
    expect(element.querySelector('.ui-saved-views__add')).toBeNull();
  });

  it('shows a skeleton and the heading while the history loads', async () => {
    const { element } = await setup([], { recent: new Subject() });

    expect(element.querySelector('h1')?.textContent).toBe('Recently opened');
    expect(element.querySelector('ui-skeleton')).not.toBeNull();
    expect(element.querySelector('.recent-page')?.getAttribute('aria-busy')).toBe('true');
    expect(element.textContent).not.toContain('Clear history');
  });

  it('groups the links by day with the folder and time, newest first', async () => {
    const { element, api } = await setup([
      opened(1, 0, { folderId: 'f-1' }),
      opened(2, 0),
      opened(3, 1),
      opened(4, 3),
    ]);

    expect(api.recent).toHaveBeenCalledWith({ limit: 100 });
    expect(titles(element)).toEqual(['Today', 'Yesterday', 'Earlier this week']);
    expect(element.querySelectorAll('app-link-history-row')).toHaveLength(4);
    const first = element.querySelector('app-link-history-row');
    expect(first?.textContent).toContain('Link 1');
    expect(first?.textContent).toContain('Reading');
    expect(first?.querySelector('time')?.getAttribute('datetime')).not.toBe('');
    expect(first?.querySelector('time')?.textContent?.trim()).not.toBe('');
    expect(element.querySelectorAll('app-link-history-row')[1].textContent).toContain('Unsorted');
    expect(element.querySelector('.recent-page__count')?.textContent).toContain(
      '4 links in the last 30 days',
    );
  });

  it('names an older day by its date', async () => {
    const { element } = await setup([opened(1, 12)]);

    expect(titles(element)[0]).toMatch(/\d/);
  });

  it('says so when there is no history and offers no clear button', async () => {
    const { element } = await setup([]);

    expect(element.querySelector('ui-empty-state')?.textContent).toContain('Nothing opened yet');
    expect(element.textContent).toContain('Nothing yet');
    expect(element.textContent).not.toContain('Clear history');
  });

  it('opens a row through the link actions and links to the page in a new tab', async () => {
    const { element, actions } = await setup([opened(1, 0)]);
    const anchor = element.querySelector<HTMLAnchorElement>('a.ui-history-row__link');

    expect(anchor?.getAttribute('href')).toBe('https://site1.example.com/a');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    anchor?.addEventListener('click', (event) => event.preventDefault());
    anchor?.click();

    expect(actions.open).toHaveBeenCalledWith(expect.objectContaining({ id: 'id-1' }));
  });

  it('never renders a non-http link as an href', async () => {
    const { element } = await setup([opened(1, 0, { url: 'javascript:alert(1)' })]);

    expect(element.querySelector('a.ui-history-row__link')).toBeNull();
  });

  it('removes one link at once and confirms with a toast', async () => {
    const { element, api, toast, fixture } = await setup([opened(1, 0), opened(2, 0)]);

    await pressMenuItem(fixture, 'Link 1', 'Remove from history');

    expect(api.removeRecent).toHaveBeenCalledWith('id-1');
    expect(element.querySelectorAll('app-link-history-row')).toHaveLength(1);
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ kind: TOAST_KIND.Success, detail: 'Link 1' }),
    );
  });

  it('lists the menu of a row in the order of the design, with a separator before Remove', async () => {
    const { element, fixture } = await setup([opened(1, 0)]);

    element.querySelector<HTMLButtonElement>('button[aria-label="More for Link 1"]')?.click();
    await fixture.whenStable();

    const menu = document.querySelector('[role="menu"]');
    expect(menu?.getAttribute('aria-label')).toBe('More for Link 1');
    expect(
      [...document.querySelectorAll('[role="menuitem"]')].map((item) => item.textContent?.trim()),
    ).toEqual(['Open in new tab', 'Show in folder', 'Copy link', 'Remove from history']);
    expect(menu?.querySelector('[role="separator"]')).not.toBeNull();
  });

  it('opens the link in a new tab from the menu and records the open', async () => {
    const { actions, fixture } = await setup([opened(1, 0)]);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    await pressMenuItem(fixture, 'Link 1', 'Open in new tab');

    expect(open).toHaveBeenCalledWith(
      'https://site1.example.com/a',
      '_blank',
      'noopener,noreferrer',
    );
    expect(actions.open).toHaveBeenCalledWith(expect.objectContaining({ id: 'id-1' }));
    open.mockRestore();
  });

  it('has no "Open in new tab" item for a link the browser must not open', async () => {
    const { element, fixture } = await setup([opened(1, 0, { url: 'javascript:alert(1)' })]);

    element.querySelector<HTMLButtonElement>('button[aria-label="More for Link 1"]')?.click();
    await fixture.whenStable();

    expect(document.body.textContent).not.toContain('Open in new tab');
  });

  it.each([
    ['a link in a folder', { folderId: 'f-1' }, '/folders/f-1'],
    ['an unsorted link', { folderId: null }, '/unsorted'],
  ])('shows %s in its folder', async (_name, changes, url) => {
    const { fixture } = await setup([opened(1, 0, changes)]);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    await pressMenuItem(fixture, 'Link 1', 'Show in folder');

    expect(navigate).toHaveBeenCalledWith(url);
  });

  describe('copy link', () => {
    afterEach(() => {
      // @ts-expect-error restoring the property the test replaced on the jsdom navigator
      delete navigator.clipboard;
    });

    it('writes the address to the clipboard and confirms with a toast', async () => {
      const { fixture, toast } = await setup([opened(1, 0)]);
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

      await pressMenuItem(fixture, 'Link 1', 'Copy link');

      expect(writeText).toHaveBeenCalledWith('https://site1.example.com/a');
      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ kind: TOAST_KIND.Success, title: 'Link copied' }),
      );
    });

    it('shows an error toast when the Clipboard API is unavailable', async () => {
      const { fixture, toast } = await setup([opened(1, 0)]);
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

      await pressMenuItem(fixture, 'Link 1', 'Copy link');

      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ kind: TOAST_KIND.Danger, title: "Couldn't copy the link" }),
      );
    });

    it('shows an error toast when the browser refuses to write', async () => {
      const { fixture, toast } = await setup([opened(1, 0)]);
      const writeText = vi.fn(() => Promise.reject(new Error('denied')));
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

      await pressMenuItem(fixture, 'Link 1', 'Copy link');

      expect(toast.show).toHaveBeenCalledWith(expect.objectContaining({ kind: TOAST_KIND.Danger }));
    });
  });

  it('puts the link back and shows an error toast when removing fails', async () => {
    const { element, api, toast, fixture } = await setup([opened(1, 0), opened(2, 0)]);
    api.removeRecent.mockReturnValueOnce(throwError(() => new Error('boom')));

    await pressMenuItem(fixture, 'Link 1', 'Remove from history');

    expect(element.querySelectorAll('app-link-history-row')).toHaveLength(2);
    expect(toast.show).toHaveBeenCalledWith(expect.objectContaining({ kind: TOAST_KIND.Danger }));
  });

  it('clears the history after a destructive confirmation', async () => {
    const { element, api, toast, confirm, fixture } = await setup([opened(1, 0), opened(2, 1)]);

    [...element.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Clear history'))
      ?.click();
    await fixture.whenStable();

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    expect(api.clearRecent).toHaveBeenCalledTimes(1);
    expect(element.querySelector('ui-empty-state')).not.toBeNull();
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ kind: TOAST_KIND.Success, title: 'History cleared' }),
    );
  });

  it('does nothing when the confirmation is cancelled', async () => {
    const { element, api, fixture } = await setup([opened(1, 0)], { confirm: false });

    [...element.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Clear history'))
      ?.click();
    await fixture.whenStable();

    expect(api.clearRecent).not.toHaveBeenCalled();
    expect(element.querySelectorAll('app-link-history-row')).toHaveLength(1);
  });

  it('brings the history back with an error toast when clearing fails', async () => {
    const { element, api, toast, fixture } = await setup([opened(1, 0), opened(2, 1)]);
    api.clearRecent.mockReturnValueOnce(throwError(() => new Error('boom')));

    [...element.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Clear history'))
      ?.click();
    await fixture.whenStable();

    expect(element.querySelectorAll('app-link-history-row')).toHaveLength(2);
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ kind: TOAST_KIND.Danger, title: "Couldn't clear the history" }),
    );
  });

  describe('pause history', () => {
    it('pauses at once: the button turns to Resume and a notice explains it', async () => {
      const { element, fixture, settingsApi } = await setup([opened(1, 0)]);
      expect(element.querySelector('ui-notice')).toBeNull();

      button(element, 'Pause history').click();
      await fixture.whenStable();

      expect(settingsApi.update).toHaveBeenCalledWith({ pauseHistory: true });
      const notice = element.querySelector('ui-notice') as HTMLElement;
      expect(notice.getAttribute('role')).toBe('status');
      expect(notice.textContent).toContain("History is paused. Links you open now aren't added.");
      expect(button(element, 'Resume history')).toBeDefined();
    });

    it('resumes from the notice', async () => {
      const { element, fixture, settingsApi } = await setup([opened(1, 0)], { paused: true });
      const notice = element.querySelector('ui-notice') as HTMLElement;
      expect(notice).not.toBeNull();

      button(notice, 'Resume').click();
      await fixture.whenStable();

      expect(settingsApi.update).toHaveBeenCalledWith({ pauseHistory: false });
      expect(element.querySelector('ui-notice')).toBeNull();
      expect(button(element, 'Pause history')).toBeDefined();
    });

    it('offers the toggle with an empty history too', async () => {
      const { element } = await setup([], { paused: true });
      expect(button(element, 'Resume history')).toBeDefined();
      expect(element.querySelector('ui-notice')).not.toBeNull();
    });

    it('puts the old state back with an error toast when the request fails', async () => {
      const { element, fixture, toast } = await setup([opened(1, 0)], { failUpdate: true });

      button(element, 'Pause history').click();
      await fixture.whenStable();

      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ kind: TOAST_KIND.Danger, title: "Couldn't pause history" }),
      );
      expect(element.querySelector('ui-notice')).toBeNull();
      expect(button(element, 'Pause history')).toBeDefined();
    });

    it('says so when resuming fails', async () => {
      const { element, fixture, toast } = await setup([opened(1, 0)], {
        paused: true,
        failUpdate: true,
      });

      button(element, 'Resume history').click();
      await fixture.whenStable();

      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ kind: TOAST_KIND.Danger, title: "Couldn't resume history" }),
      );
      expect(element.querySelector('ui-notice')).not.toBeNull();
    });
  });

  describe('search', () => {
    const items = () => [
      opened(1, 0, { title: 'Wool coat', url: 'https://www.cos.com/coat' }),
      opened(2, 0, { title: 'Signal Forms in 20 minutes', url: 'https://youtube.com/watch' }),
      opened(3, 1, { title: 'Ramen at home', url: 'https://seriouseats.com/ramen' }),
    ];

    it('filters the loaded history by title and domain', async () => {
      const { element, fixture, api } = await setup(items());
      const input = element.querySelector('input[type="search"]') as HTMLInputElement;
      expect(input.getAttribute('placeholder')).toBe('Search history');
      expect(element.querySelector(`label[for="${input.id}"]`)?.textContent).toBe('Search history');

      await search(fixture, 'SIGNAL');
      expect(rowTitles(element)).toEqual(['Signal Forms in 20 minutes']);

      await search(fixture, 'seriouseats');
      expect(rowTitles(element)).toEqual(['Ramen at home']);
      expect(api.recent).toHaveBeenCalledTimes(1);
    });

    it('combines with the kind chips', async () => {
      const { element, fixture } = await setup([
        opened(1, 0, { title: 'Coat video', kind: LINK_KIND.Video }),
        opened(2, 0, { title: 'Coat article', kind: LINK_KIND.Article }),
      ]);
      element.querySelectorAll<HTMLButtonElement>('.ui-saved-views__body')[1]?.click();
      await search(fixture, 'coat');
      expect(rowTitles(element)).toEqual(['Coat video']);
    });

    it('says when nothing matches and clears the search from the empty state', async () => {
      const { element, fixture } = await setup(items());

      await search(fixture, 'lisbon');

      expect(rowTitles(element)).toEqual([]);
      const empty = element.querySelector('ui-empty-state') as HTMLElement;
      expect(empty.textContent).toContain('Nothing matches');
      expect(empty.textContent).toContain('No link in your history matches “lisbon”.');
      button(empty, 'Clear search').click();
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();

      expect(rowTitles(element)).toHaveLength(3);
      expect((element.querySelector('input[type="search"]') as HTMLInputElement).value).toBe('');
    });
  });

  describe('phone', () => {
    it('keeps "Remove" behind every row, reachable without a swipe', async () => {
      const { element, fixture, api } = await setup([opened(1, 0), opened(2, 0)], { phone: true });
      const row = element.querySelector('app-link-history-row') as HTMLElement;
      const actions = row.querySelector('.link-history-row__actions') as HTMLElement;
      expect(actions.getAttribute('role')).toBe('group');
      expect(row.querySelector('.link-history-row__swipe')?.getAttribute('role')).toBe('listitem');
      expect(row.querySelector('ui-history-row')?.getAttribute('role')).toBe('presentation');
      expect(element.textContent).toContain('Swipe a row left to remove it from history.');
      const remove = button(actions, 'Remove');
      expect(remove.getAttribute('aria-label')).toBe('Remove Link 1 from history');

      remove.click();
      await fixture.whenStable();

      expect(api.removeRecent).toHaveBeenCalledWith('id-1');
      expect(rowTitles(element)).toEqual(['Link 2']);
    });

    it('slides the row aside when "Remove" gets focus, and back when focus leaves', async () => {
      const { element, fixture } = await setup([opened(1, 0)], { phone: true });
      const surface = element.querySelector('.link-history-row__surface') as HTMLElement;
      const actions = element.querySelector('.link-history-row__actions') as HTMLElement;
      Object.defineProperty(actions, 'offsetWidth', { value: 120 });

      actions.querySelector('button')?.focus();
      await fixture.whenStable();
      expect(surface.style.translate).toBe('-120px');

      (actions.querySelector('button') as HTMLElement).blur();
      await fixture.whenStable();
      expect(surface.style.translate).toMatch(/^(0px)?$/);
    });

    it('opens the link on a tap, but a tap on a swiped-open row only closes it', async () => {
      const { element, fixture, actions } = await setup([opened(1, 0)], { phone: true });
      const surface = element.querySelector('.link-history-row__surface') as HTMLElement;
      const behind = element.querySelector('.link-history-row__actions') as HTMLElement;
      Object.defineProperty(behind, 'offsetWidth', { value: 120 });
      const anchor = element.querySelector('a.ui-history-row__link') as HTMLAnchorElement;
      const prevented: boolean[] = [];
      anchor.addEventListener('click', (event) => {
        prevented.push(event.defaultPrevented);
        event.preventDefault();
      });

      behind.querySelector('button')?.focus();
      await fixture.whenStable();
      expect(surface.style.translate).toBe('-120px');
      anchor.click();
      await fixture.whenStable();
      expect(actions.open).not.toHaveBeenCalled();
      expect(surface.style.translate).toMatch(/^(0px)?$/);

      anchor.click();
      expect(actions.open).toHaveBeenCalledTimes(1);
      expect(prevented).toEqual([true, false]);
    });

    it('follows a sideways drag and swallows the click that ends it', async () => {
      const { element, fixture, actions } = await setup([opened(1, 0)], { phone: true });
      const surface = element.querySelector('.link-history-row__surface') as HTMLElement;
      const behind = element.querySelector('.link-history-row__actions') as HTMLElement;
      Object.defineProperty(behind, 'offsetWidth', { value: 120 });
      surface.setPointerCapture = vi.fn();
      const pointer = (type: string, clientX: number, clientY = 10) =>
        surface.dispatchEvent(
          new PointerEvent(type, { bubbles: true, isPrimary: true, button: 0, clientX, clientY }),
        );

      pointer('pointerdown', 200);
      pointer('pointermove', 150);
      await fixture.whenStable();
      expect(surface.style.translate).toBe('-50px');
      pointer('pointermove', 100);
      pointer('pointerup', 100);
      await fixture.whenStable();
      expect(surface.style.translate).toBe('-120px');
      const anchor = element.querySelector('a.ui-history-row__link') as HTMLAnchorElement;
      anchor.addEventListener('click', (event) => event.preventDefault());
      anchor.click();
      expect(actions.open).not.toHaveBeenCalled();

      // A vertical drag is the page scroll: the row stays.
      await new Promise((resolve) => setTimeout(resolve, 0));
      pointer('pointerdown', 100, 10);
      pointer('pointermove', 104, 60);
      pointer('pointerup', 104, 60);
      await fixture.whenStable();
      expect(surface.style.translate).toBe('-120px');
    });

    it('has no axe violations', async () => {
      const { element } = await setup([opened(1, 0), opened(2, 1)], { phone: true });
      document.body.append(element);

      const { violations } = await axe.run(element, {
        rules: { 'color-contrast': { enabled: false } },
      });
      element.remove();

      expect(violations.map((violation) => violation.id)).toEqual([]);
    });
  });

  it('has no axe violations', async () => {
    const { element } = await setup([opened(1, 0), opened(2, 1), opened(3, 4)]);
    document.body.append(element);

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false } },
    });
    element.remove();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
