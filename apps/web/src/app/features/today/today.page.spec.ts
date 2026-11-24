import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideRouter } from '@angular/router';
import {
  REDISCOVER_MODE,
  SAVED_WITHIN,
  type LinkResponse,
  type ListLinksQuery,
  type RediscoverResponse,
} from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { ToastService } from '@shelfmark/ui';
import { UiButtonHarness, UiMenuHarness } from '@shelfmark/ui/testing';
import { of, throwError } from 'rxjs';
import { axeViolations } from '../../../testing/axe';
import { ViewportService } from '../../core/layout/viewport.service';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { FOLDERS_API } from '../links/models/folders-api.const';
import { LINKS_API } from '../links/models/links-api.const';
import { LinkActionsService } from '../links/services/link-actions.service';
import { REDISCOVER_API } from '../rediscover/models/rediscover-api.const';
import { REMINDERS_API } from '../reminders/models/reminders-api.const';
import TodayPage from './today.page';

const HOUR = 3_600_000;
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();
const link = (id: string, changes: Partial<LinkResponse> = {}): LinkResponse => ({
  ...(MOCK_LINKS[0] as LinkResponse),
  id,
  title: id,
  url: `https://${id.toLowerCase().replace(/\s/g, '')}.example.com/`,
  folderId: null,
  imageUrl: null,
  faviconUrl: null,
  remindAt: null,
  note: null,
  lastOpenedAt: null,
  ...changes,
});

interface Options {
  due?: LinkResponse[];
  week?: LinkResponse[];
  weekMore?: boolean;
  weekFails?: boolean;
  block?: RediscoverResponse;
}

async function setup(options: Options = {}) {
  let due = options.due ?? [link('Wool coat', { remindAt: ago(3) })];
  const week = options.week ?? [
    link('Angular in 100 Seconds', { folderId: 'f1' }),
    link('Tree Runners'),
  ];
  const linksApi = {
    list: vi.fn((query?: ListLinksQuery) => {
      if (query?.saved === SAVED_WITHIN.Week) {
        return options.weekFails
          ? throwError(() => new Error('down'))
          : of({ items: week, nextCursor: options.weekMore ? 'next' : null, pinned: [] });
      }
      return of({ items: [link('Newest one'), link('Second one')], nextCursor: null, pinned: [] });
    }),
  };
  const remindersApi = {
    list: vi.fn(() => of({ due, upcoming: [] })),
    count: vi.fn(() => of({ due: due.length })),
    set: vi.fn((id: string, remindAt: string) => of({ ...link(id), remindAt })),
    clear: vi.fn((id: string) => {
      due = due.filter((item) => item.id !== id);
      return of(undefined);
    }),
    setMany: vi.fn(),
  };
  const rediscoverApi = {
    getBlock: vi.fn(() =>
      of(
        options.block ?? {
          week: '2026-W48',
          mode: REDISCOVER_MODE.Forgotten,
          theme: null,
          items: [
            link('Optimistic Nihilism', { note: 'for the weekend, with tea', createdAt: ago(500) }),
            link('Old talk', { createdAt: ago(900) }),
          ],
        },
      ),
    ),
    dismiss: vi.fn(() => of(undefined)),
    hide: vi.fn(() => of(undefined)),
  };
  const foldersApi = {
    list: vi.fn(() =>
      of({
        items: [
          {
            id: 'f1',
            name: 'Angular',
            parentId: null,
            colour: 'clay',
            icon: 'folder',
            linkCount: 1,
            highlighted: false,
            description: null,
            coverImageUrl: null,
            position: 0,
            createdAt: ago(1000),
            updatedAt: ago(1000),
          },
        ],
        counts: { all: 3, unsorted: 1, favorites: 0 },
      }),
    ),
  };
  const actions = { open: vi.fn(), remind: vi.fn(async () => undefined) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: linksApi },
      { provide: REMINDERS_API, useValue: remindersApi },
      { provide: REDISCOVER_API, useValue: rediscoverApi },
      { provide: FOLDERS_API, useValue: foldersApi },
      { provide: LinkActionsService, useValue: actions },
      { provide: ToastService, useValue: { show: vi.fn() } },
      {
        provide: ViewportService,
        useValue: {
          phone: signal(false),
          compact: signal(false),
          desktop: signal(true),
          wide: signal(true),
        },
      },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(TodayPage);
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  await vi.waitFor(async () => {
    await fixture.whenStable();
    expect(element.querySelector('.today__cards--masonry')).not.toBeNull();
  });
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  return { fixture, element, loader, linksApi, remindersApi, rediscoverApi, actions };
}

const text = (element: HTMLElement, selector: string) =>
  [...element.querySelectorAll(selector)].map((node) => node.textContent?.trim());

afterEach(() => {
  document.querySelectorAll('app-today-page').forEach((el) => el.remove());
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.replaceChildren());
});

describe('TodayPage', () => {
  it('shows the four parts in order with the date, without axe violations', async () => {
    const { element } = await setup();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Today');
    expect(element.querySelector('.today__date')?.textContent?.trim()).not.toBe('');
    expect(text(element, 'h2')).toEqual([
      'Back to these',
      'Saved this week',
      'From your shelf',
      'All links',
    ]);
    expect(await axeViolations(element)).toEqual([]);
  });

  it('lists the due reminders under Back to these with the reason and a Revisit link', async () => {
    const { element } = await setup();
    expect(text(element, '.today-back__title')).toEqual(['Wool coat']);
    expect(element.querySelector('.today-back__why')?.textContent).toContain('Due 3 hours ago');
    expect(element.querySelector('app-today-back .today-section__more')?.getAttribute('href')).toBe(
      '/revisit',
    );
  });

  it('Done clears the reminder and shows All caught up', async () => {
    const { fixture, element, loader, remindersApi } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ label: 'Done: Wool coat' }))).click();
    await fixture.whenStable();
    expect(remindersApi.clear).toHaveBeenCalledWith('Wool coat');
    expect(element.textContent).toContain('All caught up');
  });

  it('Snooze offers the presets and a date', async () => {
    const { fixture } = await setup();
    const menu = await TestbedHarnessEnvironment.documentRootLoader(fixture).getHarness(
      UiMenuHarness.with({ label: 'Snooze Wool coat' }),
    );
    await menu.open();
    const items = await menu.getItems();
    expect(items.length).toBeGreaterThan(2);
    expect(await items[items.length - 1]?.getText()).toBe('Pick date and time…');
  });

  it('counts this week, the share in folders, and names each row’s folder', async () => {
    const { element, linksApi } = await setup();
    expect(linksApi.list).toHaveBeenCalledWith({ saved: SAVED_WITHIN.Week, limit: 100 });
    expect(element.querySelector('app-today-week .today-section__count')?.textContent).toContain(
      '2 · 1 in folders',
    );
    expect(text(element, '.today-week__folder')).toEqual(['Angular', 'Unsorted']);
    expect(element.querySelector('app-today-week .today-section__more')?.getAttribute('href')).toBe(
      '/links?saved=week',
    );
  });

  it('reads 100+ when the week has more than one page', async () => {
    const { element } = await setup({ weekMore: true });
    expect(element.querySelector('app-today-week .today-section__count')?.textContent).toContain(
      '2+',
    );
  });

  it('shows a retry when this week fails, and the other parts still load', async () => {
    const { fixture, element, loader, linksApi } = await setup({ weekFails: true });
    expect(element.querySelector('app-today-week ui-notice')).not.toBeNull();
    expect(text(element, '.today-back__title')).toEqual(['Wool coat']);
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Try again' }))).click();
    await fixture.whenStable();
    expect(
      linksApi.list.mock.calls.filter(([query]) => query?.saved === SAVED_WITHIN.Week),
    ).toHaveLength(2);
  });

  it('shows one forgotten link with its note; Not interested brings the next one', async () => {
    const { fixture, element, loader, rediscoverApi } = await setup();
    expect(element.querySelector('.today-shelf__title')?.textContent?.trim()).toBe(
      'Optimistic Nihilism',
    );
    expect(element.querySelector('.today-shelf__meta')?.textContent).toContain('never opened');
    expect(element.querySelector('.today-shelf__note')?.textContent).toContain(
      'for the weekend, with tea',
    );
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Not interested' }))).click();
    await fixture.whenStable();
    expect(rediscoverApi.hide).toHaveBeenCalledWith('Optimistic Nihilism');
    expect(element.querySelector('.today-shelf__title')?.textContent?.trim()).toBe('Old talk');
  });

  it('says that is it once the block is empty', async () => {
    const { element } = await setup({
      block: { week: '2026-W48', mode: null, theme: null, items: [] },
      due: [],
    });
    expect(element.textContent).toContain('That’s it for this week');
    expect(element.textContent).toContain('All caught up');
  });

  it('shows the newest links as cards and opens the library', async () => {
    const { element } = await setup();
    expect(element.querySelectorAll('.today__cards--masonry app-link-card')).toHaveLength(2);
    expect(element.querySelector('.today__all-more')?.getAttribute('href')).toBe('/links');
  });

  it('records an open from a Back to these tile', async () => {
    const { element, actions } = await setup();
    const title = element.querySelector<HTMLAnchorElement>('.today-back__title');
    title?.addEventListener('click', (event) => event.preventDefault(), { once: true });
    title?.click();
    expect(actions.open).toHaveBeenCalledWith(expect.objectContaining({ id: 'Wool coat' }));
  });
});
