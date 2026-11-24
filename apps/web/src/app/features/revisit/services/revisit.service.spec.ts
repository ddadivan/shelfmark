import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { LinkResponse, ReaderProgress } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, throwError } from 'rxjs';
import { LinksStore } from '../../../stores/links.store';
import { RemindersStore } from '../../../stores/reminders.store';
import { LINKS_API } from '../../links/models/links-api.const';
import { READER_API } from '../../reader/models/reader-api.const';
import { RediscoverStore } from '../../rediscover/services/rediscover.store';
import { openedWithin } from '../utils/opened-within';
import { RevisitService } from './revisit.service';

const DAY = 86_400_000;
const NOW = Date.now();
const link = (id: string, openedDaysAgo: number | null): LinkResponse => ({
  ...MOCK_LINKS[0],
  id,
  title: `Link ${id}`,
  lastOpenedAt: openedDaysAgo === null ? null : new Date(NOW - openedDaysAgo * DAY).toISOString(),
});

function setup(progress: ReaderProgress[] | 'fail' = []) {
  const reminders = {
    due: signal<LinkResponse[]>([link('due', null)]),
    loaded: signal(false),
    open: vi.fn(() => {
      reminders.loaded.set(true);
      return Promise.resolve();
    }),
  };
  const rediscover = {
    items: signal<LinkResponse[]>([]),
    loaded: signal(false),
    load: vi.fn(() => {
      rediscover.loaded.set(true);
      return Promise.resolve();
    }),
  };
  const recent = [1, 2, 3, 4, 5, 6].map((n) => link(`r${n}`, n));
  const links = {
    recent: signal<LinkResponse[]>([...recent, link('old', 40)]),
    recentLoaded: signal(false),
    entityMap: signal<Record<string, LinkResponse>>({ known: link('known', null) }),
    loadRecent: vi.fn(() => {
      links.recentLoaded.set(true);
      return Promise.resolve();
    }),
  };
  const api = {
    get: vi.fn((id: string) =>
      id === 'gone' ? throwError(() => new Error()) : of(link(id, null)),
    ),
  };
  const reader = {
    progress: vi.fn(() => (progress === 'fail' ? throwError(() => new Error()) : of(progress))),
  };
  TestBed.configureTestingModule({
    providers: [
      RevisitService,
      { provide: RemindersStore, useValue: reminders },
      { provide: RediscoverStore, useValue: rediscover },
      { provide: LinksStore, useValue: links },
      { provide: LINKS_API, useValue: api },
      { provide: READER_API, useValue: reader },
    ],
  });
  return { service: TestBed.inject(RevisitService), api, reminders, rediscover, links };
}

const progress = (linkId: string): ReaderProgress => ({
  linkId,
  fraction: 0.4,
  minutesLeft: 3,
  updatedAt: new Date(NOW).toISOString(),
});

describe('RevisitService', () => {
  it('loads every group and counts what waits', async () => {
    const { service, api } = setup([progress('known'), progress('fetched'), progress('gone')]);
    expect(service.loaded()).toBe(false);
    await service.load();
    expect(service.loaded()).toBe(true);
    expect(service.continueReading().map((item) => item.link.id)).toEqual(['known', 'fetched']);
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(service.recent().map((item) => item.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
    expect(service.waiting()).toBe(3);
    expect(service.empty()).toBe(false);
  });

  it('shows no Continue reading group when progress cannot be read', async () => {
    const { service } = setup('fail');
    await service.load();
    expect(service.continueReading()).toEqual([]);
    expect(service.loaded()).toBe(true);
  });

  it('is empty only when every group is', async () => {
    const { service, reminders, links } = setup();
    reminders.due.set([]);
    await service.load();
    expect(service.empty()).toBe(false);
    links.recent.set([]);
    expect(service.empty()).toBe(true);
    const before = service.now();
    service.touch();
    expect(service.now()).toBeGreaterThanOrEqual(before);
  });
});

describe('openedWithin', () => {
  it('keeps the links opened in the window', () => {
    expect(openedWithin([link('a', 1), link('b', 31), link('c', null)], 30, NOW)).toHaveLength(1);
  });
});
