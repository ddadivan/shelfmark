import { MCP_TOKEN_PREFIX } from '@shelfmark/contracts';
import { parseBearerToken } from './parse-bearer-token';

const BODY = 'A'.repeat(20) + 'b'.repeat(20) + '-_9';
const TOKEN = `${MCP_TOKEN_PREFIX}${BODY}`;

describe('parseBearerToken', () => {
  it('reads a well-formed bearer token', () => {
    expect(parseBearerToken(`Bearer ${TOKEN}`)).toBe(TOKEN);
  });

  it('takes the scheme in any case and one or more spaces', () => {
    expect(parseBearerToken(`bearer ${TOKEN}`)).toBe(TOKEN);
    expect(parseBearerToken(`BEARER   ${TOKEN}`)).toBe(TOKEN);
  });

  it('refuses a missing header, several headers and other schemes', () => {
    expect(parseBearerToken(undefined)).toBeNull();
    expect(parseBearerToken([`Bearer ${TOKEN}`])).toBeNull();
    expect(parseBearerToken('')).toBeNull();
    expect(parseBearerToken(`Basic ${TOKEN}`)).toBeNull();
    expect(parseBearerToken(TOKEN)).toBeNull();
    expect(parseBearerToken('Bearer')).toBeNull();
  });

  it('refuses a wrong prefix, length, alphabet or trailing data', () => {
    expect(parseBearerToken(`Bearer smk_test_${BODY}`)).toBeNull();
    expect(parseBearerToken(`Bearer SMK_LIVE_${BODY}`)).toBeNull();
    expect(parseBearerToken(`Bearer ${TOKEN.slice(0, -1)}`)).toBeNull();
    expect(parseBearerToken(`Bearer ${TOKEN}x`)).toBeNull();
    expect(parseBearerToken(`Bearer ${TOKEN.slice(0, -1)}+`)).toBeNull();
    expect(parseBearerToken(`Bearer ${TOKEN} extra`)).toBeNull();
    expect(parseBearerToken(`Bearer ${TOKEN}${'a'.repeat(10_000)}`)).toBeNull();
  });
});
