import { MCP_TOKEN_PREFIX } from '@shelfmark/contracts';
import { generateToken } from './generate-token';
import { hashToken } from './hash-token';

describe('generateToken', () => {
  it('is the prefix plus 43 base64url characters', () => {
    const { secret } = generateToken();
    expect(secret.startsWith(MCP_TOKEN_PREFIX)).toBe(true);
    expect(secret.slice(MCP_TOKEN_PREFIX.length)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('stores only the digest and the last four characters', () => {
    const generated = generateToken();
    expect(generated.hash).toBe(hashToken(generated.secret));
    expect(generated.last4).toBe(generated.secret.slice(-4));
    expect(generated.last4).toHaveLength(4);
  });

  it('never repeats', () => {
    const secrets = new Set(Array.from({ length: 200 }, () => generateToken().secret));
    expect(secrets.size).toBe(200);
  });

  it('carries 32 random bytes', () => {
    const { secret } = generateToken();
    expect(Buffer.from(secret.slice(MCP_TOKEN_PREFIX.length), 'base64url')).toHaveLength(32);
  });
});
