import { hashToken } from './hash-token';

describe('hashToken', () => {
  it('is the SHA-256 hex digest', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('is 64 lower-case hex characters and differs per input', () => {
    expect(hashToken('a')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});
