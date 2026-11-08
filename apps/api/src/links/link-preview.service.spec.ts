import { describe, expect, it } from 'vitest';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';
import { LinkPreviewService } from './link-preview.service';

describe('LinkPreviewService with the real fetcher', () => {
  const service = new LinkPreviewService(new SafeFetcherService());

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
