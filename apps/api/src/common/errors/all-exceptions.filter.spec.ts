import {
  BadRequestException,
  type ArgumentsHost,
  BadGatewayException,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp } from '../../app/create-app';
import { REQUEST_ID_HEADER } from '../request-id/request-id.middleware';
import { TunnelUpstreamException } from '../../monitoring/tunnel-upstream.exception';
import { AllExceptionsFilter } from './all-exceptions.filter';

interface FakeRequest {
  method: string;
  path: string;
  baseUrl?: string;
  route?: { path: string };
}

function callFilter(
  exception: unknown,
  headersSent = false,
  report: (exception: unknown, requestId: string) => Promise<void> = () => Promise.resolve(),
  req: FakeRequest = { method: 'GET', path: '/x' },
) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ locals: { requestId: 'rid-1' }, headersSent, status }),
    }),
  } as unknown as ArgumentsHost;
  const done = new AllExceptionsFilter(report).catch(exception, host);
  return { status, json, done };
}

const TOKEN = 'Abc123SecretShareToken_xyz';

describe('AllExceptionsFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps HttpException status and message', () => {
    const { status, json } = callFilter(new NotFoundException('nope'));
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      error: 'Not Found',
      message: 'nope',
      requestId: 'rid-1',
    });
  });

  it('keeps validation message arrays', () => {
    const { json } = callFilter(new BadRequestException(['a must be a string', 'b is required']));
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['a must be a string', 'b is required'],
      }),
    );
  });

  it('falls back to the exception message for non-string response messages', () => {
    const { json } = callFilter(new HttpException({ message: 42 }, 409));
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
  });

  it('handles string-bodied HttpException', () => {
    const { json } = callFilter(new HttpException('plain text', 418));
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 418, message: 'plain text' }),
    );
  });

  it('hides the message of a 5xx HttpException', () => {
    const { json } = callFilter(new HttpException('db password is hunter2', 500));
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal Server Error',
      requestId: 'rid-1',
    });
  });

  it('maps raw body-parser errors', () => {
    expect(callFilter({ type: 'entity.parse.failed' }).status).toHaveBeenCalledWith(400);
    expect(callFilter({ type: 'entity.too.large' }).status).toHaveBeenCalledWith(413);
  });

  it.each([
    [{ status: 415, type: 'charset.unsupported' }, 415, 'Unsupported Media Type'],
    [{ statusCode: 400, type: 'request.aborted' }, 400, 'Bad Request'],
    // Better Auth APIError: string `status`, numeric `statusCode`.
    [{ status: 'UNAUTHORIZED', statusCode: 401 }, 401, 'Unauthorized'],
  ])('maps http-errors %j to a generic 4xx', (exception, code, phrase) => {
    const { json } = callFilter(exception);
    expect(json).toHaveBeenCalledWith({
      statusCode: code,
      error: phrase,
      message: phrase,
      requestId: 'rid-1',
    });
  });

  it.each([
    new Error('secret detail'),
    'boom',
    null,
    { type: 'other' },
    { status: 302 },
    // Shape of a Prisma known request error: the code and meta must never reach the client.
    Object.assign(new Error('Unique constraint failed on tags_user_id_lower_name_key'), {
      code: 'P2002',
      meta: { target: ['user_id'] },
    }),
  ])('hides details of %j behind a 500', (exception) => {
    const { status, json } = callFilter(exception);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal Server Error',
      requestId: 'rid-1',
    });
  });

  it('logs the stack server-side but not in the response', () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const failure = new Error('secret detail');
    const { json } = callFilter(failure);
    expect(errorLog).toHaveBeenCalledWith('GET /x 500 rid-1', failure.stack);
    expect(JSON.stringify(json.mock.calls)).not.toContain('secret detail');
    expect(JSON.stringify(json.mock.calls)).not.toContain('at ');
  });

  it('reports 5xx after the response was sent, but not 4xx or the tunnel upstream failure', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const report = vi.fn().mockResolvedValue(undefined);
    const failure = new Error('boom');
    const first = callFilter(failure, false, report);
    expect(first.json.mock.invocationCallOrder[0]).toBeLessThan(
      report.mock.invocationCallOrder[0] ?? 0,
    );
    await first.done;
    expect(report).toHaveBeenCalledWith(failure, 'rid-1');

    report.mockClear();
    await callFilter(new NotFoundException(), false, report).done;
    await callFilter(new TunnelUpstreamException(), false, report).done;
    expect(report).not.toHaveBeenCalled();

    // Any other 502 is a real server fault.
    await callFilter(new BadGatewayException(), false, report).done;
    expect(report).toHaveBeenCalledTimes(1);
  });

  it('logs a stringified non-Error cause', () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    callFilter('boom');
    expect(errorLog).toHaveBeenCalledWith('GET /x 500 rid-1', 'boom');
  });

  it('logs the route pattern, never the share token, for a 429 on a matched route', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    callFilter(new HttpException('Too Many Requests', 429), false, undefined, {
      method: 'GET',
      path: `/api/public/collections/${TOKEN}`,
      baseUrl: '',
      route: { path: '/api/public/collections/:token' },
    });
    expect(warn).toHaveBeenCalledWith('GET /api/public/collections/:token 429 rid-1');
    expect(JSON.stringify(warn.mock.calls)).not.toContain(TOKEN);
  });

  it('replaces the share token in the raw path of a 404 before routing', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    callFilter(new NotFoundException(), false, undefined, {
      method: 'GET',
      path: `/api/public/collections/${TOKEN}/links/l1/nope`,
    });
    expect(warn).toHaveBeenCalledWith('GET /api/public/collections/:token/links/l1/nope 404 rid-1');
    expect(JSON.stringify(warn.mock.calls)).not.toContain(TOKEN);
  });

  it('writes nothing when headers were already sent', () => {
    const { status } = callFilter(new Error('late'), true);
    expect(status).not.toHaveBeenCalled();
  });
});

describe('error responses over HTTP', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createApp({ isProduction: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the unified 404 shape for unknown routes', async () => {
    const res = await request(app.getHttpServer()).get('/api/nope').set('X-Request-Id', 'my-id');
    expect(res.status).toBe(404);
    expect(res.headers[REQUEST_ID_HEADER.toLowerCase()]).toBe('my-id');
    expect(res.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Cannot GET /api/nope',
      requestId: 'my-id',
    });
  });

  it('never logs the share token of an unmatched public collection path', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const res = await request(app.getHttpServer()).get(`/api/public/collections/${TOKEN}/nope`);
    expect(res.status).toBe(404);
    // Nest's not-found catch-all matches here, so the line names its pattern, not the path.
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^GET \S+ 404 /));
    expect(JSON.stringify(warn.mock.calls)).not.toContain(TOKEN);
    warn.mockRestore();
  });

  it('logs the route pattern for a refused share token', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const res = await request(app.getHttpServer()).get(`/api/public/collections/${TOKEN}`);
    expect(res.status).toBe(404);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/api\/public\/collections\/:token 404 /),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain(TOKEN);
    warn.mockRestore();
  });

  it('maps malformed JSON to 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"a":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: expect.any(String),
      requestId: res.headers[REQUEST_ID_HEADER.toLowerCase()],
    });
  });

  it('maps oversized bodies to 413', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ a: 'x'.repeat(200_000) }));
    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({ statusCode: 413, error: 'Payload Too Large' });
  });
});
