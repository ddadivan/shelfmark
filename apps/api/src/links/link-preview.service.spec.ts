import { describe, expect, it } from 'vitest';
import { SAFE_FETCH_ERROR_CODE } from '../fetcher/models/safe-fetch-error-code.const';
import { SafeFetchError } from '../fetcher/safe-fetch.error';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';
import { YOUTUBE_LIMIT } from '../preview/youtube/models/youtube-limit.const';
import { YouTubeOembedService } from '../preview/youtube/youtube-oembed.service';
import { LinkPreviewService } from './link-preview.service';

describe('LinkPreviewService with the real fetcher', () => {
  const fetcher = new SafeFetcherService();
  const service = new LinkPreviewService(
    fetcher,
    new YouTubeOembedService(fetcher, YOUTUBE_LIMIT.OembedEndpoint),
  );

  it.each([
    'http://127.0.0.1/admin',
    'http://localhost/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
    'http://10.0.0.1/',
    'http://intranet.internal/',
    'http://example.test:8080/',
  ])('falls back for the blocked target %s without any network access', async (url) => {
    const result = await service.load(url);
    expect(result.fetched).toBe(false);
    expect(result.preview.url).toBe(url);
    expect(result.preview.title).toContain(url.replace(/^http:\/\//, '').slice(0, 8));
  });
});

describe('LinkPreviewService kind of a page that is not HTML (#537)', () => {
  function serviceThatRefuses(error: unknown): LinkPreviewService {
    const fetcher = {
      fetch: () => Promise.reject(error),
      fetchJson: () => Promise.reject(error),
    } as unknown as SafeFetcherService;
    return new LinkPreviewService(
      fetcher,
      new YouTubeOembedService(fetcher, YOUTUBE_LIMIT.OembedEndpoint),
    );
  }

  it('makes a refused PDF a document', async () => {
    const service = serviceThatRefuses(
      new SafeFetchError(
        SAFE_FETCH_ERROR_CODE.NotHtml,
        'Response is not HTML',
        undefined,
        'application/pdf',
      ),
    );
    const result = await service.load('https://example.com/report');
    expect(result.fetched).toBe(false);
    expect(result.preview.kind).toBe('document');
  });

  it('keeps the URL kind for any other failure', async () => {
    const image = serviceThatRefuses(
      new SafeFetchError(
        SAFE_FETCH_ERROR_CODE.NotHtml,
        'Response is not HTML',
        undefined,
        'image/png',
      ),
    );
    expect((await image.load('https://example.com/a')).preview.kind).toBe('other');
    const broken = serviceThatRefuses(new Error('boom'));
    expect((await broken.load('https://github.com/a/b')).preview.kind).toBe('code');
  });
});
