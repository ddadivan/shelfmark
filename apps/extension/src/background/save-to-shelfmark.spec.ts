import { LINK_LIMIT } from '@shelfmark/contracts';
import { SAVE_OUTCOME } from './models/save-outcome.const';
import { saveToShelfmark } from './save-to-shelfmark';

describe('saveToShelfmark', () => {
  it.each([
    'chrome://extensions',
    'https://user:pw@example.com/',
    'https://example.com/a\u0000b',
    `https://example.com/${'x'.repeat(LINK_LIMIT.UrlMax)}`,
  ])('returns Unsupported for %j without calling the API', async (url) => {
    const result = await saveToShelfmark(url, 'Title');
    expect(result.outcome).toBe(SAVE_OUTCOME.Unsupported);
  });
});
