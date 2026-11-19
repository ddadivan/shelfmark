import { IMPORT_AI_STATE, type ImportAiState } from '@shelfmark/contracts';
import type { AiDbClient } from '../models/ai-db-client.type';

/**
 * Ends the AI pass of an import (ADR 0056 decision 9) inside the transaction that holds the user's
 * `ai_settings` row lock: a `running` pass gets `state`, and the backfill units the grouping took
 * that no chunk used are given back (`backfill_used` goes down, `imports.ai_prepaid` to 0). Anything
 * but a running pass is left alone, so calling it twice refunds once. Answers the units given back.
 */
export async function closeImportPass(
  tx: AiDbClient,
  userId: string,
  importId: string,
  state: ImportAiState,
): Promise<number> {
  const rows = await tx.$queryRaw<{ prepaid: number }[]>`
    WITH old AS (
      SELECT ai_prepaid FROM imports
      WHERE id = ${importId}::uuid AND user_id = ${userId}::uuid
        AND ai_state = ${IMPORT_AI_STATE.Running}
      FOR UPDATE
    ), upd AS (
      UPDATE imports SET ai_state = ${state}, ai_prepaid = 0
      WHERE id = ${importId}::uuid AND user_id = ${userId}::uuid
        AND ai_state = ${IMPORT_AI_STATE.Running}
      RETURNING 1
    )
    SELECT ai_prepaid AS prepaid FROM old`;
  const prepaid = rows[0]?.prepaid ?? 0;
  if (prepaid > 0) {
    await tx.$executeRaw`
      UPDATE ai_settings SET backfill_used = GREATEST(backfill_used - ${prepaid}::int, 0)
      WHERE user_id = ${userId}::uuid`;
  }
  return prepaid;
}

/**
 * Detaches a backfill run scoped to an import (`backfill_import_id`) when the run is stopped (stop,
 * AI turned off, AI data deleted): the import's pass is `skipped` and its unused units go back. Takes
 * the settings row lock; does nothing for an unscoped run.
 */
export async function stopScopedRun(tx: AiDbClient, userId: string): Promise<void> {
  const rows = await tx.$queryRaw<{ importId: string | null }[]>`
    SELECT backfill_import_id AS "importId" FROM ai_settings
    WHERE user_id = ${userId}::uuid FOR UPDATE`;
  const importId = rows[0]?.importId ?? null;
  if (importId === null) return;
  await tx.$executeRaw`
    UPDATE ai_settings SET backfill_import_id = NULL WHERE user_id = ${userId}::uuid`;
  await closeImportPass(tx, userId, importId, IMPORT_AI_STATE.Skipped);
}
