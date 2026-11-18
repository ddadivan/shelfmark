import { MCP_PROTOCOL_VERSIONS } from '../models/mcp-protocol-version.const';

/** The revision `initialize` answers: the client's when supported, else the newest. */
export function negotiateProtocolVersion(requested: unknown): string {
  return typeof requested === 'string' && MCP_PROTOCOL_VERSIONS.includes(requested)
    ? requested
    : MCP_PROTOCOL_VERSIONS[0];
}

/** Whether the `MCP-Protocol-Version` header is acceptable: absent, or one supported revision. */
export function isSupportedProtocolHeader(header: string | string[] | undefined): boolean {
  if (header === undefined) return true;
  return typeof header === 'string' && MCP_PROTOCOL_VERSIONS.includes(header);
}
