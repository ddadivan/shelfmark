import type { CleanupState } from '@shelfmark/contracts';

/**
 * What the AI tick and sweep call for the library clean-up (AI-5). `CleanupModule` provides it under
 * `CLEANUP_TICK_HOOK`; `AiModule` resolves it lazily (never imports `CleanupModule`, no cycle).
 */
export interface CleanupTickHook {
  /** Answers the user's report state and continues a running report after the response. */
  tick(userId: string): Promise<CleanupState>;
  /** Fails stalled runs and continues abandoned ones (every user's rows) within the deadline. */
  sweep(deadline: number): Promise<void>;
}
