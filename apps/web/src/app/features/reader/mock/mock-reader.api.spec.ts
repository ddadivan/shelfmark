import { HttpErrorResponse } from '@angular/common/http';
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
    const at = (minute: number) => new Date(Date.UTC(2026, 10, 24, 10, minute)).toISOString();
    await run(
      api.saveProgress({ linkId: a?.id ?? '', fraction: 0.4, minutesLeft: 3, updatedAt: at(1) }),
    );
    await run(
      api.saveProgress({ linkId: b?.id ?? '', fraction: 0.6, minutesLeft: 2, updatedAt: at(2) }),
    );
    await run(
      api.saveProgress({ linkId: c?.id ?? '', fraction: 0.99, minutesLeft: 0, updatedAt: at(3) }),
    );
    await run(
      api.saveProgress({ linkId: 'gone', fraction: 0.5, minutesLeft: 1, updatedAt: at(4) }),
    );
    expect((await run(api.progress())).map((item) => item.linkId)).toEqual([b?.id, a?.id]);
  });

  it('reads broken storage as no progress', async () => {
    localStorage.setItem(MOCK_READER_STORAGE_KEY, '{broken');
    const { api } = setup();
    expect(await run(api.progress())).toEqual([]);
  });
});

describe('HttpReaderApi', () => {
  it('answers no article and no progress without a request', async () => {
    const api = new HttpReaderApi();
    expect(await firstValueFrom(api.article())).toEqual({ article: null });
    expect(await firstValueFrom(api.progress())).toEqual([]);
    expect(await firstValueFrom(api.saveProgress())).toBeUndefined();
  });
});
