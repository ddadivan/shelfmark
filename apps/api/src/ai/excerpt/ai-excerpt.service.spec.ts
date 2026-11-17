import { AiExcerptService } from './ai-excerpt.service';
import type { SafeFetcherService } from '../../fetcher/safe-fetcher.service';

function setup(fetch: SafeFetcherService['fetch']) {
  const fetcher = { fetch: vi.fn(fetch) } as unknown as SafeFetcherService;
  return {
    service: new AiExcerptService(fetcher),
    fetch: fetcher.fetch as ReturnType<typeof vi.fn>,
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

  it('answers an empty page for any fetch failure', async () => {
    const { service } = setup(() => Promise.reject(new Error('blocked')));
    expect(await service.load('http://10.0.0.1/')).toEqual({ excerpt: null, description: null });
  });
});
