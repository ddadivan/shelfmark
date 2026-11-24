import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { LINK_KIND, READER_BLOCK_KIND } from '@shelfmark/contracts';
import { firstValueFrom, type Observable } from 'rxjs';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { HttpReaderApi } from '../http/http-reader.api';
import { MockReaderApi } from './mock-reader.api';
import { MOCK_READER_STORAGE_KEY } from './models/mock-reader-storage-key.const';

async function run<T>(source: Observable<T>): Promise<T> {
  const result = firstValueFrom(source);
  await vi.advanceTimersByTimeAsync(2_000);
  return result;
}

function setup() {
  const injector = Injector.create({ providers: [MockLibraryData, MockReaderApi] });
  return { api: injector.get(MockReaderApi), library: injector.get(MockLibraryData) };
}

describe('MockReaderApi', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('answers typed blocks for an article and no article for a video', async () => {
    const { api, library } = setup();
    const article = library.links.find((link) => link.kind === LINK_KIND.Article);
    const video = library.links.find((link) => link.kind === LINK_KIND.Video);
    const text = await run(api.article(article?.id ?? ''));
    expect(text.article?.title).toBe(article?.title);
    expect(text.article?.minutes).toBeGreaterThan(0);
    expect(new Set(text.article?.blocks.map((block) => block.kind))).toEqual(
      new Set(Object.values(READER_BLOCK_KIND).filter((kind) => kind !== READER_BLOCK_KIND.Image)),
    );
    expect((await run(api.article(video?.id ?? ''))).article).toBeNull();
  });

  it('answers 404 for an unknown link', async () => {
    const { api } = setup();
    const missing = expect(firstValueFrom(api.article('nope'))).rejects.toBeInstanceOf(
      HttpErrorResponse,
    );
    await vi.advanceTimersByTimeAsync(2_000);
    await missing;
  });

  it('keeps started, unfinished texts of live links, newest first', async () => {
    const { api, library } = setup();
    const [a, b, c] = library.links;
    const save = async (id: string, fraction: number, minute: number) => {
      vi.setSystemTime(new Date(Date.UTC(2026, 10, 24, 10, minute)));
      await run(api.saveProgress(id, { fraction, minutesLeft: 1 }));
    };
    await save(a?.id ?? '', 0.4, 1);
    await save(b?.id ?? '', 0.6, 2);
    await save(c?.id ?? '', 0.99, 3);
    expect((await run(api.progress())).map((item) => item.linkId)).toEqual([b?.id, a?.id]);
  });

  it('reads broken storage as no progress', async () => {
    localStorage.setItem(MOCK_READER_STORAGE_KEY, '{broken');
    const { api } = setup();
    expect(await run(api.progress())).toEqual([]);
  });
});

describe('MockReaderApi progress writes', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it.each([
    ['an unknown link', 'gone', { fraction: 0.5, minutesLeft: 1 }, 404],
    ['a share above 1', '', { fraction: 1.5, minutesLeft: 1 }, 400],
    ['fractional minutes', '', { fraction: 0.5, minutesLeft: 0.5 }, 400],
  ])('refuses %s like the API', async (_name, id, request, status) => {
    const { api, library } = setup();
    const linkId = id === '' ? (library.links[0]?.id ?? '') : id;
    const failed = expect(firstValueFrom(api.saveProgress(linkId, request))).rejects.toMatchObject({
      status,
    });
    await vi.advanceTimersByTimeAsync(2_000);
    await failed;
  });
});

describe('HttpReaderApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('calls the Reader endpoints', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(HttpReaderApi);
    const http = TestBed.inject(HttpTestingController);

    const article = firstValueFrom(api.article('l 1'));
    http.expectOne({ method: 'GET', url: '/api/links/l%201/reader' }).flush({ article: null });
    expect(await article).toEqual({ article: null });

    const progress = firstValueFrom(api.progress());
    http.expectOne({ method: 'GET', url: '/api/reader/progress' }).flush([]);
    expect(await progress).toEqual([]);

    const saved = firstValueFrom(api.saveProgress('l1', { fraction: 0.3, minutesLeft: 2 }));
    const put = http.expectOne({ method: 'PUT', url: '/api/reader/progress/l1' });
    expect(put.request.body).toEqual({ fraction: 0.3, minutesLeft: 2 });
    put.flush(null);
    expect(await saved).toBeNull();
  });
});
