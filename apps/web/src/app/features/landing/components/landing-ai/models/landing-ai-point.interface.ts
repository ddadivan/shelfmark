import type { IconName } from '@shelfmark/ui';

/** One line of the AI block's list: its icon and the key under `landing.ai.points`. */
export interface LandingAiPoint {
  readonly id: string;
  readonly icon: IconName;
}
