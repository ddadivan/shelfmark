import { randomBytes } from 'node:crypto';
import { MCP_TOKEN_PREFIX } from '@shelfmark/contracts';
import type { GeneratedToken } from '../models/generated-token.interface';
import { MCP_TOKEN_BYTES } from '../models/mcp-token-bytes.const';
import { hashToken } from './hash-token';

/**
 * A new personal MCP token (ADR 0054): `MCP_TOKEN_PREFIX` plus `MCP_TOKEN_BYTES` (32) bytes from the
 * CSPRNG as unpadded base64url (43 characters, 256 bits). Only `hash` and `last4` are stored; the
 * secret is answered once by the create call and must never be logged.
 */
export function generateToken(): GeneratedToken {
  const secret = `${MCP_TOKEN_PREFIX}${randomBytes(MCP_TOKEN_BYTES).toString('base64url')}`;
  return { secret, hash: hashToken(secret), last4: secret.slice(-4) };
}
