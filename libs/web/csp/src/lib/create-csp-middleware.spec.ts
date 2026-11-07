import { createCspMiddleware } from './create-csp-middleware';

const SHELL = '<html><app-root ngCspNonce="CSP_NONCE_PLACEHOLDER"></app-root></html>';
const origin = 'https://shelfmark.test';

function handle(path: string, method = 'GET'): Response | undefined {
  return createCspMiddleware(SHELL)(new Request(`${origin}${path}`, { method }));
}

function nonceOf(response: Response): string {
  const match = /style-src 'self' 'nonce-([^']+)'/.exec(
    response.headers.get('Content-Security-Policy') ?? '',
  );
  return match?.[1] ?? '';
}

describe('createCspMiddleware', () => {
  it('answers a document with the same nonce in the header and the body', async () => {
    const response = handle('/folders/42');

    expect(response?.status).toBe(200);
    const nonce = nonceOf(response as Response);
    expect(nonce).not.toBe('');
    const body = await (response as Response).text();
    expect(body).toContain(`ngCspNonce="${nonce}"`);
    expect(body).not.toContain('CSP_NONCE_PLACEHOLDER');
  });

  it('sets the content type and forbids caching', () => {
    const response = handle('/');

    expect(response?.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(response?.headers.get('Cache-Control')).toBe('private, no-store');
  });

  describe('service worker shell fetch', () => {
    const swHeaders = { 'Sec-Fetch-Dest': 'empty', 'Sec-Fetch-Mode': 'cors' };

    function handleWith(path: string, headers: Record<string, string>): Response {
      return createCspMiddleware(SHELL)(new Request(`${origin}${path}`, { headers })) as Response;
    }

    it('gets the shell as built, so the ngsw.json hash check passes', async () => {
      const response = handleWith('/index.html?ngsw-cache-bust=0.123', swHeaders);

      expect(await response.text()).toBe(SHELL);
      expect(nonceOf(response)).toBe('CSP_NONCE_PLACEHOLDER');
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      expect(response.headers.get('Vary')).toBe('Sec-Fetch-Dest, Sec-Fetch-Mode');
    });

    it.each([
      ['/foo?ngsw-cache-bust=1', swHeaders],
      ['/?ngsw-cache-bust=1', swHeaders],
      ['/index.html', swHeaders],
      ['/index.html?ngsw-cache-bust=1', { ...swHeaders, 'Sec-Fetch-Dest': 'document' }],
      ['/index.html?ngsw-cache-bust=1', { 'Sec-Fetch-Mode': 'cors' }],
      ['/index.html?ngsw-cache-bust=1', {}],
      ['/index.html?ngsw-cache-bust=1', { ...swHeaders, 'Sec-Fetch-Mode': 'navigate' }],
      ['/index.html?ngsw-cache-bust=1', { 'Sec-Fetch-Dest': 'empty' }],
    ])('gets a random nonce for %s with %j', async (path, headers) => {
      const response = handleWith(path, headers);

      expect(nonceOf(response)).not.toBe('CSP_NONCE_PLACEHOLDER');
      expect(await response.text()).not.toContain('CSP_NONCE_PLACEHOLDER');
    });
  });

  it('uses a different nonce for every request', () => {
    expect(nonceOf(handle('/') as Response)).not.toBe(nonceOf(handle('/') as Response));
  });

  it('answers HEAD without a body', async () => {
    const response = handle('/', 'HEAD');

    expect(response?.status).toBe(200);
    expect(response?.headers.get('Content-Security-Policy')).toContain('nonce-');
    expect(await response?.text()).toBe('');
  });

  it('continues for non-GET methods', () => {
    expect(handle('/', 'POST')).toBeUndefined();
  });

  it.each(['/api/health', '/api', '/main-ABCD1234.js', '/missing.js'])(
    'continues for %s',
    (path) => {
      expect(handle(path)).toBeUndefined();
    },
  );

  it('throws at creation when the shell has no placeholder', () => {
    expect(() => createCspMiddleware('<html></html>')).toThrow(/CSP_NONCE_PLACEHOLDER/);
  });
});
