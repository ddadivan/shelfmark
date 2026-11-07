import { isSignInReason } from './is-sign-in-reason';

describe('isSignInReason', () => {
  it.each(['session-expired', 'demo-expired'])('accepts %s', (value) => {
    expect(isSignInReason(value)).toBe(true);
  });

  it.each(['constructor', '__proto__', '', 'other', undefined, null, 1])('rejects %j', (value) => {
    expect(isSignInReason(value)).toBe(false);
  });
});
