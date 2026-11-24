import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MCP_ERROR_MESSAGE,
  MCP_LIMIT,
  MCP_TOKEN_ACCESS,
  type CreateMcpTokenRequest,
  type CreateMcpTokenResponse,
  type McpTokensResponse,
} from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { mcpAvailable } from '../mcp-available';
import { MCP_ACCOUNT_SELECT } from '../models/mcp-account-select.const';
import { MCP_TOKEN_LOCK_PREFIX } from '../models/mcp-token-lock-prefix.const';
import { usageDayBefore } from '../usage/usage-day';
import { generateToken } from './generate-token';
import { toMcpTokenSummary } from './to-mcp-token-summary';

const TOKEN_SELECT = {
  id: true,
  name: true,
  last4: true,
  includeNotes: true,
  access: true,
  createdAt: true,
  expiresAt: true,
  lastUsedAt: true,
} as const;
const DAY_MS = 24 * 60 * 60 * 1000;
/** "Calls this week": today and the 6 UTC days before it. */
const WEEK_DAYS_BEFORE_TODAY = 6;

/**
 * Personal MCP tokens of the session user (#395, ADR 0054): list, create (the secret is answered
 * once), revoke. Every query filters by that user; a foreign or missing token is 404. Create runs
 * under the per-user `mcp-tokens:` advisory lock so the cap cannot be raced. Secrets and digests are
 * never logged or answered by the list.
 */
@Injectable()
export class McpTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, now = new Date()): Promise<McpTokensResponse> {
    const [account, rows, usage] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: MCP_ACCOUNT_SELECT }),
      this.prisma.mcpToken.findMany({
        where: { userId },
        select: TOKEN_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.mcpTokenUsage.groupBy({
        by: ['tokenId'],
        where: {
          token: { userId },
          day: { gte: new Date(usageDayBefore(now, WEEK_DAYS_BEFORE_TODAY)) },
        },
        _sum: { calls: true },
        orderBy: { tokenId: 'asc' },
      }),
    ]);
    if (!account) throw new NotFoundException();
    const calls = new Map(usage.map((group) => [group.tokenId, group._sum.calls ?? 0]));
    return {
      available: mcpAvailable(account),
      items: rows.map((row) => toMcpTokenSummary(row, calls.get(row.id) ?? 0)),
    };
  }

  async create(
    userId: string,
    request: CreateMcpTokenRequest,
    now = new Date(),
  ): Promise<CreateMcpTokenResponse> {
    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      select: MCP_ACCOUNT_SELECT,
    });
    if (!account) throw new NotFoundException();
    if (account.isDemo) throw new ForbiddenException(MCP_ERROR_MESSAGE.DemoUser);
    if (!mcpAvailable(account)) throw new ForbiddenException(MCP_ERROR_MESSAGE.NotAvailable);

    const generated = generateToken();
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${MCP_TOKEN_LOCK_PREFIX + userId}, 0))`;
      const total = await tx.mcpToken.count({ where: { userId } });
      if (total >= MCP_LIMIT.TokensPerUserMax) {
        throw new ConflictException(MCP_ERROR_MESSAGE.LimitReached);
      }
      // A digest collision of two 256-bit secrets is not a practical case: no retry.
      return tx.mcpToken.create({
        data: {
          userId,
          name: request.name,
          includeNotes: request.includeNotes,
          access: request.access ?? MCP_TOKEN_ACCESS.Read,
          expiresAt:
            request.expiresInDays == null
              ? null
              : new Date(now.getTime() + request.expiresInDays * DAY_MS),
          tokenHash: generated.hash,
          last4: generated.last4,
        },
        select: TOKEN_SELECT,
      });
    });
    return { token: toMcpTokenSummary(row, 0), secret: generated.secret };
  }

  /** Deletes the token (its usage cascades): the next call with it is a 401. */
  async revoke(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.mcpToken.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException(MCP_ERROR_MESSAGE.NotFound);
  }
}
