import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  LINK_SORT_FIELD,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  type ListLinksQuery,
  type ListLinksResponse,
  type SavedViewQuery,
} from '@shelfmark/contracts';
import { MOCK_LINKS_PAGE } from '@shelfmark/contracts/testing';
import { Subject, type Observable } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { LINKS_API } from '../../links/models/links-api.const';
import { NEW_VIEW_PREVIEW } from '../models/new-view-preview.const';
import { NewViewFormService } from './new-view-form.service';
import { NewViewPhraseService } from './new-view-phrase.service';
import { NewViewPreviewService } from './new-view-preview.service';

const ALL: SavedViewQuery = {
  scope: SAVED_VIEW_SCOPE.All,
  folderId: null,
  tags: [],
  kind: null,
  sort: LINK_SORT_FIELD.CreatedAt,
  order: SORT_ORDER.Desc,
  q: '',
  saved: null,
  favorite: false,
};

function setup(showPhrase = false) {
  const requests: { query: ListLinksQuery; answer: Subject<ListLinksResponse> }[] = [];
  const query = signal<SavedViewQuery>(ALL);
  const phrase = signal(showPhrase);
  TestBed.configureTestingModule({
    providers: [
      NewViewPreviewService,
      { provide: NewViewFormService, useValue: { query } },
      { provide: NewViewPhraseService, useValue: { showPhrase: phrase } },
      { provide: FoldersStore, useValue: { entities: () => [] } },
      {
        provide: LINKS_API,
        useValue: {
          list: (request: ListLinksQuery): Observable<ListLinksResponse> => {
            const answer = new Subject<ListLinksResponse>();
            requests.push({ query: request, answer });
            return answer;
          },
        },
      },
    ],
  });
  const service = TestBed.inject(NewViewPreviewService);
  return { service, requests, query, phrase };
}

/** Lets effects run, then moves the clock past the debounce. */
async function settle(ms: number = NEW_VIEW_PREVIEW.DebounceMs): Promise<void> {
  TestBed.tick();
  await vi.advanceTimersByTimeAsync(ms);
}

const page = (count: number, more = false): ListLinksResponse => ({
  items: MOCK_LINKS_PAGE.items.slice(0, count),
  pinned: [],
  nextCursor: more ? 'next' : null,
});

describe('NewViewPreviewService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks at once for the first filter, then once after quick changes', async () => {
    const { service, requests, query } = setup();
    await settle(0);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.query).toMatchObject({ limit: NEW_VIEW_PREVIEW.Limit, order: 'desc' });
    requests[0]?.answer.next(page(2));
    expect(service.preview()?.count).toBe(2);
    expect(service.busy()).toBe(false);
    expect(service.countKey()).toMatch(/^views\.new\.found\./u);

    query.set({ ...ALL, kind: 'video' });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(100);
    query.set({ ...ALL, kind: 'article' });
    await settle();
    expect(requests).toHaveLength(2);
    expect(requests[1]?.query.kind).toBe('article');
    expect(service.busy()).toBe(true);
  });

  it('drops a slow answer once a newer filter was asked', async () => {
    const { service, requests, query } = setup();
    await settle(0);
    query.set({ ...ALL, q: 'signals' });
    await settle();
    requests[0]?.answer.next(page(5));
    expect(service.preview()).toBeNull();
    requests[1]?.answer.next(page(1, true));
    expect(service.preview()).toMatchObject({ count: 1, more: true });
    expect(service.countKey()).toBe('views.new.foundMore');
  });

  it('shows no count after a failure', async () => {
    const { service, requests } = setup();
    await settle(0);
    requests[0]?.answer.error(new Error('offline'));
    expect(service.preview()).toBeNull();
    expect(service.countKey()).toBeNull();
    expect(service.busy()).toBe(false);
  });

  it('asks nothing while the phrase step hides the rows', async () => {
    const { requests, phrase } = setup(true);
    await settle(0);
    expect(requests).toHaveLength(0);
    phrase.set(false);
    await settle(0);
    expect(requests).toHaveLength(1);
  });
});
