import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { AuthService } from '@thallesp/nestjs-better-auth';
import type { AuthenticatedRequest } from '../common/auth/models/authenticated-request.interface';
import { SessionAuthGuard } from './session-auth.guard';

const RAW_SESSION = {
  user: { id: 'u1', name: 'Ada', email: 'ada@example.com', image: null, isDemo: false },
  session: {
    token: 'secret-token',
    ipAddress: '10.0.0.1',
    userAgent: 'curl',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
  },
};

interface SessionArgs {
  headers: Headers;
  query: unknown;
}

function setup(options: { isPublic?: boolean; getSession?: () => Promise<unknown> } = {}) {
  const getSession = vi.fn((_args: SessionArgs) =>
    (options.getSession ?? (() => Promise.resolve(RAW_SESSION)))(),
  );
  const authService = { api: { getSession } } as unknown as AuthService;
  const reflector = {
    getAllAndOverride: vi.fn(() => options.isPublic),
  } as unknown as Reflector;
  const request: AuthenticatedRequest = { headers: { cookie: 'a=b' } } as AuthenticatedRequest;
  const context = {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const guard = new SessionAuthGuard(reflector, authService);
  return { guard, context, request, getSession, reflector };
}

describe('SessionAuthGuard', () => {
  it('lets a public route through without a session lookup', async () => {
    const { guard, context, getSession, request } = setup({ isPublic: true });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(getSession).not.toHaveBeenCalled();
    expect(request.auth).toBeUndefined();
  });

  it('reads the PUBLIC key from handler and class', async () => {
    const { guard, context, reflector } = setup();
    await guard.canActivate(context);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('PUBLIC', ['handler', 'class']);
  });

  it('reads the session read-only and from the request cookies', async () => {
    const { guard, context, getSession } = setup();
    await guard.canActivate(context);
    const args = getSession.mock.calls[0][0];
    expect(args.query).toEqual({ disableRefresh: true });
    expect(args.headers.get('cookie')).toBe('a=b');
  });

  it('sets only the contract shape on the request, never the token', async () => {
    const { guard, context, request } = setup();
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.auth).toEqual({
      user: { id: 'u1', name: 'Ada', email: 'ada@example.com', image: null, isDemo: false },
      session: { expiresAt: '2030-01-01T00:00:00.000Z' },
    });
    expect(JSON.stringify(request)).not.toContain('secret-token');
  });

  it.each([null, undefined, 'x', {}, { user: { id: 1 }, session: {} }])(
    'answers 401 for the missing or malformed session %j',
    async (value) => {
      const { guard, context, request } = setup({ getSession: () => Promise.resolve(value) });
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(request.auth).toBeUndefined();
    },
  );

  it('maps a Better Auth 4xx error to 401', async () => {
    const apiError = Object.assign(new Error('x'), { status: 'UNAUTHORIZED', statusCode: 401 });
    const { guard, context } = setup({ getSession: () => Promise.reject(apiError) });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    Object.assign(new Error('db down'), { statusCode: 500 }),
    new Error('connection refused'),
    'boom',
  ])('rethrows %j so a database outage is a 500, not a sign-out', async (error) => {
    const { guard, context } = setup({ getSession: () => Promise.reject(error) });
    await expect(guard.canActivate(context)).rejects.toBe(error);
  });
});
