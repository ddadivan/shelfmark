import type { IconName } from '@shelfmark/ui';

/** One point of the AI intro: its icon and the base of its `.title` / `.text` keys. */
export interface AiIntroPoint {
  readonly icon: IconName;
  readonly key: string;
}
