import { MOCK_LINK_PREVIEW_DUPLICATE } from '@shelfmark/contracts/testing';
import { firstValueFrom } from 'rxjs';
import { MOCK_HOST } from '../models/mock-host.const';
import { MockLinksApi } from './mock-links.api';
import { normalizeUrl } from './normalize-url';

describe('normalizeUrl', () => {
  it('lowercases the host and drops fragment, utm params and the trailing slash', () => {
    expect(normalizeUrl('https://Example.COM/a/?utm_source=x&b=1#top')).toBe(
      'https://example.com/a/?b=1',
    );
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
  });

  it('returns null for text that is not a URL', () => {
    expect(normalizeUrl('nope')).toBeNull();
  });
});

describe('MockLinksApi', () => {
  const api = new MockLinksApi();

  it('answers the duplicate fixture for an already saved URL', async () => {
    const response = await firstValueFrom(
      api.preview(`${MOCK_LINK_PREVIEW_DUPLICATE.preview.url}/?utm_source=x#intro`),
    );
    expect(response.duplicate).toEqual(MOCK_LINK_PREVIEW_DUPLICATE.duplicate);
  });

  it('generates a preview without duplicate for any other URL', async () => {
    const response = await firstValueFrom(api.preview('https://www.example.org/post'));
    expect(response.duplicate).toBeNull();
    expect(response.preview.title).toContain('example.org');
  });

  it('fails the preview for the unreachable host', async () => {
    await expect(
      firstValueFrom(api.preview(`https://${MOCK_HOST.Unreachable}/doc`)),
    ).rejects.toThrow();
  });

  it('creates a link from the request', async () => {
    const link = await firstValueFrom(
      api.create({ url: 'https://example.org', title: 'T', tags: ['a'] }),
    );
    expect(link).toMatchObject({
      url: 'https://example.org',
      title: 'T',
      tags: ['a'],
      folderId: null,
    });
  });

  it('fails the save for the save-fails host', async () => {
    await expect(
      firstValueFrom(api.create({ url: `https://${MOCK_HOST.SaveFails}` })),
    ).rejects.toThrow();
  });
});
