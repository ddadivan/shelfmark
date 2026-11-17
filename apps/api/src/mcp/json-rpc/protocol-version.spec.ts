import { MCP_PROTOCOL_VERSIONS } from '../models/mcp-protocol-version.const';
import { isSupportedProtocolHeader, negotiateProtocolVersion } from './protocol-version';

describe('MCP protocol version', () => {
  it('lists the newest revision first', () => {
    expect(MCP_PROTOCOL_VERSIONS[0]).toBe('2025-11-25');
    expect([...MCP_PROTOCOL_VERSIONS].sort().reverse()).toEqual(MCP_PROTOCOL_VERSIONS);
  });

  it("answers the client's version when supported, else the newest", () => {
    expect(negotiateProtocolVersion('2025-06-18')).toBe('2025-06-18');
    expect(negotiateProtocolVersion('2025-03-26')).toBe('2025-03-26');
    expect(negotiateProtocolVersion('2024-11-05')).toBe('2025-11-25');
    expect(negotiateProtocolVersion('2099-01-01')).toBe('2025-11-25');
    expect(negotiateProtocolVersion(undefined)).toBe('2025-11-25');
    expect(negotiateProtocolVersion(20250618)).toBe('2025-11-25');
  });

  it('accepts an absent header or a supported revision only', () => {
    expect(isSupportedProtocolHeader(undefined)).toBe(true);
    expect(isSupportedProtocolHeader('2025-11-25')).toBe(true);
    expect(isSupportedProtocolHeader('2024-11-05')).toBe(false);
    expect(isSupportedProtocolHeader('')).toBe(false);
    expect(isSupportedProtocolHeader(['2025-11-25'])).toBe(false);
  });
});
