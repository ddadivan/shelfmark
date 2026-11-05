import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import request from 'supertest';

describe('vercel handler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('serves the Nest app through the Express instance', async () => {
    const { default: handler } = await import('./vercel-handler');
    const server = createServer((req, res) => {
      void handler(req, res);
    });
    try {
      const response = await request(server).get('/api/health');
      expect(response.status).toBe(200);
      const missing = await request(server).get('/api/nope');
      expect(missing.status).toBe(404);
      expect(missing.body).toMatchObject({ statusCode: 404, error: 'Not Found' });
    } finally {
      server.close();
    }
  });

  it('does not cache a failed bootstrap and caches a successful one', async () => {
    const listener = vi.fn((_req: IncomingMessage, res: ServerResponse) => {
      res.end('ok');
    });
    const fakeApp = {
      init: vi.fn().mockResolvedValue(undefined),
      getHttpAdapter: () => ({ getInstance: () => listener }),
    };
    const createApp = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(fakeApp);
    vi.doMock('./app/create-app', () => ({ createApp }));
    const { default: handler } = await import('./vercel-handler');
    const req = {} as IncomingMessage;
    const res = { end: vi.fn() } as unknown as ServerResponse;

    await expect(handler(req, res)).rejects.toThrow('boom');
    await handler(req, res);
    await handler(req, res);

    expect(createApp).toHaveBeenCalledTimes(2);
    expect(fakeApp.init).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
