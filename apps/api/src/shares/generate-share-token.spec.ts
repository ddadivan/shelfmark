import { SHARE_LIMIT, SHARE_TOKEN_PATTERN } from '@shelfmark/contracts';
import { generateShareToken } from './generate-share-token';

describe('generateShareToken', () => {
  it('is 22 base64url characters carrying 16 random bytes', () => {
    const token = generateShareToken();
    expect(token).toMatch(SHARE_TOKEN_PATTERN);
    expect(token).toHaveLength(SHARE_LIMIT.TokenLength);
    expect(Buffer.from(token, 'base64url')).toHaveLength(SHARE_LIMIT.TokenBytes);
  });

  it('does not repeat', () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => generateShareToken()));
    expect(tokens.size).toBe(1000);
  });
});
