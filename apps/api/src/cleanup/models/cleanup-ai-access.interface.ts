import type { AiTier } from '@shelfmark/contracts';

/** Whether the AI checks may run for the user now, and with which tier. */
export interface CleanupAiAccess {
  /** AI on, the AI pack and an AI clean-up run left this month. */
  available: boolean;
  tier: AiTier;
  /** Search by meaning is `ready` (near-duplicates need the stored vectors). */
  vectorsReady: boolean;
}
