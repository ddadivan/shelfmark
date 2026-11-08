import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer as createTcpServer } from 'node:net';
import type { AddressInfo, Server as TcpServer, Socket } from 'node:net';
import { Test } from '@nestjs/testing';
import { FetcherModule } from './fetcher.module';
import { SAFE_FETCH_ERROR_CODE } from './models/safe-fetch-error-code.const';
import type { SafeFetchErrorCode } from './models/safe-fetch-error-code.type';
import type { SafeFetcherOptions } from './models/safe-fetcher-options.interface';
import { SafeFetchError } from './safe-fetch.error';
import { SafeFetcherService } from './safe-fetcher.service';

const LOOPBACK = '127.0.0.1';
const HTML = 'text/html; charset=utf-8';

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
    res.writeHead(200, { 'Content-Type': HTML });
    res.end('<html><title>ok</title></html>');
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

describe('SafeFetcherService', () => {
  it('is provided by FetcherModule with the production defaults', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [FetcherModule] }).compile();
    const service = moduleRef.get(SafeFetcherService);
    expect(await codeOf(service.fetch('http://localhost/'))).toBe(
      SAFE_FETCH_ERROR_CODE.BlockedAddress,
    );
    expect(await codeOf(service.fetch('http://127.0.0.1/'))).toBe(
      SAFE_FETCH_ERROR_CODE.BlockedAddress,
    );
    expect(await codeOf(service.fetch(`http://${LOOPBACK}:${port}/`))).toBe(
      SAFE_FETCH_ERROR_CODE.DisallowedPort,
    );
  });

  it('fetches a page and sends no cookies, auth or compression', async () => {
    const result = await fetcher().fetch(url('/page'));
    expect(result).toEqual({
      finalUrl: url('/page'),
      status: 200,
      contentType: 'text/html',
      body: '<html><title>ok</title></html>',
    });
    const headers = seenHeaders[0];
    expect(headers?.['accept-encoding']).toBe('identity');
    expect(headers?.cookie).toBeUndefined();
    expect(headers?.authorization).toBeUndefined();
    expect(headers?.['user-agent']).toContain('ShelfmarkBot');
  });

  it('accepts XHTML', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/xhtml+xml' });
      res.end('<html/>');
    };
    expect((await fetcher().fetch(url())).contentType).toBe('application/xhtml+xml');
  });

  it('decodes the charset from the header and from a meta tag', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=iso-8859-1' });
      res.end(Buffer.from('caf\xe9', 'latin1'));
    };
    expect((await fetcher().fetch(url())).body).toBe('café');

    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(Buffer.from('<meta charset="windows-1252">caf\xe9', 'latin1'));
    };
    expect((await fetcher().fetch(url())).body).toContain('café');

    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=nonsense' });
      res.end('plain');
    };
    expect((await fetcher().fetch(url())).body).toBe('plain');
  });

  it('follows redirects and returns the final URL', async () => {
    handler = (req, res) => {
      if (req.url === '/start') {
        res.writeHead(302, { Location: '/end' });
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': HTML });
      res.end('done');
    };
    const result = await fetcher().fetch(url('/start'));
    expect(result.finalUrl).toBe(url('/end'));
    expect(result.body).toBe('done');
  });

  it('stops after 5 redirects', async () => {
    handler = (req, res) => {
      const next = Number(req.url?.slice(1) ?? 0) + 1;
      res.writeHead(302, { Location: `/${next}` });
      res.end();
    };
    expect(await codeOf(fetcher().fetch(url('/0')))).toBe(SAFE_FETCH_ERROR_CODE.TooManyRedirects);
    expect(seenHeaders).toHaveLength(6);
  });

  it('follows exactly 5 redirects', async () => {
    handler = (req, res) => {
      const hop = Number(req.url?.slice(1) ?? 0);
      if (hop < 5) {
        res.writeHead(301, { Location: `/${hop + 1}` });
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': HTML });
      res.end('five');
    };
    expect((await fetcher().fetch(url('/0'))).body).toBe('five');
  });

  it.each([
    ['a private IPv4 literal', 'http://10.0.0.5:PORT/'],
    ['the cloud metadata address', 'http://169.254.169.254:PORT/latest'],
    ['an IPv6 loopback literal', 'http://[::1]:PORT/'],
    ['an IPv4-mapped IPv6 literal', 'http://[::ffff:10.0.0.1]:PORT/'],
    ['localhost', 'http://localhost:PORT/'],
    ['a .internal name', 'http://db.internal:PORT/'],
  ])('re-validates a redirect to %s', async (_label, target) => {
    handler = (_req, res) => {
      res.writeHead(302, { Location: target.replace('PORT', String(port)) });
      res.end();
    };
    expect(await codeOf(fetcher().fetch(url('/')))).toBe(SAFE_FETCH_ERROR_CODE.BlockedAddress);
    expect(seenHeaders).toHaveLength(1);
  });

  it('blocks a private literal with the production policy', async () => {
    const real = new SafeFetcherService({ allowedPorts: [port] });
    expect(await codeOf(real.fetch(`http://10.0.0.5:${port}/`))).toBe(
      SAFE_FETCH_ERROR_CODE.BlockedAddress,
    );
  });

  it('rejects a redirect whose target resolves to a private address', async () => {
    handler = (_req, res) => {
      res.writeHead(302, { Location: `http://evil.test:${port}/` });
      res.end();
    };
    const service = fetcher({
      resolve: async (host) => (host === 'evil.test' ? ['10.0.0.9'] : [LOOPBACK]),
    });
    expect(await codeOf(service.fetch(`http://good.test:${port}/`))).toBe(
      SAFE_FETCH_ERROR_CODE.BlockedAddress,
    );
  });

  it('rejects when any DNS answer is private', async () => {
    const service = fetcher({ resolve: async () => [LOOPBACK, '192.168.0.10'] });
    expect(await codeOf(service.fetch(`http://mixed.test:${port}/`))).toBe(
      SAFE_FETCH_ERROR_CODE.BlockedAddress,
    );
    expect(seenHeaders).toHaveLength(0);
  });

  it('connects to the validated address, not to a second lookup', async () => {
    let calls = 0;
    const service = fetcher({
      resolve: async () => {
        calls += 1;
        return [LOOPBACK];
      },
    });
    const result = await service.fetch(`http://pinned.test:${port}/`);
    expect(result.status).toBe(200);
    expect(calls).toBe(1);
  });

  it('reports DNS failures and empty answers', async () => {
    const failing = fetcher({
      resolve: async () => {
        throw new Error('ENOTFOUND');
      },
    });
    expect(await codeOf(failing.fetch(`http://nx.test:${port}/`))).toBe(
      SAFE_FETCH_ERROR_CODE.DnsFailure,
    );
    const empty = fetcher({ resolve: async () => [] });
    expect(await codeOf(empty.fetch(`http://nx.test:${port}/`))).toBe(
      SAFE_FETCH_ERROR_CODE.DnsFailure,
    );
  });

  it('times out a slow DNS lookup', async () => {
    const service = fetcher({
      limits: { totalTimeoutMs: 100 },
      resolve: () => new Promise(() => undefined),
    });
    expect(await codeOf(service.fetch(`http://slow.test:${port}/`))).toBe(
      SAFE_FETCH_ERROR_CODE.Timeout,
    );
  });

  it('rejects a response larger than the cap (header and stream)', async () => {
    const limits = { maxBodyBytes: 1_000 };
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': HTML, 'Content-Length': '5000' });
      res.end('x'.repeat(5000));
    };
    expect(await codeOf(fetcher({ limits }).fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.TooLarge);

    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': HTML });
      res.write('x'.repeat(600));
      setTimeout(() => res.end('x'.repeat(600)), 20);
    };
    expect(await codeOf(fetcher({ limits }).fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.TooLarge);
  });

  it('applies per-call limits without changing the service defaults', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': HTML });
      res.end('x'.repeat(5000));
    };
    const service = fetcher();
    expect(await codeOf(service.fetch(url(), { maxBodyBytes: 1_000 }))).toBe(
      SAFE_FETCH_ERROR_CODE.TooLarge,
    );
    expect((await service.fetch(url())).body).toHaveLength(5000);
  });

  it('does not let a per-call override loosen the service limits', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': HTML });
      res.end('x'.repeat(5000));
    };
    const service = fetcher({ limits: { maxBodyBytes: 1_000 } });
    expect(await codeOf(service.fetch(url(), { maxBodyBytes: 10_000_000 }))).toBe(
      SAFE_FETCH_ERROR_CODE.TooLarge,
    );
  });

  it('times out a server that never answers', async () => {
    handler = () => undefined;
    const service = fetcher({ limits: { totalTimeoutMs: 150 } });
    expect(await codeOf(service.fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.Timeout);
  });

  it('times out a body that stalls', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': HTML });
      res.write('<html>');
    };
    const service = fetcher({ limits: { totalTimeoutMs: 150 } });
    expect(await codeOf(service.fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.Timeout);
  });

  it('rejects non-HTML content types', async () => {
    for (const type of ['application/json', 'image/png', 'application/pdf']) {
      handler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': type });
        res.end('{}');
      };
      expect(await codeOf(fetcher().fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.NotHtml);
    }
    handler = (_req, res) => {
      res.writeHead(200);
      res.end('no type');
    };
    expect(await codeOf(fetcher().fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.NotHtml);
  });

  it('maps error statuses and redirects without a Location to http-error', async () => {
    handler = (_req, res) => {
      res.writeHead(404);
      res.end();
    };
    await expect(fetcher().fetch(url())).rejects.toMatchObject({
      code: SAFE_FETCH_ERROR_CODE.HttpError,
      status: 404,
    });
    handler = (_req, res) => {
      res.writeHead(302);
      res.end();
    };
    expect(await codeOf(fetcher().fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.HttpError);
  });

  it('reports a refused connection as a network error', async () => {
    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, LOOPBACK, resolve));
    const closedPort = (closed.address() as AddressInfo).port;
    await new Promise<void>((resolve) => closed.close(() => resolve()));
    const service = fetcher({ allowedPorts: [closedPort] });
    expect(await codeOf(service.fetch(`http://${LOOPBACK}:${closedPort}/`))).toBe(
      SAFE_FETCH_ERROR_CODE.NetworkError,
    );
  });

  it('reports a connection that drops mid-body', async () => {
    handler = (req, res) => {
      res.writeHead(200, { 'Content-Type': HTML, 'Content-Length': '100' });
      res.write('<html>');
      setTimeout(() => req.socket.destroy(), 20);
    };
    expect(await codeOf(fetcher().fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.NetworkError);
  });

  it('times out against a TCP server that accepts but never responds (offline)', async () => {
    const stalled: TcpServer = createTcpServer({ pauseOnConnect: true });
    const sockets: Socket[] = [];
    stalled.on('connection', (socket) => sockets.push(socket));
    await new Promise<void>((resolve) => stalled.listen(0, LOOPBACK, resolve));
    const stalledPort = (stalled.address() as AddressInfo).port;
    try {
      const service = fetcher({
        allowedPorts: [stalledPort],
        limits: { connectTimeoutMs: 5_000, totalTimeoutMs: 200 },
      });
      expect(await codeOf(service.fetch(`http://${LOOPBACK}:${stalledPort}/`))).toBe(
        SAFE_FETCH_ERROR_CODE.Timeout,
      );
    } finally {
      for (const socket of sockets) {
        socket.destroy();
      }
      await new Promise<void>((resolve) => stalled.close(() => resolve()));
    }
  });

  it('rejects a malformed, empty or non-http redirect target', async () => {
    for (const [location, expected] of [
      ['http://[', SAFE_FETCH_ERROR_CODE.InvalidUrl],
      ['', SAFE_FETCH_ERROR_CODE.InvalidUrl],
      ['   ', SAFE_FETCH_ERROR_CODE.InvalidUrl],
      ['data:text/html,hi', SAFE_FETCH_ERROR_CODE.DisallowedProtocol],
      ['javascript:alert(1)', SAFE_FETCH_ERROR_CODE.DisallowedProtocol],
    ] as const) {
      handler = (_req, res) => {
        res.writeHead(302, { Location: location });
        res.end();
      };
      expect(await codeOf(fetcher().fetch(url()))).toBe(expected);
    }
  });

  it('rejects compressed responses and accepts an explicit identity encoding', async () => {
    for (const encoding of ['gzip', 'br', 'deflate']) {
      handler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': HTML, 'Content-Encoding': encoding });
        res.end('x');
      };
      expect(await codeOf(fetcher().fetch(url()))).toBe(SAFE_FETCH_ERROR_CODE.UnsupportedEncoding);
    }
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': HTML, 'Content-Encoding': 'identity' });
      res.end('plain');
    };
    expect((await fetcher().fetch(url())).body).toBe('plain');
  });

  it.each([
    ['ftp://example.com/', SAFE_FETCH_ERROR_CODE.DisallowedProtocol],
    ['file:///etc/passwd', SAFE_FETCH_ERROR_CODE.DisallowedProtocol],
    ['gopher://example.com/', SAFE_FETCH_ERROR_CODE.DisallowedProtocol],
    ['javascript:alert(1)', SAFE_FETCH_ERROR_CODE.DisallowedProtocol],
    ['data:text/html,hi', SAFE_FETCH_ERROR_CODE.DisallowedProtocol],
    ['not a url', SAFE_FETCH_ERROR_CODE.InvalidUrl],
    ['', SAFE_FETCH_ERROR_CODE.InvalidUrl],
    ['http://user:pass@example.com/', SAFE_FETCH_ERROR_CODE.InvalidUrl],
    [`http://example.com/${'a'.repeat(2100)}`, SAFE_FETCH_ERROR_CODE.InvalidUrl],
    ['http://example.com:22/', SAFE_FETCH_ERROR_CODE.DisallowedPort],
    ['https://example.com:8443/', SAFE_FETCH_ERROR_CODE.DisallowedPort],
  ])('refuses %s', async (input, expected) => {
    const production = new SafeFetcherService();
    expect(await codeOf(production.fetch(input))).toBe(expected);
  });
});
