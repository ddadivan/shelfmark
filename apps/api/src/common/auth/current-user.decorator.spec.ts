import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { currentUserFactory } from './current-user.decorator';

function contextWith(request: object): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

describe('currentUserFactory', () => {
  it('returns the user the guard put on the request', () => {
    const user = {
      id: 'u1',
      name: 'Ada',
      email: 'a@example.com',
      image: null,
      isDemo: false,
      demoExpiresAt: null,
      onboardingCompletedAt: null,
    };
    expect(
      currentUserFactory(undefined, contextWith({ auth: { user, session: { expiresAt: 'x' } } })),
    ).toBe(user);
  });

  it('fails closed with 401 when there is no authenticated user', () => {
    expect(() => currentUserFactory(undefined, contextWith({}))).toThrow(UnauthorizedException);
  });
});
