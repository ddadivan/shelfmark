import express, { json, type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { mcpBodyParser } from './mcp-body-parser';

/** A bare Express app with the MCP parser, then the global JSON parser, echoing what it got. */
function app() {
  const server = express();
  server.use(mcpBodyParser);
  server.use(json({ limit: '100kb' }));
  server.all('/{*path}', (req, res) => {
    res.json({ body: req.body as unknown, type: typeof req.body });
  });
  // The parser's errors carry their status (413); answer it without the default handler's log.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express needs four parameters to see an error handler
  const quiet: ErrorRequestHandler = (error: { status?: number }, _req, res, _next) => {
    res.status(error.status ?? 500).end();
  };
  server.use(quiet);
  return server;
}

describe('mcpBodyParser', () => {
  it('reads the JSON body of POST /api/mcp as text, even when it is not valid JSON', async () => {
    const res = await request(app())
      .post('/api/mcp')
      .set('Content-Type', 'application/json')
      .send('{"jsonrpc":')
      .expect(200);
    expect(res.body).toEqual({ body: '{"jsonrpc":', type: 'string' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('accepts a trailing slash', async () => {
    const res = await request(app())
      .post('/api/mcp/')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(200);
    expect(res.body.type).toBe('string');
  });

  it('answers a body over 100kb with 413', async () => {
    await request(app())
      .post('/api/mcp')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ padding: 'x'.repeat(100 * 1024) }))
      .expect(413);
  });

  it('leaves a non-JSON body unread', async () => {
    const res = await request(app())
      .post('/api/mcp')
      .set('Content-Type', 'text/plain')
      .send('hello')
      .expect(200);
    expect(res.body.body).toBeUndefined();
  });

  it('marks other methods on the route no-store and reads no body', async () => {
    const res = await request(app()).get('/api/mcp').expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.body).toBeUndefined();
  });

  it('passes every other route to the global JSON parser untouched', async () => {
    const res = await request(app()).post('/api/links').send({ a: 1 }).expect(200);
    expect(res.body).toEqual({ body: { a: 1 }, type: 'object' });
    expect(res.headers['cache-control']).toBeUndefined();
    const nested = await request(app()).post('/api/mcp/tokens').send({ b: 2 }).expect(200);
    expect(nested.body.type).toBe('object');
  });
});
