import type { KeepReason } from '@shelfmark/contracts';

/** The kept link of a duplicate group and why. */
export interface KeepChoice {
  keepId: string;
  reason: KeepReason;
}
