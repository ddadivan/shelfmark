import { generateNonce } from './generate-nonce';

describe('generateNonce', () => {
  it('is base64 that decodes to 16 bytes', () => {
    const nonce = generateNonce();

    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(atob(nonce)).toHaveLength(16);
  });

  it('does not repeat over 1000 calls', () => {
    const nonces = new Set(Array.from({ length: 1000 }, () => generateNonce()));

    expect(nonces.size).toBe(1000);
  });
});
