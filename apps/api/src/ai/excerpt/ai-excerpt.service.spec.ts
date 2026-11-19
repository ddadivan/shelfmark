import { AiExcerptService } from './ai-excerpt.service';
import type { SafeFetcherService } from '../../fetcher/safe-fetcher.service';
import { YOUTUBE_LIMIT } from '../../preview/youtube/models/youtube-limit.const';
import { YouTubeOembedService } from '../../preview/youtube/youtube-oembed.service';

const VIDEO = 'https://youtu.be/dQw4w9WgXcQ';
const PAGE = {
  finalUrl: VIDEO,
  status: 200,
  contentType: 'text/html',
  body: '<html><head><meta name="description" content="Consent"></head><body><p>Before you continue</p></body></html>',
};

function setup(
  fetch: SafeFetcherService['fetch'],
  fetchJson: SafeFetcherService['fetchJson'] = () => Promise.reject(new Error('unused')),
) {
  const fetcher = {
    fetch: vi.fn(fetch),
    fetchJson: vi.fn(fetchJson),
  } as unknown as SafeFetcherService;
  return {
    service: new AiExcerptService(
      fetcher,
      new YouTubeOembedService(fetcher, YOUTUBE_LIMIT.OembedEndpoint),
    ),
    fetch: fetcher.fetch as ReturnType<typeof vi.fn>,
    fetchJson: fetcher.fetchJson as ReturnType<typeof vi.fn>,
  };
}

describe('AiExcerptService', () => {
  it('fetches through the safe fetcher with the tighter limits and reads text and description', async () => {
    const { service, fetch } = setup(() =>
      Promise.resolve({
        finalUrl: 'https://example.com/a',
        status: 200,
        contentType: 'text/html',
        body: '<html><head><meta name="description" content="About it"></head><body><p>Page text</p></body></html>',
      }),
    );
    expect(await service.load('https://example.com/a')).toEqual({
      excerpt: 'Page text',
      description: 'About it',
    });
    expect(fetch).toHaveBeenCalledWith('https://example.com/a', {
      totalTimeoutMs: 4000,
      maxBodyBytes: 512 * 1024,
      maxRedirects: 3,
    });
  });

  it('reads a YouTube video from oEmbed (title and channel) without fetching the page', async () => {
    const { service, fetch, fetchJson } = setup(
      () => Promise.resolve(PAGE),
      () =>
        Promise.resolve({
          finalUrl: 'x',
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ title: 'Never gonna', author_name: 'Rick Astley' }),
        }),
    );
    expect(await service.load(VIDEO)).toEqual({
      excerpt: 'YouTube video: Never gonna by Rick Astley',
      description: 'Rick Astley',
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(fetchJson).toHaveBeenCalledWith(
      `${YOUTUBE_LIMIT.OembedEndpoint}?url=${encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}&format=json`,
      expect.objectContaining({ totalTimeoutMs: 4000 }),
    );
  });

  it('reads the page within the rest of the budget when oEmbed fails', async () => {
    const { service, fetch } = setup(
      () => Promise.resolve(PAGE),
      () => Promise.reject(new Error('down')),
    );
    expect(await service.load(VIDEO)).toEqual({
      excerpt: 'Before you continue',
      description: 'Consent',
    });
    const limits = fetch.mock.calls[0]?.[1] as { totalTimeoutMs: number };
    expect(limits.totalTimeoutMs).toBeGreaterThan(0);
    expect(limits.totalTimeoutMs).toBeLessThanOrEqual(4000);
  });

  it('answers an empty page for any fetch failure', async () => {
    const { service } = setup(() => Promise.reject(new Error('blocked')));
    expect(await service.load('http://10.0.0.1/')).toEqual({ excerpt: null, description: null });
  });
});
