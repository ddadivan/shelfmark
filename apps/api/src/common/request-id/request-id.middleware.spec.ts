import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_LOCAL, requestIdMiddleware } from './request-id.middleware';

function run(incoming: string | undefined) {
  const req = { get: () => incoming } as unknown as Request;
  const setHeader = vi.fn();
  const res = { locals: {} as Record<string, unknown>, setHeader } as unknown as Response;
  const next: NextFunction = vi.fn();
  requestIdMiddleware(req, res, next);
  return { res, setHeader, next };
}

describe('requestIdMiddleware', () => {
  it('keeps a valid incoming id and echoes it', () => {
    const { res, setHeader, next } = run('abc-123.DEF_4');
    expect(res.locals[REQUEST_ID_LOCAL]).toBe('abc-123.DEF_4');
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'abc-123.DEF_4');
    expect(next).toHaveBeenCalled();
  });

  it.each([undefined, '', 'has space', 'bad/char', 'x'.repeat(129)])(
    'generates a UUID for %j',
    (incoming) => {
      const { res } = run(incoming);
      expect(res.locals[REQUEST_ID_LOCAL]).toMatch(/^[0-9a-f-]{36}$/);
    },
  );
});
