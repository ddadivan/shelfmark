import { TestBed } from '@angular/core/testing';
import type { LinkResponse, ListLinksQuery } from '@shelfmark/contracts';
import { SAVED_WITHIN } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of } from 'rxjs';
import { LinksStore } from '../../../stores/links.store';
import { RemindersStore } from '../../../stores/reminders.store';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { LINKS_API } from '../../links/models/links-api.const';
import { REDISCOVER_API } from '../../rediscover/models/rediscover-api.const';
import { REMINDERS_API } from '../../reminders/models/reminders-api.const';
import { TodayStore } from './today.store';

const HOUR = 3_600_000;
const link = (id: string, changes: Partial<LinkResponse> = {}): LinkResponse => ({
  ...(MOCK_LINKS[0] as LinkResponse),
  id,
  title: id,
  remindAt: null,
  ...changes,
});

async function setup() {
  const due = link('due', { remindAt: new Date(Date.now() - HOUR).toISOString() });
  const week = [link('due'), link('w2'), link('w3')];
  const latest = [link('due'), link('l2')];
  TestBed.configureTestingModule({
    providers: [
      TodayStore,
      {
        provide: LINKS_API,
        useValue: {
          list: vi.fn((query?: ListLinksQuery) =>
            of({
              items: query?.saved === SAVED_WITHIN.Week ? week : latest,
              nextCursor: null,
              pinned: [],
            }),
          ),
          remove: vi.fn(() => of(undefined)),
          update: vi.fn(),
        },
      },
      { provide: FOLDERS_API, useValue: { list: vi.fn(() => of([])) } },
      {
        provide: REMINDERS_API,
        useValue: {
          list: vi.fn(() => of({ due: [due], upcoming: [] })),
          count: vi.fn(),
          set: vi.fn((id: string, remindAt: string) => of({ ...link(id), remindAt })),
          clear: vi.fn(),
          setMany: vi.fn(),
        },
      },
      {
        provide: REDISCOVER_API,
        useValue: {
          getBlock: vi.fn(() => of({ week: 'w', mode: 'forgotten', theme: null, items: [] })),
        },
      },
    ],
  });
  const store = TestBed.inject(TodayStore);
  await store.load();
  return { store, links: TestBed.inject(LinksStore) };
}

describe('TodayStore following LinksStore', () => {
  it('shows an edit in the week, the latest links and the due list', async () => {
    const { store, links } = await setup();
    links.applyEdit({ ...(store.back()[0] as LinkResponse), title: 'Renamed', isFavorite: true });
    expect(store.week()[0]?.title).toBe('Renamed');
    expect(store.latest()[0]?.isFavorite).toBe(true);
    expect(store.back()[0]?.title).toBe('Renamed');
  });

  it('drops a deleted link and puts it back on Undo', async () => {
    const { store, links } = await setup();
    links.remove('w2', store.week()[1]);
    expect(store.week().map((item) => item.id)).toEqual(['due', 'w3']);
    expect(store.weekFiled()).toBe(store.week().filter((item) => item.folderId !== null).length);
    links.undoRemove('w2');
    expect(store.week().map((item) => item.id)).toEqual(['due', 'w2', 'w3']);
  });

  it('shows a snooze on the latest card', async () => {
    const { store } = await setup();
    const later = new Date(Date.now() + 24 * HOUR).toISOString();
    const reminders = TestBed.inject(RemindersStore);
    expect(await reminders.set([store.latest()[0] as LinkResponse], later)).toBe(true);
    expect(store.latest()[0]?.remindAt).toBe(later);
    expect(store.week()[0]?.remindAt).toBe(later);
    expect(store.back()).toEqual([]);
  });
});
