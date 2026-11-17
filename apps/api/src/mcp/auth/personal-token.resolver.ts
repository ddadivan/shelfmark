import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { McpAuthResolver } from '../models/mcp-auth-resolver.interface';
import { MCP_ACCOUNT_SELECT } from '../models/mcp-account-select.const';
import type { McpCaller } from '../models/mcp-caller.interface';
import { hashToken } from '../tokens/hash-token';
import { parseBearerToken } from './parse-bearer-token';

/**
 * Resolves `Authorization: Bearer smk_live_…` (ADR 0053 point 5): a well-formed token is hashed and
 * looked up with its user in one query on the unique digest. Missing, malformed, unknown and revoked
 * tokens are all `null`. Only the `Authorization` header is read: never a cookie.
 */
@Injectable()
export class PersonalTokenResolver implements McpAuthResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(req: Request): Promise<McpCaller | null> {
    const secret = parseBearerToken(req.headers.authorization);
    if (secret === null) return null;
    const row = await this.prisma.mcpToken.findUnique({
      where: { tokenHash: hashToken(secret) },
      select: { id: true, userId: true, includeNotes: true, user: { select: MCP_ACCOUNT_SELECT } },
    });
    if (!row) return null;
    return {
      principal: { userId: row.userId, tokenId: row.id, includeNotes: row.includeNotes },
      account: row.user,
    };
  }
}
