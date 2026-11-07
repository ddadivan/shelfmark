import {
  BadRequestException,
  type ArgumentsHost,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp } from '../../app/create-app';
import { REQUEST_ID_HEADER } from '../request-id/request-id.middleware';
import { AllExceptionsFilter } from './all-exceptions.filter';

function callFilter(exception: unknown, headersSent = false) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', path: '/x' }),
      getResponse: () => ({ locals: { requestId: 'rid-1' }, headersSent, status }),
    }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status, json };
}

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

  it.each([new Error('secret detail'), 'boom', null, { type: 'other' }, { status: 302 }])(
    'hides details of %j behind a 500',
    (exception) => {
      const { status, json } = callFilter(exception);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Internal Server Error',
        requestId: 'rid-1',
      });
    },
  );

  it('logs the stack server-side but not in the response', () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const failure = new Error('secret detail');
    const { json } = callFilter(failure);
    expect(errorLog).toHaveBeenCalledWith('GET /x 500 rid-1', failure.stack);
    expect(JSON.stringify(json.mock.calls)).not.toContain('secret detail');
    expect(JSON.stringify(json.mock.calls)).not.toContain('at ');
  });

  it('logs a stringified non-Error cause', () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    callFilter('boom');
    expect(errorLog).toHaveBeenCalledWith('GET /x 500 rid-1', 'boom');
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
