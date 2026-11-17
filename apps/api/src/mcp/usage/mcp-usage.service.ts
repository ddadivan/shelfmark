import { Injectable } from '@nestjs/common';
import { MCP_LIMIT } from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { MCP_USAGE_RETENTION_DAYS } from '../models/mcp-usage-retention-days.const';
import { usageDay, usageDayBefore } from './usage-day';

/**
 * Daily call counts of personal tokens (counts only, never arguments or results). `reserve` is one
 * parameterised statement: it counts the call unless the token reached `CallsPerTokenPerDay` today,
 * deletes the token's rows older than `MCP_USAGE_RETENTION_DAYS` on the first call of a day, and
 * writes `last_used_at` at most once a minute (plain SQL, data-modifying CTEs run atomically).
 */
@Injectable()
export class McpUsageService {
  constructor(private readonly prisma: PrismaService) {}

  /** The count after this call, or `null` when today's cap is reached (nothing is written then). */
  async reserve(tokenId: string, now = new Date()): Promise<number | null> {
    const day = usageDay(now);
    const cutoff = usageDayBefore(now, MCP_USAGE_RETENTION_DAYS);
    const rows = await this.prisma.$queryRaw<{ calls: number }[]>`
      WITH reserved AS (
        INSERT INTO mcp_token_usage (token_id, day, calls) VALUES (${tokenId}::uuid, ${day}::date, 1)
        ON CONFLICT (token_id, day) DO UPDATE SET calls = mcp_token_usage.calls + 1
        WHERE mcp_token_usage.calls < ${MCP_LIMIT.CallsPerTokenPerDay}
        RETURNING calls
      ),
      cleanup AS (
        DELETE FROM mcp_token_usage
        WHERE token_id = ${tokenId}::uuid AND day < ${cutoff}::date
          AND EXISTS (SELECT 1 FROM reserved WHERE calls = 1)
      ),
      touched AS (
        UPDATE mcp_tokens SET last_used_at = ${now}::timestamptz
        WHERE id = ${tokenId}::uuid AND EXISTS (SELECT 1 FROM reserved)
          AND (last_used_at IS NULL OR last_used_at <= ${now}::timestamptz - interval '1 minute')
      )
      SELECT calls FROM reserved`;
    return rows.length > 0 ? rows[0].calls : null;
  }
}
