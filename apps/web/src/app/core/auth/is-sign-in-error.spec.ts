import { isSignInError } from './is-sign-in-error';

describe('isSignInError', () => {
  it('knows the Better Auth codes it explains', () => {
    expect(isSignInError('email_not_found')).toBe(true);
    expect(isSignInError('access_denied')).toBe(true);
  });

  it.each(['', 'nope', undefined, null, 1])('does not know %s', (value) => {
    expect(isSignInError(value)).toBe(false);
  });
});
