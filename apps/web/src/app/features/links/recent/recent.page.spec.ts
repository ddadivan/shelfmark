import { TestBed } from '@angular/core/testing';
import type { FolderResponse, LinkResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import axe from 'axe-core';
import { of, Subject, throwError } from 'rxjs';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
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
  options: { recent?: Subject<{ items: LinkResponse[] }>; confirm?: boolean } = {},
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
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(RecentPage);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { api, toast, actions, confirm, fixture, element };
}

const titles = (element: HTMLElement) =>
  [...element.querySelectorAll('ui-history-group h2')].map((h) => h.textContent?.trim());

describe('RecentPage', () => {
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

    element.querySelector<HTMLButtonElement>('button[aria-label^="Remove Link 1"]')?.click();
    await fixture.whenStable();

    expect(api.removeRecent).toHaveBeenCalledWith('id-1');
    expect(element.querySelectorAll('app-link-history-row')).toHaveLength(1);
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ kind: TOAST_KIND.Success, detail: 'Link 1' }),
    );
  });

  it('puts the link back and shows an error toast when removing fails', async () => {
    const { element, api, toast, fixture } = await setup([opened(1, 0), opened(2, 0)]);
    api.removeRecent.mockReturnValueOnce(throwError(() => new Error('boom')));

    element.querySelector<HTMLButtonElement>('button[aria-label^="Remove Link 1"]')?.click();
    await fixture.whenStable();

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
