import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { SAFE_FETCH_ERROR_CODE } from './models/safe-fetch-error-code.const';
import type { SafeFetchErrorCode } from './models/safe-fetch-error-code.type';
import type { SafeFetcherOptions } from './models/safe-fetcher-options.interface';
import { SafeFetchError } from './safe-fetch.error';
import { SafeFetcherService } from './safe-fetcher.service';

const LOOPBACK = '127.0.0.1';

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
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html></html>');
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

describe('SafeFetcherService.fetchHeaders', () => {
  it('answers the framing headers without reading the body and sends no cookies', async () => {
    handler = (_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "frame-ancestors 'none'",
      });
      res.end('<html></html>');
    };
    const result = await fetcher().fetchHeaders(url('/page'));
    expect(result).toEqual({
      finalUrl: url('/page'),
      status: 200,
      headers: { xFrameOptions: 'DENY', contentSecurityPolicy: "frame-ancestors 'none'" },
    });
    expect(seenHeaders[0]?.cookie).toBeUndefined();
    expect(seenHeaders[0]?.authorization).toBeUndefined();
  });

  it('answers null for absent headers and joins several CSP headers', async () => {
    expect((await fetcher().fetchHeaders(url())).headers).toEqual({
      xFrameOptions: null,
      contentSecurityPolicy: null,
    });
    handler = (_req, res) => {
      res.setHeader('Content-Security-Policy', ["default-src 'self'", 'frame-ancestors https:']);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end();
    };
    expect((await fetcher().fetchHeaders(url())).headers.contentSecurityPolicy).toBe(
      "default-src 'self', frame-ancestors https:",
    );
  });

  it('accepts any content type, even a compressed body, without reading it', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Encoding': 'gzip' });
      res.write(Buffer.alloc(64 * 1024));
      setTimeout(() => res.end(), 50);
    };
    expect((await fetcher().fetchHeaders(url())).status).toBe(200);
  });

  it('answers a non-2xx status instead of throwing', async () => {
    handler = (_req, res) => {
      res.writeHead(404, { 'X-Frame-Options': 'SAMEORIGIN' });
      res.end();
    };
    const result = await fetcher().fetchHeaders(url());
    expect(result.status).toBe(404);
    expect(result.headers.xFrameOptions).toBe('SAMEORIGIN');
  });

  it('follows a redirect and answers the headers of the final page', async () => {
    handler = (req, res) => {
      if (req.url === '/start') {
        res.writeHead(302, { Location: '/end', 'X-Frame-Options': 'DENY' });
        res.end();
        return;
      }
      res.writeHead(200, { 'X-Frame-Options': 'ALLOWALL' });
      res.end();
    };
    const result = await fetcher().fetchHeaders(url('/start'));
    expect(result.finalUrl).toBe(url('/end'));
    expect(result.headers.xFrameOptions).toBe('ALLOWALL');
  });

  it('keeps the address policy, validates every hop and follows at most three', async () => {
    expect(await codeOf(fetcher({ isAddressAllowed: () => false }).fetchHeaders(url()))).toBe(
      SAFE_FETCH_ERROR_CODE.BlockedAddress,
    );
    handler = (req, res) => {
      const hop = Number(req.url?.slice(1) || '0');
      res.writeHead(302, { Location: `/${hop + 1}` });
      res.end();
    };
    expect(await codeOf(fetcher().fetchHeaders(url('/0')))).toBe(
      SAFE_FETCH_ERROR_CODE.TooManyRedirects,
    );
    handler = (_req, res) => {
      res.writeHead(302, { Location: 'http://10.0.0.1/' });
      res.end();
    };
    const policy = fetcher({ allowedPorts: [port, 80] });
    expect(await codeOf(policy.fetchHeaders(url()))).toBe(SAFE_FETCH_ERROR_CODE.BlockedAddress);
  });

  it('refuses a non-http URL and times out on a silent server', async () => {
    expect(await codeOf(fetcher().fetchHeaders('ftp://example.com/'))).toBe(
      SAFE_FETCH_ERROR_CODE.DisallowedProtocol,
    );
    handler = () => undefined;
    expect(await codeOf(fetcher().fetchHeaders(url(), { totalTimeoutMs: 100 }))).toBe(
      SAFE_FETCH_ERROR_CODE.Timeout,
    );
  });

  it('leaves the HTML mode HTML-only', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      res.end('x');
    };
    expect(await codeOf(fetcher().fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.NotHtml);
  });
});
