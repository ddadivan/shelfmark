import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import {
  LINK_ERROR_MESSAGE,
  LINK_LIMIT,
  LINK_SORT_FIELD,
  linkCapFor,
  linkLimitMessage,
  linkTitleSortKey,
  SORT_ORDER,
  type LinkResponse,
  type ListLinksQuery,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { MockAiData } from '../../ai/mock/mock-ai-data';
import { MockLibraryData } from './mock-library-data';
import { MockLinksApi } from './mock-links.api';

function createApi(): { api: MockLinksApi; data: MockLibraryData } {
  const injector = Injector.create({ providers: [MockLibraryData, MockAiData] });
  const api = runInInjectionContext(injector, () => new MockLinksApi());
  return { api, data: injector.get(MockLibraryData) };
}

async function failure(call: Promise<unknown>): Promise<HttpErrorResponse | null> {
  try {
    await call;
    return null;
  } catch (error) {
    return error instanceof HttpErrorResponse ? error : null;
  }
}

/** Fills the library (live links) up to `room` free slots under the cap. */
function fillTo(data: MockLibraryData, room: number): void {
  const template = data.links[0] as LinkResponse;
  const target = linkCapFor(data.isDemo) - room;
  const extra = Array.from({ length: Math.max(0, target - data.links.length) }, (_, i) => ({
    ...template,
    id: `filler-${i}`,
    url: `https://filler.example/${i}`,
  }));
  data.links = [...data.links, ...extra];
}

describe('MockLinksApi link cap', () => {
  it('answers 409 LimitReached when create finds no room', async () => {
    const { api, data } = createApi();
    fillTo(data, 0);
    const error = await failure(firstValueFrom(api.create({ url: 'https://new.example/a' })));
    expect(error?.status).toBe(HttpStatusCode.Conflict);
    expect(error?.error.message).toBe(LINK_ERROR_MESSAGE.LimitReached);
  });

  it('counts Trash toward the cap', async () => {
    const { api, data } = createApi();
    fillTo(data, 1);
    await firstValueFrom(api.removeBatch([data.links[0]?.id ?? '']));
    expect(data.linkRoom()).toBe(1);
    await firstValueFrom(api.create({ url: 'https://new.example/a' }));
    const error = await failure(firstValueFrom(api.create({ url: 'https://new.example/b' })));
    expect(error?.status).toBe(HttpStatusCode.Conflict);
  });

  it('answers 409 with the room a batch does not fit, none when it fits', async () => {
    const { api, data } = createApi();
    fillTo(data, 2);
    const item = (n: number): { url: string; idempotencyKey: string } => ({
      url: `https://batch.example/${n}`,
      idempotencyKey: `key-${n}`,
    });
    const error = await failure(
      firstValueFrom(api.createBatch({ items: [item(1), item(2), item(3)] })),
    );
    expect(error?.status).toBe(HttpStatusCode.Conflict);
    expect(error?.error.message).toBe(linkLimitMessage(2));
    const ok = await firstValueFrom(api.createBatch({ items: [item(1), item(2)] }));
    expect(ok.links).toHaveLength(2);
  });
});

describe('MockLinksApi list order and cursor', () => {
  it('orders by title with the contracts sort key and breaks ties by id', async () => {
    const { api } = createApi();
    const query: ListLinksQuery = {
      sort: LINK_SORT_FIELD.Title,
      order: SORT_ORDER.Asc,
      limit: 100,
    };
    const { items } = await firstValueFrom(api.list(query));
    const keys = items.map((link) => linkTitleSortKey(link.title));
    expect(keys).toEqual([...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });

  it('answers 400 for a cursor from another sort or order', async () => {
    const { api } = createApi();
    const page = await firstValueFrom(api.list({ limit: 5 }));
    const cursor = page.nextCursor ?? '';
    for (const other of [
      { sort: LINK_SORT_FIELD.Title },
      { order: SORT_ORDER.Asc },
    ] satisfies ListLinksQuery[]) {
      const error = await failure(firstValueFrom(api.list({ ...other, cursor })));
      expect(error?.status).toBe(HttpStatusCode.BadRequest);
      expect(error?.error.message).toBe(LINK_ERROR_MESSAGE.InvalidCursor);
    }
    const garbage = await failure(firstValueFrom(api.list({ cursor: '!!' })));
    expect(garbage?.status).toBe(HttpStatusCode.BadRequest);
  });

  it('keeps the next page steady when a link is saved while paging', async () => {
    const { api } = createApi();
    const first = await firstValueFrom(api.list({ limit: 10 }));
    const reference = await firstValueFrom(api.list({ limit: 20 }));
    await firstValueFrom(api.create({ url: 'https://inserted.example/new' }));
    const second = await firstValueFrom(api.list({ limit: 10, cursor: first.nextCursor ?? '' }));
    expect(second.items.map((link) => link.id)).toEqual(
      reference.items.slice(10).map((link) => link.id),
    );
  });

  it('pages every sort without repeats or gaps', async () => {
    const { api, data } = createApi();
    for (const sort of Object.values(LINK_SORT_FIELD)) {
      for (const order of Object.values(SORT_ORDER)) {
        const seen: string[] = [];
        let cursor: string | undefined;
        do {
          const page = await firstValueFrom(api.list({ sort, order, limit: 40, cursor }));
          seen.push(...page.items.map((link) => link.id));
          cursor = page.nextCursor ?? undefined;
        } while (cursor !== undefined);
        expect(new Set(seen).size).toBe(seen.length);
        expect(seen).toHaveLength(data.links.length);
      }
    }
  });

  it('builds validation messages from the limits', async () => {
    const { api } = createApi();
    const error = await failure(
      firstValueFrom(api.create({ url: 'https://a.example', title: '' })),
    );
    expect(error?.error.message).toContain(`title must be 1 to ${LINK_LIMIT.TitleMax} characters`);
  });
});
