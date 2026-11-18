import { Injectable } from '@nestjs/common';
import { MCP_LIMIT } from '@shelfmark/contracts';
import { isRecord } from '../../common/util/is-record';
import { PRISMA_ERROR_CODE } from '../../common/prisma/prisma-error-code.const';
import { PrismaService } from '../../prisma/prisma.service';
import { MCP_USAGE_OUTCOME } from '../models/mcp-usage-outcome.const';
import type { McpUsageReservation } from '../models/mcp-usage-reservation.type';
import { MCP_USAGE_RETENTION_DAYS } from '../models/mcp-usage-retention-days.const';
import { usageDay, usageDayBefore } from './usage-day';

/** Postgres `foreign_key_violation`, as a raw query reports it (Prisma `P2010`). */
const PG_FOREIGN_KEY_VIOLATION = '23503';

/** Whether `error` is a foreign key violation: Prisma's `P2003`, or the code a raw query carries. */
function isForeignKeyViolation(error: unknown): boolean {
  if (!isRecord(error)) return false;
  if (error['code'] === PRISMA_ERROR_CODE.ForeignKeyViolation) return true;
  const adapter = isRecord(error['meta']) ? error['meta']['driverAdapterError'] : undefined;
  const cause = isRecord(adapter) ? adapter['cause'] : undefined;
  return isRecord(cause) && cause['originalCode'] === PG_FOREIGN_KEY_VIOLATION;
}

/**
 * Daily call counts of personal tokens (counts only, never arguments or results). `reserve` is one
 * parameterised statement: it counts the call unless the token reached `CallsPerTokenPerDay` today,
 * deletes the token's rows older than `MCP_USAGE_RETENTION_DAYS` on the first call of a day, and
 * writes `last_used_at` at most once a minute (plain SQL, data-modifying CTEs run atomically). The
 * insert selects the token row, so a token revoked after the guard resolved it counts nothing and is
 * `Revoked` (a revoke committing during the statement is the same, through its foreign key error).
 */
@Injectable()
export class McpUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async reserve(tokenId: string, now = new Date()): Promise<McpUsageReservation> {
    const day = usageDay(now);
    const cutoff = usageDayBefore(now, MCP_USAGE_RETENTION_DAYS);
    let rows: { calls: number | null; live: boolean }[];
    try {
      rows = await this.prisma.$queryRaw<{ calls: number | null; live: boolean }[]>`
        WITH token AS (
          SELECT id FROM mcp_tokens WHERE id = ${tokenId}::uuid
        ),
        reserved AS (
          INSERT INTO mcp_token_usage (token_id, day, calls)
          SELECT id, ${day}::date, 1 FROM token
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
        SELECT (SELECT calls FROM reserved) AS calls, EXISTS (SELECT 1 FROM token) AS live`;
    } catch (error) {
      if (isForeignKeyViolation(error)) return { kind: MCP_USAGE_OUTCOME.Revoked };
      throw error;
    }
    const [row] = rows;
    if (!row.live) return { kind: MCP_USAGE_OUTCOME.Revoked };
    if (row.calls === null) return { kind: MCP_USAGE_OUTCOME.Capped };
    return { kind: MCP_USAGE_OUTCOME.Counted, calls: row.calls };
  }
}
