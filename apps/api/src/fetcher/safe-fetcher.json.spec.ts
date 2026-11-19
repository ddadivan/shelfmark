import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { SAFE_FETCH_ERROR_CODE } from './models/safe-fetch-error-code.const';
import type { SafeFetchErrorCode } from './models/safe-fetch-error-code.type';
import type { SafeFetcherOptions } from './models/safe-fetcher-options.interface';
import { SafeFetchError } from './safe-fetch.error';
import { SafeFetcherService } from './safe-fetcher.service';

const LOOPBACK = '127.0.0.1';
const KILOBYTE = 1024;
const JSON_BODY = JSON.stringify({ title: 'Grüße', n: 1 });

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
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON_BODY);
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

describe('SafeFetcherService.fetchJson', () => {
  it('returns the JSON text as UTF-8, asks for JSON only and sends no cookies', async () => {
    const result = await fetcher().fetchJson(url('/oembed?x=1'));
    expect(result).toEqual({
      finalUrl: url('/oembed?x=1'),
      status: 200,
      contentType: 'application/json',
      body: JSON_BODY,
    });
    const headers = seenHeaders[0];
    expect(headers?.accept).toBe('application/json');
    expect(headers?.cookie).toBeUndefined();
    expect(headers?.authorization).toBeUndefined();
  });

  it.each(['text/html', 'text/plain', 'application/javascript', 'image/png', ''])(
    'refuses the response type %j',
    async (type) => {
      handler = (_req, res) => {
        res.writeHead(200, type === '' ? {} : { 'Content-Type': type });
        res.end(JSON_BODY);
      };
      expect(await codeOf(fetcher().fetchJson(url()))).toBe(SAFE_FETCH_ERROR_CODE.NotJson);
    },
  );

  it('caps the body at 64 KB by default, declared or streamed', async () => {
    const big = `"${'x'.repeat(64 * KILOBYTE)}"`;
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(big);
    };
    expect(await codeOf(fetcher().fetchJson(url()))).toBe(SAFE_FETCH_ERROR_CODE.TooLarge);
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' });
      res.write(big.slice(0, 40 * KILOBYTE));
      res.end(big.slice(40 * KILOBYTE));
    };
    expect(await codeOf(fetcher().fetchJson(url()))).toBe(SAFE_FETCH_ERROR_CODE.TooLarge);
  });

  it('keeps the address policy and a non-2xx answer is an error', async () => {
    const blocked = fetcher({ isAddressAllowed: () => false });
    expect(await codeOf(blocked.fetchJson(url()))).toBe(SAFE_FETCH_ERROR_CODE.BlockedAddress);
    handler = (_req, res) => {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end('{}');
    };
    expect(await codeOf(fetcher().fetchJson(url()))).toBe(SAFE_FETCH_ERROR_CODE.HttpError);
  });

  it('validates every redirect hop and follows at most two', async () => {
    handler = (req, res) => {
      const hop = Number(req.url?.slice(1) || '0');
      res.writeHead(302, { Location: `/${hop + 1}` });
      res.end();
    };
    expect(await codeOf(fetcher().fetchJson(url('/0')))).toBe(
      SAFE_FETCH_ERROR_CODE.TooManyRedirects,
    );
    handler = (_req, res) => {
      res.writeHead(302, { Location: 'http://10.0.0.1/' });
      res.end();
    };
    const policy = fetcher({ resolve: async () => [LOOPBACK], allowedPorts: [port, 80] });
    expect(await codeOf(policy.fetchJson(url()))).toBe(SAFE_FETCH_ERROR_CODE.BlockedAddress);
  });

  it('leaves the HTML mode HTML-only', async () => {
    expect(await codeOf(fetcher().fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.NotHtml);
  });
});
