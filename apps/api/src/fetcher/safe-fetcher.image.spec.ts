import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { SAFE_FETCH_ERROR_CODE } from './models/safe-fetch-error-code.const';
import type { SafeFetchErrorCode } from './models/safe-fetch-error-code.type';
import type { SafeFetcherOptions } from './models/safe-fetcher-options.interface';
import { SafeFetchError } from './safe-fetch.error';
import { SafeFetcherService } from './safe-fetcher.service';

const LOOPBACK = '127.0.0.1';
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const MEGABYTE = 1024 * 1024;

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let server: Server;
let port: number;
let handler: Handler;
const seenHeaders: IncomingMessage['headers'][] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    seenHeaders.push(req.headers);
    handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, LOOPBACK, resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  seenHeaders.length = 0;
  handler = (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(PNG_BYTES);
  };
});

function fetcher(options: SafeFetcherOptions = {}): SafeFetcherService {
  return new SafeFetcherService({
    allowedPorts: [port],
    isAddressAllowed: (address) => address === LOOPBACK,
    resolve: async () => [LOOPBACK],
    ...options,
  });
}

async function codeOf(promise: Promise<unknown>): Promise<SafeFetchErrorCode | undefined> {
  try {
    await promise;
  } catch (error) {
    return error instanceof SafeFetchError ? error.code : undefined;
  }
  return undefined;
}

const url = (path = '/'): string => `http://${LOOPBACK}:${port}${path}`;

describe('SafeFetcherService.fetchImage', () => {
  it('returns the raw bytes and the declared type, and sends no cookies', async () => {
    const result = await fetcher().fetchImage(url('/a.png'));
    expect(result.finalUrl).toBe(url('/a.png'));
    expect(result.status).toBe(200);
    expect(result.contentType).toBe('image/png');
    expect(result.bytes.equals(PNG_BYTES)).toBe(true);
    const headers = seenHeaders[0];
    expect(headers?.accept).toContain('image/webp');
    expect(headers?.cookie).toBeUndefined();
    expect(headers?.authorization).toBeUndefined();
  });

  it.each(['application/octet-stream', 'image/x-icon', 'image/vnd.microsoft.icon'])(
    'accepts the loose label %s (the format is decided from the bytes)',
    async (label) => {
      handler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': label });
        res.end(PNG_BYTES);
      };
      expect((await fetcher().fetchImage(url())).contentType).toBe(label);
    },
  );

  it.each(['text/html', 'image/svg+xml', 'application/json', ''])(
    'rejects the response type %j',
    async (label) => {
      handler = (_req, res) => {
        res.writeHead(200, label === '' ? {} : { 'Content-Type': label });
        res.end('<svg xmlns="http://www.w3.org/2000/svg"/>');
      };
      expect(await codeOf(fetcher().fetchImage(url()))).toBe(SAFE_FETCH_ERROR_CODE.NotImage);
    },
  );

  it('still rejects an image on the page fetch', async () => {
    expect(await codeOf(fetcher().fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.NotHtml);
  });

  it('allows 3 MB by default, more than a page', async () => {
    const big = Buffer.alloc(2.5 * MEGABYTE, 1);
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(big);
    };
    expect((await fetcher().fetchImage(url())).bytes.length).toBe(big.length);
    expect(await codeOf(fetcher().fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.NotHtml);
  });

  it('rejects a body above 3 MB by Content-Length and while streaming', async () => {
    const huge = Buffer.alloc(3 * MEGABYTE + 1, 1);
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': huge.length });
      res.end(huge);
    };
    expect(await codeOf(fetcher().fetchImage(url()))).toBe(SAFE_FETCH_ERROR_CODE.TooLarge);
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(huge);
    };
    expect(await codeOf(fetcher().fetchImage(url()))).toBe(SAFE_FETCH_ERROR_CODE.TooLarge);
  });

  it('lets a per-call override only tighten the limits', async () => {
    const body = Buffer.alloc(1000, 1);
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(body);
    };
    expect(await codeOf(fetcher().fetchImage(url(), { maxBodyBytes: 500 }))).toBe(
      SAFE_FETCH_ERROR_CODE.TooLarge,
    );
    // A looser override is ignored: the 3 MB default stays the ceiling.
    const huge = Buffer.alloc(3 * MEGABYTE + 1, 1);
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(huge);
    };
    expect(await codeOf(fetcher().fetchImage(url(), { maxBodyBytes: 50 * MEGABYTE }))).toBe(
      SAFE_FETCH_ERROR_CODE.TooLarge,
    );
  });

  it('times out a slow image', async () => {
    handler = () => undefined;
    expect(await codeOf(fetcher().fetchImage(url(), { totalTimeoutMs: 100 }))).toBe(
      SAFE_FETCH_ERROR_CODE.Timeout,
    );
  });

  it('follows redirects with the same validation and refuses a private target', async () => {
    handler = (req, res) => {
      if (req.url === '/start') {
        res.writeHead(302, { Location: url('/final.png') });
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(PNG_BYTES);
    };
    expect((await fetcher().fetchImage(url('/start'))).finalUrl).toBe(url('/final.png'));

    handler = (_req, res) => {
      res.writeHead(302, { Location: `http://169.254.169.254:${port}/latest/meta-data` });
      res.end();
    };
    expect(await codeOf(fetcher().fetchImage(url()))).toBe(SAFE_FETCH_ERROR_CODE.BlockedAddress);
  });

  it('refuses private and non-http addresses on the first hop', async () => {
    const production = new SafeFetcherService();
    expect(await codeOf(production.fetchImage('http://127.0.0.1/a.png'))).toBe(
      SAFE_FETCH_ERROR_CODE.BlockedAddress,
    );
    expect(await codeOf(production.fetchImage('file:///etc/passwd'))).toBe(
      SAFE_FETCH_ERROR_CODE.DisallowedProtocol,
    );
  });

  it('refuses a compressed image response', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Encoding': 'gzip' });
      res.end(PNG_BYTES);
    };
    expect(await codeOf(fetcher().fetchImage(url()))).toBe(
      SAFE_FETCH_ERROR_CODE.UnsupportedEncoding,
    );
  });
});
