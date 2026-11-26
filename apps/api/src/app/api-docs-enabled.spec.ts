import { apiDocsEnabled } from './api-docs-enabled';

describe('apiDocsEnabled', () => {
  it('serves the docs in development and tests', () => {
    expect(apiDocsEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(apiDocsEnabled({ NODE_ENV: 'test' })).toBe(true);
  });

  it('serves them on a Vercel preview deployment', () => {
    expect(apiDocsEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'preview' })).toBe(true);
  });

  it('hides them on the production site, and on a production build without VERCEL_ENV', () => {
    expect(apiDocsEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'production' })).toBe(false);
    expect(apiDocsEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(apiDocsEnabled({})).toBe(false);
  });
});
